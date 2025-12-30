/**
 * Widget de Pedidos - Configurações
 * Arquivo: app/js/config.js
 *
 * Centralize aqui todas as constantes e configurações do widget.
 */

var WidgetConfig = {
  // ============================================
  // CONFIGURAÇÕES DA API
  // ============================================
  API: {
    // Configuração de Endpoints e suas respectivas Public Keys
    ENDPOINTS: {
      CONSULTA_CLIENTE: {
        NAME: "consultaCliente",
        PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX", // Chave existente
      },
      CONSULTA_PRODUTO: {
        NAME: "consultaProduto",
        PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX", // Assumindo a mesma por enquanto, ajustar se necessário
      },
      CRIAR_PEDIDO: {
        NAME: "criarPedido",
        PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX", // Assumindo a mesma por enquanto
      },
      CONSULTA_CONDICAO_PAGAMENTO: {
        NAME: "consultaCondicoesPagamento",
        PUBLIC_KEY: "HXP79EOmkeUTFneJVNHK2GqTv",
      },
    },
  },

  // ============================================
  // CONFIGURAÇÕES DE UI
  // ============================================
  UI: {
    // Mostrar painel de debug (desabilitar em produção)
    DEBUG_ENABLED: true,

    // Tempo de exibição de mensagens de status (ms)
    STATUS_TIMEOUT: 5000,
  },

  // ============================================
  // DADOS MOCK (para testes offline)
  // ============================================
  MOCK: {
    CLIENTES: [
      { ID: "1", Nome: "Cliente Mock A" },
      { ID: "2", Nome: "Cliente Mock B" },
    ],
    PRODUTOS: [
      { ID: "10", Nome: "Produto Mock X" },
      { ID: "20", Nome: "Produto Mock Y" },
    ],
  },
};

// Congela o objeto para evitar modificações acidentais
if (typeof Object.freeze === "function") {
  Object.freeze(WidgetConfig);
  Object.freeze(WidgetConfig.API);
  Object.freeze(WidgetConfig.API.ENDPOINTS);
  Object.freeze(WidgetConfig.UI);
  Object.freeze(WidgetConfig.MOCK);
}
