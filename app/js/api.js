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
   * Chama uma Custom API do Zoho Creator com payload (POST com body)
   * @param {Object} endpointConfig - Configuração do endpoint (NAME, PUBLIC_KEY)
   * @param {Object} payload - Dados a serem enviados no body da requisição
   * @returns {Promise} Promise com o resultado
   */
  function invokeAPIWithPayload(endpointConfig, payload) {
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

      // Config para API com payload (POST com body)
      var config = {
        api_name: apiName,
        http_method: "POST",
        public_key: publicKey,
        payload: payload,
      };

      // LOG: Exibe o erro como string JSON, não como [object Object]
      var logError = function (err) {
        try {
          return JSON.stringify(err);
        } catch (e) {
          return err.toString();
        }
      };

      WidgetUI.log(
        "API Call (POST): " +
          apiName +
          " | Payload: " +
          JSON.stringify(payload).substring(0, 200) +
          "..."
      );

      ZOHO.CREATOR.DATA.invokeCustomApi(config)
        .then(function (response) {
          WidgetUI.log("API Response recebida (POST)", "success");
          var data = extractData(response);
          resolve(data);
        })
        .catch(function (error) {
          WidgetUI.log("SDK Error (POST): " + logError(error), "error");
          reject(error);
        });
    });
  }

  /**
   * Busca lista de clientes
   * @param {string} [filtro] - Filtro de busca
   * @param {string} [type] - Tipo de busca
   * @param {string} [email] - Email do usuário logado
   * @returns {Promise<Array>} Lista de clientes normalizados
   */
  function buscarClientes(filtro, type, email) {
    filtro = filtro || "";
    type = type || "";
    email = email || "";

    return invokeAPI(WidgetConfig.API.ENDPOINTS.CONSULTA_CLIENTE, "GET", {
      filter: filtro,
      type: type,
      email: email,
    }).then(function (data) {
      // Normaliza a lista de clientes
      var lista = [];

      if (Array.isArray(data)) {
        lista = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        lista = data.data;
      }

      // Mapeia para formato padronizado
      // IMPORTANTE: Agora usa idCRM como identificador principal (ID vai ser obtido nos detalhes)
      return lista.map(function (c) {
        return {
          ID: String(c.idCRM), // Usa idCRM da busca como identificador
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

      // Log de debug para ver a estrutura
      if (lista.length > 0) {
        WidgetUI.log("Exemplo de condição (raw): " + JSON.stringify(lista[0]));
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
   * Busca detalhes completos de um cliente específico
   * @param {string} idCliente - idCRM do cliente (obtido da busca inicial)
   * @returns {Promise<Object>} Detalhes do cliente normalizados (inclui campo 'id' que é o ID real)
   */
  function buscarDetalheCliente(idCliente) {
    return invokeAPI(WidgetConfig.API.ENDPOINTS.DETALHE_CLIENTE, "GET", {
      idCliente: idCliente,
    }).then(function (data) {
      // A API retorna { success: true, message: "...", data: {...} }
      var detalhe = data.data || data;

      // Normaliza e retorna os dados
      return {
        // ID principal do cliente (diferente do idCRM usado na busca)
        id: String(detalhe.id || ""),

        // Dados do cliente atualizados dos detalhes
        clienteRazaoSocial: detalhe.clienteRazaoSocial || "",
        clienteNomeFantasia: detalhe.clienteNomeFantasia || "",

        // Códigos Protheus
        protheusCodigo: detalhe.protheusCodigo || "",
        protheusLoja: detalhe.protheusLoja || "",

        // Dados MB
        clienteCodigoMB: detalhe.clienteCodigoMB || "",
        clienteCanal: detalhe.clienteCanal || "",

        // Endereço
        endereco: detalhe.clienteEndereco || "",
        bairro: detalhe.clienteBairro || "",
        municipio: detalhe.clienteMunicipio || "",
        estado: detalhe.clienteEstado || "",
        cep: detalhe.clienteCep || "",
        complemento: detalhe.clienteComplemento || "",

        // Janela de Entrega
        janelaEntrega: detalhe.janelaEntrega || [],
        horaInicio1: (detalhe.horaInicio1 || "").trim(),
        horaFim1: (detalhe.horaFim1 || "").trim(),
        horaInicio2: (detalhe.horaInicio2 || "").trim(),
        horaFim2: (detalhe.horaFim2 || "").trim(),

        // Condição de Pagamento
        pagamentoCondicaoID: String(detalhe.pagamentoCondicaoID || ""),
        pagamentoCondicaoCodigo: detalhe.pagamentoCondicaoCodigo || "",

        // Vendedor
        vendedorID: String(detalhe.vendedorID || ""),
        vendedorNome: detalhe.vendedorNome || "",

        // Frete
        tipoFrete: detalhe.clienteTipoFrete || "",
        transportadoraID: String(detalhe.transportadoraID || ""),
        transportadoraCodigo: detalhe.transportadoraCodigo || "",
        transportadoraRazao: detalhe.transportadoraRazao || "",

        // Outros
        bandeiraDescricao: detalhe.bandeiraDescricao || "",
        municipioLoteMinimo: detalhe.municipioLoteMinimo || 0,

        // Lista de Feriados/Datas Bloqueadas
        listaFeriados: detalhe.listaFeriados || [],
      };
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

  /**
   * Busca lista de subtítulos (grupos de produtos)
   * @returns {Promise<Array>} Lista de subtítulos normalizados
   */
  function buscarSubtitulos() {
    return invokeAPI(
      WidgetConfig.API.ENDPOINTS.CONSULTA_SUBTITULOS,
      "GET",
      {}
    ).then(function (data) {
      var lista = [];

      if (data && data.data && Array.isArray(data.data)) {
        lista = data.data;
      } else if (Array.isArray(data)) {
        lista = data;
      }

      // Mapeia para formato padronizado
      return lista.map(function (item) {
        return {
          ID: String(item.ID),
          Nome: item.subDisplay || "Sem Nome",
        };
      });
    });
  }

  /**
   * Busca produtos e preços por subtítulo (grupo) e cliente
   * @param {string} subtituloId - ID do subtítulo/grupo
   * @param {string} clienteId - ID do cliente
   * @returns {Promise<Array>} Lista de produtos com preços
   */
  function buscarProdutosPorSubtitulo(subtituloId, clienteId) {
    var endpoint = WidgetConfig.API.ENDPOINTS.CONSULTA_PRECOS;
    var params = {
      subTitulo: subtituloId,
      cliente: clienteId,
    };

    return invokeAPI(endpoint, "GET", params)
      .then(function (data) {
        var lista = [];

        if (data && data.success && data.data && Array.isArray(data.data)) {
          lista = data.data;
        } else if (Array.isArray(data)) {
          lista = data;
        }

        // Mapeia para formato padronizado
        // Valor total = valorUnitario + stUnitario + ipiUnitario
        return lista.map(function (item) {
          var valorUnitario = parseFloat(item.valorUnitario) || 0;
          var stUnitario = parseFloat(item.stUnitario) || 0;
          var ipiUnitario = parseFloat(item.ipiUnitario) || 0;
          var precoTotal = valorUnitario + stUnitario + ipiUnitario;

          return {
            ID: String(item.idProduto),
            Codigo: item.codigoProduto || "",
            Nome: item.descricaoProduto || "Sem Nome",
            Preco: precoTotal,
            PrecoBase: valorUnitario,
            ST: stUnitario,
            IPI: ipiUnitario,
            Unidade: item.unidade || "UN",
            Disponivel: item.success === true,
            imagemProduto: item.imagemProduto || "",
          };
        });
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao buscar produtos: " + err, "error");
        return [];
      });
  }

  /**
   * Consulta impostos com desconto aplicado
   * @param {Object} dadosRecalculo - Dados para recálculo de impostos
   * @param {string} dadosRecalculo.clienteId - ID do cliente
   * @param {Array} dadosRecalculo.itens - Lista de itens com desconto
   * @returns {Promise<Array>} Lista de produtos com impostos recalculados
   */
  function consultarImpostos(dadosRecalculo) {
    // Monta o payload no formato esperado pela API
    var payload = {
      data: dadosRecalculo,
    };

    return invokeAPIWithPayload(
      WidgetConfig.API.ENDPOINTS.CONSULTA_IMPOSTOS,
      payload
    ).then(function (response) {
      // Extrai a lista de dados da resposta
      var lista = [];

      if (response && response.data && Array.isArray(response.data)) {
        lista = response.data;
      } else if (Array.isArray(response)) {
        lista = response;
      }

      // Log da resposta
      WidgetUI.log("Impostos recebidos: " + lista.length + " itens", "success");

      // Retorna os dados normalizados
      return lista.map(function (item) {
        return {
          produtoId: item.idProduto || "",
          codigo: item.codigoProduto || "",
          nome: item.descricaoProduto || "",
          valorUnitario: parseFloat(item.valorUnitario) || 0,
          stUnitario: parseFloat(item.stUnitario) || 0,
          ipiUnitario: parseFloat(item.ipiUnitario) || 0,
          success: item.success === true,
        };
      });
    });
  }

  // API Pública do Módulo
  return {
    isSDKAvailable: isSDKAvailable,
    invokeAPI: invokeAPI,
    invokeAPIWithPayload: invokeAPIWithPayload,
    buscarClientes: buscarClientes,
    buscarProdutos: buscarProdutos,
    buscarCondicoesPagamento: buscarCondicoesPagamento,
    buscarDetalheCliente: buscarDetalheCliente,
    buscarSubtitulos: buscarSubtitulos,
    buscarProdutosPorSubtitulo: buscarProdutosPorSubtitulo,
    criarPedido: criarPedido,
    consultarImpostos: consultarImpostos,
  };
})();
