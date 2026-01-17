/**
 * Widget de Pedidos - Aplicação Principal
 * Core: Estado global, inicialização e orquestração entre módulos
 */

var WidgetApp = (function () {
  "use strict";

  // ============================================
  // ESTADO GLOBAL
  // ============================================

  var state = {
    initialized: false,
    online: false,
    loginUser: null,
    etapaAtual: "cliente", // "cliente", "listagem" ou "pedido"
    clientes: [],
    clienteSelecionado: null,
    clienteDetalhe: null,
    clienteIdReal: null,
    itensPedido: [],
    pedidosCliente: [],
    // Modo de operação
    modo: null, // null, "editar", "clonar"
    pedidoId: null,
    pedidoClonadoId: null,
    pedidoVisualizando: null,
  };

  // ============================================
  // INICIALIZAÇÃO
  // ============================================

  /**
   * Inicializa o Widget
   */
  function init() {
    WidgetUI.log("Iniciando Widget Melhor Bocado...");
    WidgetUI.init();

    if (typeof ZOHO === "undefined") {
      WidgetUI.log("SDK do Zoho não encontrado", "error");
      WidgetUI.setStatus("Erro: SDK não carregou.", "error");
      iniciarModoOffline();
      return;
    }

    conectarZoho();
  }

  /**
   * Estabelece conexão com o Zoho Creator
   */
  function conectarZoho() {
    WidgetUI.log("Conectando ao Zoho Creator...");
    WidgetUI.setStatus("Conectando ao sistema...", "loading");

    if (
      ZOHO.CREATOR &&
      ZOHO.CREATOR.UTIL &&
      ZOHO.CREATOR.UTIL.getWidgetParams
    ) {
      ZOHO.CREATOR.UTIL.getWidgetParams()
        .then(function () {
          WidgetUI.log("Conexão estabelecida!", "success");
          state.online = true;
          iniciarModoOnline();
        })
        .catch(function (err) {
          WidgetUI.log("getWidgetParams falhou: " + err);
          tentarInitExplicito();
        });
    } else {
      tentarInitExplicito();
    }
  }

  /**
   * Tenta inicialização explícita (fallback)
   */
  function tentarInitExplicito() {
    WidgetUI.log("Tentando ZOHO.CREATOR.init()...");

    if (ZOHO.CREATOR && ZOHO.CREATOR.init) {
      ZOHO.CREATOR.init()
        .then(function () {
          WidgetUI.log("Init OK!", "success");
          state.online = true;
          iniciarModoOnline();
        })
        .catch(function (err) {
          WidgetUI.log("Init falhou: " + err, "error");
          iniciarModoOffline();
        });
    } else {
      WidgetUI.log("Método init não disponível");
      iniciarModoOffline();
    }
  }

  /**
   * Modo online - conectado ao Zoho
   */
  function iniciarModoOnline() {
    WidgetUI.hideStatus();

    if (ZOHO.CREATOR && ZOHO.CREATOR.UTIL) {
      // Obtém dados do usuário logado
      if (ZOHO.CREATOR.UTIL.getInitParams) {
        ZOHO.CREATOR.UTIL.getInitParams()
          .then(function (response) {
            var loginUser = response.loginUser;
            if (loginUser) {
              WidgetUI.log("Login User: " + loginUser);
              state.loginUser = loginUser;

              // Chama API de usuário logado
              var endpoint = WidgetConfig.API.ENDPOINTS.USUARIO_LOGADO;
              var config = {
                api_name: endpoint.NAME,
                http_method: "GET",
                public_key: endpoint.PUBLIC_KEY,
                query_params: "emailPortal=" + encodeURIComponent(loginUser),
              };

              ZOHO.CREATOR.DATA.invokeCustomApi(config)
                .then(function (apiResponse) {
                  WidgetUI.log(
                    "usuarioLogado: " + JSON.stringify(apiResponse),
                    "success",
                  );
                })
                .catch(function (apiErr) {
                  WidgetUI.log(
                    "Erro usuarioLogado: " + JSON.stringify(apiErr),
                    "error",
                  );
                });
            }
          })
          .catch(function (err) {
            WidgetUI.log("Erro getInitParams: " + err, "error");
          });
      }

      // Verifica modo de edição por query params
      if (ZOHO.CREATOR.UTIL.getQueryParams) {
        ZOHO.CREATOR.UTIL.getQueryParams()
          .then(function (response) {
            var idPedido =
              response.idPedido || response.idpedido || response.pedidoId;
            if (idPedido) {
              WidgetUI.log(
                "Modo Edição Detectado. Pedido: " + idPedido,
                "success",
              );
              WidgetPedido.editarPedido(idPedido);
            }
          })
          .catch(function (err) {
            WidgetUI.log("Erro getQueryParams: " + err, "error");
          });
      }
    }

    setTimeout(function () {
      WidgetUI.hideStatus();
    }, 3000);
  }

  /**
   * Modo offline - dados mock
   */
  function iniciarModoOffline() {
    WidgetUI.log("Entrando em modo offline...");
    WidgetUI.setStatus("Modo Offline - Usando dados de teste", "loading");
    state.online = false;
  }

  // ============================================
  // GERENCIAMENTO DE ESTADO
  // ============================================

  /**
   * Retorna o estado atual
   * @returns {Object} Estado da aplicação
   */
  function getState() {
    return state;
  }

  /**
   * Atualiza parcialmente o estado
   * @param {Object} updates - Propriedades a atualizar
   */
  function setState(updates) {
    for (var key in updates) {
      if (updates.hasOwnProperty(key)) {
        state[key] = updates[key];
      }
    }
  }

  // ============================================
  // NAVEGAÇÃO
  // ============================================

  /**
   * Volta para seleção de cliente
   */
  function voltarParaCliente() {
    WidgetUI.fecharModal("modal-cancelar");

    state.clienteSelecionado = null;
    state.etapaAtual = "cliente";
    state.itensPedido = [];
    state.modo = null;
    state.pedidoId = null;

    WidgetUI.log("Voltando para seleção de cliente");
    WidgetUI.mostrarEtapaCliente();
  }

  /**
   * Volta para cliente com reload completo
   */
  function voltarParaClienteCompleto() {
    window.location.reload();
  }

  /**
   * Abre modal de confirmação de cancelamento
   */
  function confirmarCancelamento() {
    WidgetUI.abrirModal("modal-cancelar");
  }

  /**
   * Volta para aba anterior
   */
  function voltarAba() {
    var activeTab = WidgetUI.getActiveTab();
    if (activeTab === "produtos") {
      WidgetUI.switchTab("config");
      WidgetUI.log("Voltando para configurações");
    }
  }

  /**
   * Ação do botão principal do footer
   */
  function footerAction() {
    var activeTab = WidgetUI.getActiveTab();

    if (activeTab === "config") {
      WidgetUI.switchTab("produtos");
      WidgetUI.log("Avançando para seleção de produtos");
    } else if (activeTab === "produtos") {
      var carrinho = WidgetProdutos.getCarrinho();
      if (carrinho.length === 0) {
        WidgetUI.log("Carrinho vazio - adicione produtos", "error");
        WidgetUI.setStatus(
          "Adicione produtos ao carrinho antes de continuar",
          "error",
        );
        setTimeout(function () {
          WidgetUI.hideStatus();
        }, 3000);
        return;
      }
      WidgetEntrega.abrirModalEntrega();
    }
  }

  // ============================================
  // API PÚBLICA - DELEGAÇÃO PARA MÓDULOS
  // ============================================

  return {
    // Core
    init: init,
    getState: getState,
    setState: setState,

    // Navegação
    voltarParaCliente: voltarParaCliente,
    voltarParaClienteCompleto: voltarParaClienteCompleto,
    confirmarCancelamento: confirmarCancelamento,
    voltarAba: voltarAba,
    footerAction: footerAction,

    // Clientes - delega para WidgetClientes
    searchClients: function (q, t) {
      return WidgetClientes.searchClients(q, t);
    },
    selecionarCliente: function (c) {
      return WidgetClientes.selecionarCliente(c);
    },
    carregarCondicoesPagamento: function () {
      return WidgetClientes.carregarCondicoesPagamento();
    },

    // Pedidos - delega para WidgetPedido
    iniciarNovoPedido: function () {
      return WidgetPedido.iniciarNovoPedido();
    },
    editarPedido: function (id) {
      return WidgetPedido.editarPedido(id);
    },
    clonarPedido: function (id) {
      return WidgetPedido.clonarPedido(id);
    },
    finalizarPedidoComEntrega: function (d, o, r, i) {
      return WidgetPedido.finalizarPedidoComEntrega(d, o, r, i);
    },
    abrirModalCancelarPedido: function (id, n, v) {
      return WidgetPedido.abrirModalCancelarPedido(id, n, v);
    },
    fecharModalCancelarPedido: function () {
      return WidgetPedido.fecharModalCancelarPedido();
    },
    confirmarCancelamentoPedido: function () {
      return WidgetPedido.confirmarCancelamentoPedido();
    },

    // Visualização - delega para WidgetVisualizacao
    visualizarPedido: function (id) {
      return WidgetVisualizacao.visualizarPedido(id);
    },
    fecharVisualizarPedido: function () {
      return WidgetVisualizacao.fecharVisualizarPedido();
    },
    editarPedidoVisualizacao: function () {
      return WidgetVisualizacao.editarPedidoVisualizacao();
    },
    clonarPedidoVisualizacao: function () {
      return WidgetVisualizacao.clonarPedidoVisualizacao();
    },
    cancelarPedidoVisualizacao: function () {
      return WidgetVisualizacao.cancelarPedidoVisualizacao();
    },

    // Legado - mantido para compatibilidade
    gerarPedido: function () {
      console.log("gerarPedido deprecated - use finalizarPedidoComEntrega");
    },
  };
})();

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  WidgetApp.init();
});
