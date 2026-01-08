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
        NAME: "criacaoPedido",
        PUBLIC_KEY: "WwW9ZBTewO5dkytknFGBbGsOB",
      },
      CONSULTA_CONDICAO_PAGAMENTO: {
        NAME: "consultaCondicoesPagamento",
        PUBLIC_KEY: "HXP79EOmkeUTFneJVNHK2GqTv",
      },
      DETALHE_CLIENTE: {
        NAME: "detalheCliente",
        PUBLIC_KEY: "ng2VsZfqvC1v2Z6BWY7DpVUeJ",
      },
      CONSULTA_SUBTITULOS: {
        NAME: "consultaSubTitulos",
        PUBLIC_KEY: "ZpKF60KBpdXEm2ZyjA9HE8bSs",
      },
      CONSULTA_PRECOS: {
        NAME: "consultaPrecos",
        PUBLIC_KEY: "hxfa2xVT9DRzdkuMZOH59kWtT",
      },
      USUARIO_LOGADO: {
        NAME: "usuarioLogado",
        PUBLIC_KEY: "62ZDZvaOeBADdT5tS7X1hmJr4",
      },
      CONSULTA_IMPOSTOS: {
        NAME: "consultaImpostos",
        PUBLIC_KEY: "yMsQeZtOP6styYuCgxs8sF0CY",
      },
    },
  },

  // ============================================
  // CONFIGURAÇÕES DE UI
  // ============================================
  UI: {
    /**
     * Habilita o painel de debug no widget.
     * IMPORTANTE: Definir como FALSE em produção!
     * Para desenvolvimento local, altere para TRUE.
     */
    DEBUG_ENABLED: true,

    // Tempo de exibição de mensagens de status (ms)
    STATUS_TIMEOUT: 5000,
  },

  // ============================================
  // CONFIGURAÇÕES DE DESCONTO
  // ============================================
  DESCONTO: {
    /**
     * Porcentagem máxima de desconto permitida
     * Base de cálculo: Total das mercadorias SEM impostos (PrecoBase * Quantidade)
     */
    LIMITE_PERCENTUAL: 30, // 30%

    /**
     * Tempo de exibição do alerta de limite excedido (ms)
     */
    ALERT_TIMEOUT: 4000,
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
  Object.freeze(WidgetConfig.DESCONTO);
  Object.freeze(WidgetConfig.MOCK);
}
