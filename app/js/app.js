/**
 * Widget de Pedidos - Aplicação Principal
 * Arquivo: app/js/app.js
 *
 * Lógica principal, inicialização e orquestração do widget.
 */

var WidgetApp = (function () {
  "use strict";

  // Estado da aplicação
  var state = {
    initialized: false,
    online: false,
    clientes: [],
    selectedClient: null,
  };

  /**
   * Inicializa o Widget
   */
  function init() {
    WidgetUI.log("Iniciando Widget Melhor Bocado...");
    WidgetUI.init();

    // Verifica SDK do Zoho
    if (typeof ZOHO === "undefined") {
      WidgetUI.log("SDK do Zoho não encontrado", "error");
      WidgetUI.setStatus("Erro: SDK não carregou.", "error");
      iniciarModoOffline();
      return;
    }

    // Tenta conectar ao Zoho
    conectarZoho();
  }

  /**
   * Tenta estabelecer conexão com o Zoho Creator
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
        .then(function (params) {
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
   * Inicia o widget em modo online (conectado ao Zoho)
   */
  function iniciarModoOnline() {
    WidgetUI.setStatus("Conectado! Digite para buscar clientes.", "success");

    // Esconde status após 3 segundos
    setTimeout(function () {
      WidgetUI.hideStatus();
    }, 3000);
  }

  /**
   * Inicia o widget em modo offline (dados mock)
   */
  function iniciarModoOffline() {
    WidgetUI.log("Entrando em modo offline...");
    WidgetUI.setStatus("Modo Offline - Usando dados de teste", "loading");
    state.online = false;
  }

  /**
   * Busca clientes
   */
  function searchClients(query) {
    WidgetUI.log("Buscando clientes: " + query);
    WidgetUI.setStatus("Buscando clientes...", "loading");

    if (state.online) {
      WidgetAPI.buscarClientes(query)
        .then(function (clientes) {
          state.clientes = clientes;
          WidgetUI.renderClientList(clientes);
          WidgetUI.hideStatus();
          WidgetUI.log(
            "Encontrados " + clientes.length + " clientes",
            "success"
          );
        })
        .catch(function (err) {
          WidgetUI.log("Erro na busca: " + err, "error");
          WidgetUI.setStatus("Erro ao buscar clientes.", "error");
          // Fallback para mock
          useMockClients(query);
        });
    } else {
      useMockClients(query);
    }
  }

  /**
   * Usa clientes mock (offline/fallback)
   */
  function useMockClients(query) {
    var mockClientes = WidgetConfig.MOCK.CLIENTES.filter(function (c) {
      return c.Nome.toLowerCase().indexOf(query.toLowerCase()) >= 0;
    });
    state.clientes = mockClientes;
    WidgetUI.renderClientList(mockClientes);
    WidgetUI.hideStatus();
  }

  /**
   * Define o cliente selecionado
   */
  function setSelectedClient(cliente) {
    state.selectedClient = cliente;
    WidgetUI.log(
      "Cliente selecionado: " + cliente.Nome + " (ID: " + cliente.ID + ")"
    );
  }

  /**
   * Limpa seleção de cliente
   */
  function clearClient() {
    state.selectedClient = null;
    WidgetUI.clearClientSelection();
    WidgetUI.log("Seleção de cliente limpa");
  }

  // API Pública do Módulo
  return {
    init: init,
    searchClients: searchClients,
    setSelectedClient: setSelectedClient,
    clearClient: clearClient,
    getState: function () {
      return state;
    },
  };
})();

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  WidgetApp.init();
});
