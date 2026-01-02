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
   * @param {string} idCliente - ID do cliente no Zoho
   * @returns {Promise<Object>} Detalhes do cliente normalizados
   */
  function buscarDetalheCliente(idCliente) {
    return invokeAPI(WidgetConfig.API.ENDPOINTS.DETALHE_CLIENTE, "GET", {
      idCliente: idCliente,
    }).then(function (data) {
      // A API retorna { success: true, message: "...", data: {...} }
      var detalhe = data.data || data;

      // Normaliza e retorna os dados
      return {
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
   * Busca produtos por subtítulo (grupo) - MOCK por enquanto
   * @param {string} subtituloId - ID do subtítulo/grupo
   * @returns {Promise<Array>} Lista de produtos
   */
  function buscarProdutosPorSubtitulo(subtituloId) {
    // MOCK: Simula produtos para cada grupo
    var produtosMock = {
      // BOLO
      "4215861000000977655": [
        {
          ID: "PROD001",
          Codigo: "BOL001",
          Nome: "Bolo de Chocolate 1kg",
          Preco: 45.9,
          Unidade: "UN",
        },
        {
          ID: "PROD002",
          Codigo: "BOL002",
          Nome: "Bolo de Cenoura 1kg",
          Preco: 42.5,
          Unidade: "UN",
        },
        {
          ID: "PROD003",
          Codigo: "BOL003",
          Nome: "Bolo de Laranja 1kg",
          Preco: 40.0,
          Unidade: "UN",
        },
        {
          ID: "PROD004",
          Codigo: "BOL004",
          Nome: "Bolo Red Velvet 1kg",
          Preco: 55.0,
          Unidade: "UN",
        },
      ],
      // BROWNIE
      "4215861000000977661": [
        {
          ID: "PROD010",
          Codigo: "BRW001",
          Nome: "Brownie Tradicional",
          Preco: 8.9,
          Unidade: "UN",
        },
        {
          ID: "PROD011",
          Codigo: "BRW002",
          Nome: "Brownie com Nozes",
          Preco: 10.5,
          Unidade: "UN",
        },
        {
          ID: "PROD012",
          Codigo: "BRW003",
          Nome: "Brownie Recheado Doce de Leite",
          Preco: 12.0,
          Unidade: "UN",
        },
      ],
      // CROISSANT
      "4215861000000977663": [
        {
          ID: "PROD020",
          Codigo: "CRO001",
          Nome: "Croissant Manteiga",
          Preco: 6.5,
          Unidade: "UN",
        },
        {
          ID: "PROD021",
          Codigo: "CRO002",
          Nome: "Croissant Chocolate",
          Preco: 8.0,
          Unidade: "UN",
        },
        {
          ID: "PROD022",
          Codigo: "CRO003",
          Nome: "Croissant Presunto e Queijo",
          Preco: 9.5,
          Unidade: "UN",
        },
      ],
      // SALGADO
      "4215861000000977667": [
        {
          ID: "PROD030",
          Codigo: "SAL001",
          Nome: "Coxinha de Frango",
          Preco: 5.5,
          Unidade: "UN",
        },
        {
          ID: "PROD031",
          Codigo: "SAL002",
          Nome: "Empada de Palmito",
          Preco: 6.0,
          Unidade: "UN",
        },
        {
          ID: "PROD032",
          Codigo: "SAL003",
          Nome: "Quibe Frito",
          Preco: 5.0,
          Unidade: "UN",
        },
        {
          ID: "PROD033",
          Codigo: "SAL004",
          Nome: "Pastel de Carne",
          Preco: 7.5,
          Unidade: "UN",
        },
        {
          ID: "PROD034",
          Codigo: "SAL005",
          Nome: "Esfiha de Carne",
          Preco: 4.5,
          Unidade: "UN",
        },
      ],
      // MINI
      "4215861000000977669": [
        {
          ID: "PROD040",
          Codigo: "MIN001",
          Nome: "Mini Croissant (10un)",
          Preco: 25.0,
          Unidade: "PCT",
        },
        {
          ID: "PROD041",
          Codigo: "MIN002",
          Nome: "Mini Churros (20un)",
          Preco: 35.0,
          Unidade: "PCT",
        },
        {
          ID: "PROD042",
          Codigo: "MIN003",
          Nome: "Mini Quiche (10un)",
          Preco: 30.0,
          Unidade: "PCT",
        },
      ],
    };

    return new Promise(function (resolve) {
      // Simula delay de rede
      setTimeout(function () {
        var produtos = produtosMock[subtituloId] || [
          {
            ID: "PROD999",
            Codigo: "GEN001",
            Nome: "Produto Genérico",
            Preco: 10.0,
            Unidade: "UN",
          },
          {
            ID: "PROD998",
            Codigo: "GEN002",
            Nome: "Produto Genérico 2",
            Preco: 15.0,
            Unidade: "UN",
          },
        ];
        resolve(produtos);
      }, 500);
    });
  }

  // API Pública do Módulo
  return {
    isSDKAvailable: isSDKAvailable,
    invokeAPI: invokeAPI,
    buscarClientes: buscarClientes,
    buscarProdutos: buscarProdutos,
    buscarCondicoesPagamento: buscarCondicoesPagamento,
    buscarDetalheCliente: buscarDetalheCliente,
    buscarSubtitulos: buscarSubtitulos,
    buscarProdutosPorSubtitulo: buscarProdutosPorSubtitulo,
    criarPedido: criarPedido,
  };
})();
