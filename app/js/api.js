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
   * @param {string} apiName - Link name da API
   * @param {string} method - HTTP method (GET, POST, etc)
   * @param {Object} params - Parâmetros da API
   * @returns {Promise} Promise com o resultado
   */
  function invokeAPI(apiName, method, params) {
    return new Promise(function (resolve, reject) {
      if (!isSDKAvailable()) {
        reject(new Error("SDK do Zoho não está disponível"));
        return;
      }

      // Monta a query string manualmente (evita bug do SDK com objetos)
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
        public_key: WidgetConfig.API.PUBLIC_KEY,
        query_params: queryString,
      };

      WidgetUI.log("API Call: " + apiName + " | Params: " + queryString);

      ZOHO.CREATOR.DATA.invokeCustomApi(config)
        .then(function (response) {
          WidgetUI.log("API Response recebida", "success");

          // Extrai dados do response (tratamento robusto)
          var data = extractData(response);
          resolve(data);
        })
        .catch(function (error) {
          WidgetUI.log("API Error: " + JSON.stringify(error), "error");
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
    criarPedido: criarPedido,
  };
})();
