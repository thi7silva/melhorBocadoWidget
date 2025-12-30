/**
 * Widget de Pedidos - Funções de API
 * Arquivo: app/js/api.js
 *
 * Funções para comunicação com as Custom APIs do Zoho Creator.
 */

var WidgetAPI = (function () {
  "use strict";

  /**
   * Verifica se o SDK do Zoho está disponível
   * @returns {boolean}
   */
  function isSDKAvailable() {
    return (
      typeof ZOHO !== "undefined" &&
      ZOHO.CREATOR &&
      ZOHO.CREATOR.DATA &&
      typeof ZOHO.CREATOR.DATA.invokeCustomApi === "function"
    );
  }

  /**
   * Chama uma Custom API do Zoho Creator
   * @param {Object} endpointConfig - Configuração do endpoint (NAME, PUBLIC_KEY)
   * @param {string} method - HTTP method (GET, POST, etc)
   * @param {Object} params - Parâmetros da API
   * @returns {Promise} Promise com o resultado
   */
  function invokeAPI(endpointConfig, method, params) {
    return new Promise(function (resolve, reject) {
      if (!isSDKAvailable()) {
        reject(new Error("SDK do Zoho não está disponível"));
        return;
      }

      var apiName = endpointConfig.NAME;
      var publicKey = endpointConfig.PUBLIC_KEY;

      if (!apiName || !publicKey) {
        reject(
          new Error("Configuração de API inválida (Nome ou Key faltando)")
        );
        return;
      }

      // Monta a query string manualmente
      var queryString = "";
      if (params && typeof params === "object") {
        var pairs = [];
        for (var key in params) {
          if (params.hasOwnProperty(key)) {
            pairs.push(
              encodeURIComponent(key) + "=" + encodeURIComponent(params[key])
            );
          }
        }
        queryString = pairs.join("&");
      } else if (typeof params === "string") {
        queryString = params;
      }

      var config = {
        api_name: apiName,
        http_method: method,
        public_key: publicKey,
        query_params: queryString || null,
      };

      if (!queryString) {
        // Remove a propriedade query_params se queryString estiver vazia
        delete config.query_params;
      }

      // LOG: Exibe o erro como string JSON, não como [object Object]
      var logError = function (err) {
        try {
          return JSON.stringify(err);
        } catch (e) {
          return err.toString();
        }
      };

      WidgetUI.log(
        "API Call (SDK): " + apiName + " | Config: " + JSON.stringify(config)
      );

      ZOHO.CREATOR.DATA.invokeCustomApi(config)
        .then(function (response) {
          WidgetUI.log("API Response recebida (SDK)", "success");
          var data = extractData(response);
          resolve(data);
        })
        .catch(function (error) {
          WidgetUI.log("SDK Error: " + logError(error), "error");
          reject(error);
        });
    });
  }

  /**
   * Extrai os dados de uma resposta da API (tratamento robusto)
   * @param {*} response - Resposta bruta
   * @returns {*} Dados extraídos
   */
  function extractData(response) {
    var data = response.data || response.result || response;

    // Parse se vier como string
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (e) {
        // Mantém como string se não for JSON válido
      }
    }

    return data;
  }

  /**
   * Busca lista de clientes
   * @param {string} [filtro] - Filtro de busca
   * @returns {Promise<Array>} Lista de clientes normalizados
   */
  function buscarClientes(filtro) {
    filtro = filtro || "";

    return invokeAPI(WidgetConfig.API.ENDPOINTS.CONSULTA_CLIENTE, "GET", {
      filter: filtro,
    }).then(function (data) {
      // Normaliza a lista de clientes
      var lista = [];

      if (Array.isArray(data)) {
        lista = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        lista = data.data;
      }

      // Mapeia para formato padronizado
      // IMPORTANTE: Converte ID para STRING para evitar perda de precisão com números grandes
      return lista.map(function (c) {
        return {
          ID: String(c.ID),
          Nome: c.nomeFantasia || c.razaoSocial || "Sem Nome",
          RazaoSocial: c.razaoSocial || "-",
          NomeFantasia: c.nomeFantasia || "-",
          CPF_CNPJ: c.cnpjCpf || "",
        };
      });
    });
  }

  /**
   * Busca lista de produtos
   * @param {string} [filtro] - Filtro de busca
   * @returns {Promise<Array>} Lista de produtos normalizados
   */
  function buscarProdutos(filtro) {
    filtro = filtro || "";

    return invokeAPI(WidgetConfig.API.ENDPOINTS.CONSULTA_PRODUTO, "GET", {
      filter: filtro,
    }).then(function (data) {
      var lista = [];

      if (Array.isArray(data)) {
        lista = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        lista = data.data;
      }

      return lista.map(function (p) {
        return {
          ID: p.ID || p.codigo,
          Nome: p.descricao || p.nome || "Produto",
          Preco: p.preco || 0,
        };
      });
    });
  }

  /**
   * Busca lista de condições de pagamento
   * @returns {Promise<Array>} Lista de condições normalizadas
   */
  function buscarCondicoesPagamento() {
    return invokeAPI(
      WidgetConfig.API.ENDPOINTS.CONSULTA_CONDICAO_PAGAMENTO,
      "GET",
      {}
    ).then(function (data) {
      var lista = [];

      // Verifica a estrutura do retorno (success: true, data: [...])
      if (data && data.data && Array.isArray(data.data)) {
        lista = data.data;
      } else if (Array.isArray(data)) {
        lista = data;
      }

      // Mapeia para formato padronizado
      return lista.map(function (item) {
        return {
          ID: String(item.ID), // Importante converter para string
          Codigo: item.condicaoCodigo,
          Descricao: item.condicaoDescricao,
          Display: item.condicaoDisplay || item.condicaoDescricao, // Fallback se não tiver display
        };
      });
    });
  }

  /**
   * Cria um novo pedido
   * @param {Object} pedido - Dados do pedido
   * @returns {Promise} Resultado da criação
   */
  function criarPedido(pedido) {
    return invokeAPI(WidgetConfig.API.ENDPOINTS.CRIAR_PEDIDO, "POST", pedido);
  }

  // API Pública do Módulo
  return {
    isSDKAvailable: isSDKAvailable,
    invokeAPI: invokeAPI,
    buscarClientes: buscarClientes,
    buscarProdutos: buscarProdutos,
    buscarCondicoesPagamento: buscarCondicoesPagamento,
    criarPedido: criarPedido,
  };
})();
