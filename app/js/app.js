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
    etapaAtual: "cliente", // "cliente" ou "pedido"
    clientes: [],
    clienteSelecionado: null,
    itensPedido: [],
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

    // Obtém dados de inicialização do Zoho
    if (ZOHO.CREATOR && ZOHO.CREATOR.UTIL) {
      // getInitParams
      if (ZOHO.CREATOR.UTIL.getInitParams) {
        ZOHO.CREATOR.UTIL.getInitParams()
          .then(function (response) {
            WidgetUI.log("getInitParams: " + JSON.stringify(response));

            // Pega o loginUser e chama a API usuarioLogado
            var loginUser = response.loginUser;
            if (loginUser) {
              WidgetUI.log("Login User: " + loginUser);

              // Armazena o email do usuário logado no estado
              state.loginUser = loginUser;

              // Chama a API customizada usuarioLogado usando o mesmo padrão do api.js
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
                    "success"
                  );
                })
                .catch(function (apiErr) {
                  WidgetUI.log(
                    "Erro usuarioLogado: " + JSON.stringify(apiErr),
                    "error"
                  );
                });
            } else {
              WidgetUI.log("loginUser não encontrado", "error");
            }
          })
          .catch(function (err) {
            WidgetUI.log("Erro getInitParams: " + err, "error");
          });
      }

      // getQueryParams
      if (ZOHO.CREATOR.UTIL.getQueryParams) {
        ZOHO.CREATOR.UTIL.getQueryParams()
          .then(function (response) {
            WidgetUI.log("getQueryParams: " + JSON.stringify(response));
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
   * Inicia o widget em modo offline (dados mock)
   */
  function iniciarModoOffline() {
    WidgetUI.log("Entrando em modo offline...");
    WidgetUI.setStatus("Modo Offline - Usando dados de teste", "loading");
    state.online = false;
  }

  /**
   * Busca clientes
   * @param {string} query - Termo de busca
   * @param {string} [type] - Tipo de busca (opcional)
   */
  function searchClients(query, type) {
    WidgetUI.log("Buscando clientes: " + query);
    WidgetUI.setStatus("Buscando clientes...", "loading");

    // Usa o email do usuário logado armazenado no estado
    var email = state.loginUser || "";
    type = type || "";

    if (state.online) {
      WidgetAPI.buscarClientes(query, type, email)
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
   * Carrega condições de pagamento
   */
  function carregarCondicoesPagamento() {
    // Se já está online, busca na API
    if (state.online) {
      WidgetAPI.buscarCondicoesPagamento()
        .then(function (condicoes) {
          WidgetUI.log(
            "Condições de pagamento carregadas: " + condicoes.length
          );
          WidgetUI.renderPaymentConditions(condicoes);
        })
        .catch(function (err) {
          var errMsg = err;
          try {
            errMsg = JSON.stringify(err);
          } catch (e) {}
          WidgetUI.log("Erro ao buscar condições de pgto: " + errMsg, "error");
          // Fallback para mock se falhar? Ou mostra erro?
          // Por enquanto deixamos vazio ou mostramos erro visualmente se necessário
        });
    } else {
      // Mock offline
      var mockCondicoes = [
        { ID: "1", Display: "À Vista (Mock)" },
        { ID: "2", Display: "30 Dias (Mock)" },
      ];
      WidgetUI.renderPaymentConditions(mockCondicoes);
    }
  }

  /**
   * Seleciona um cliente e avança para a etapa de pedido
   */
  function selecionarCliente(cliente) {
    state.clienteSelecionado = cliente;
    state.etapaAtual = "pedido";

    WidgetUI.log("Cliente selecionado: " + cliente.Nome, "success");

    // Mostra loading de transição
    WidgetUI.mostrarLoadingTransicao();

    // Busca detalhes completos do cliente (passa o idCRM que está no campo ID)
    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          WidgetUI.log("Detalhes do cliente carregados", "success");

          // Armazena os detalhes no estado
          state.clienteDetalhe = detalhe;

          // Armazena o ID real do cliente (diferente do idCRM usado na busca)
          state.clienteIdReal = detalhe.id;
          WidgetUI.log("ID real do cliente (dos detalhes): " + detalhe.id);

          // Define o cliente no módulo de produtos usando o ID real (não o idCRM)
          // Todas as operações subsequentes usarão este ID
          WidgetProdutos.setClienteId(detalhe.id);

          // Atualiza RazaoSocial e NomeFantasia com os dados atualizados dos detalhes
          // (podem estar diferentes da listagem inicial)
          if (detalhe.clienteRazaoSocial) {
            cliente.RazaoSocial = detalhe.clienteRazaoSocial;
          }
          if (detalhe.clienteNomeFantasia) {
            cliente.NomeFantasia = detalhe.clienteNomeFantasia;
            // Atualiza o Nome também se o NomeFantasia for diferente
            cliente.Nome = detalhe.clienteNomeFantasia || cliente.Nome;
          }

          // Atualiza o cliente selecionado no estado com os dados atualizados
          state.clienteSelecionado = cliente;

          // Preenche os campos com os detalhes
          WidgetUI.preencherDetalheCliente(detalhe);

          // Atualiza o vendedor no header
          if (detalhe.vendedorNome) {
            var vendedorNome = document.getElementById("vendedor-nome");
            if (vendedorNome) {
              vendedorNome.textContent = detalhe.vendedorNome;
            }
          }

          // Log para debug
          WidgetUI.log(
            "Condição de Pagamento ID: " + detalhe.pagamentoCondicaoID
          );
          WidgetUI.log("Tipo de Frete: " + detalhe.tipoFrete);
          WidgetUI.log(
            "Janela de Entrega: " + JSON.stringify(detalhe.janelaEntrega)
          );

          // Define a janela de entrega no módulo de entrega
          WidgetEntrega.setJanelaEntrega(detalhe.janelaEntrega);

          // Define a lista de feriados/datas bloqueadas
          WidgetEntrega.setListaFeriados(detalhe.listaFeriados);

          // Carrega condições de pagamento e pré-seleciona a do cliente
          carregarCondicoesPagamentoComSelecao(detalhe.pagamentoCondicaoID);

          // Seleciona o tipo de frete automaticamente e trava
          if (detalhe.tipoFrete) {
            var tipoFrete = detalhe.tipoFrete.toLowerCase();
            if (tipoFrete.indexOf("cif") >= 0) {
              WidgetUI.selecionarFreteAutomatico("cif", true); // true = travar
            } else if (tipoFrete.indexOf("fob") >= 0) {
              WidgetUI.selecionarFreteAutomatico("fob", true); // true = travar
            }
          }

          // Mostra a etapa do pedido e esconde loading (agora com dados atualizados)
          WidgetUI.mostrarEtapaPedido(cliente);
          WidgetUI.esconderLoadingTransicao();

          // Renderiza preview de datas de entrega
          setTimeout(function () {
            WidgetEntrega.renderizarPreviewDatas();
          }, 100);
        })
        .catch(function (err) {
          var errMsg = err;
          try {
            errMsg = JSON.stringify(err);
          } catch (e) {}
          WidgetUI.log("Erro ao buscar detalhes: " + errMsg, "error");

          // Mesmo com erro, mostra a tela e tenta carregar condições
          WidgetUI.mostrarEtapaPedido(cliente);
          WidgetUI.esconderLoadingTransicao();
          WidgetUI.setStatus("Erro ao carregar detalhes do cliente", "error");
          carregarCondicoesPagamento();
        });
    } else {
      // Modo offline - mostra a tela e esconde loading
      WidgetUI.mostrarEtapaPedido(cliente);
      WidgetUI.esconderLoadingTransicao();
      carregarCondicoesPagamento();
    }
  }

  /**
   * Carrega condições de pagamento com pré-seleção
   * @param {string} condicaoID - ID da condição a ser pré-selecionada
   */
  function carregarCondicoesPagamentoComSelecao(condicaoID) {
    if (state.online) {
      WidgetAPI.buscarCondicoesPagamento()
        .then(function (condicoes) {
          WidgetUI.log(
            "Condições de pagamento carregadas: " + condicoes.length
          );
          WidgetUI.renderPaymentConditions(condicoes, condicaoID);
        })
        .catch(function (err) {
          var errMsg = err;
          try {
            errMsg = JSON.stringify(err);
          } catch (e) {}
          WidgetUI.log("Erro ao buscar condições de pgto: " + errMsg, "error");
        });
    } else {
      var mockCondicoes = [
        { ID: "1", Display: "À Vista (Mock)" },
        { ID: "2", Display: "30 Dias (Mock)" },
      ];
      WidgetUI.renderPaymentConditions(mockCondicoes, condicaoID);
    }
  }

  /**
   * Volta para a seleção de cliente
   */
  function voltarParaCliente() {
    // Fecha o modal se estiver aberto
    WidgetUI.fecharModal("modal-cancelar");

    // Limpa o estado
    state.clienteSelecionado = null;
    state.etapaAtual = "cliente";
    state.itensPedido = [];

    WidgetUI.log("Voltando para seleção de cliente");
    WidgetUI.mostrarEtapaCliente();
  }

  /**
   * Abre o modal de confirmação de cancelamento
   */
  function confirmarCancelamento() {
    WidgetUI.abrirModal("modal-cancelar");
  }

  /**
   * Volta para a aba anterior
   */
  function voltarAba() {
    var activeTab = WidgetUI.getActiveTab();

    if (activeTab === "produtos") {
      WidgetUI.switchTab("config");
      WidgetUI.log("Voltando para configurações");
    }
  }

  /**
   * Retorna o estado atual
   */
  function getState() {
    return state;
  }

  /**
   * Ação do botão principal do footer
   * Avança para produtos ou gera o pedido conforme a aba ativa
   */
  function footerAction() {
    var activeTab = WidgetUI.getActiveTab();

    if (activeTab === "config") {
      // Avança para a aba de produtos
      WidgetUI.switchTab("produtos");
      WidgetUI.log("Avançando para seleção de produtos");
    } else if (activeTab === "produtos") {
      // Verifica se há produtos no carrinho
      var carrinho = WidgetProdutos.getCarrinho();
      if (carrinho.length === 0) {
        WidgetUI.log(
          "Carrinho vazio - adicione produtos antes de continuar",
          "error"
        );
        WidgetUI.setStatus(
          "Adicione produtos ao carrinho antes de continuar",
          "error"
        );
        setTimeout(function () {
          WidgetUI.hideStatus();
        }, 3000);
        return;
      }
      // Abre o modal de seleção de entrega
      WidgetEntrega.abrirModalEntrega();
    }
  }

  /**
   * Gera o pedido e exibe os dados no console
   */
  function gerarPedido() {
    WidgetUI.log("Gerando pedido...", "success");

    // Coleta dados do formulário
    var dadosPedido = {
      // Cliente
      cliente: state.clienteSelecionado,

      // Configurações do pedido
      enderecoEntrega: document.getElementById("endereco-entrega")?.value || "",
      condicaoPagamento:
        document.getElementById("condicao-pagamento")?.value || "",
      tipoFrete: getSelectedOption("frete"),
      natureza: getSelectedOption("natureza"),
      numeroPedidoCliente:
        document.getElementById("numero-pedido-cliente")?.value || "",
      observacoes: document.getElementById("observacoes")?.value || "",

      // Produtos (por enquanto vazio)
      itens: state.itensPedido,

      // Metadados
      dataGeracao: new Date().toISOString(),
      totalPedido: 0, // TODO: calcular quando tiver produtos
    };

    // Exibe no console
    console.log("=".repeat(50));
    console.log("📦 DADOS DO PEDIDO:");
    console.log("=".repeat(50));
    console.log(JSON.stringify(dadosPedido, null, 2));
    console.log("=".repeat(50));

    // Log no painel de debug
    WidgetUI.log("Pedido gerado! Verifique o console (F12)", "success");

    return dadosPedido;
  }

  /**
   * Finaliza o pedido com a data de entrega selecionada
   * @param {Object} dataEntrega - Objeto com dados da data de entrega
   * @param {string} observacoesEntrega - Observações/informações de entrega
   */
  function finalizarPedidoComEntrega(dataEntrega, observacoesEntrega) {
    WidgetUI.log(
      "Finalizando pedido com entrega em: " + dataEntrega.dataFormatada,
      "success"
    );

    // Obtém dados do carrinho e descontos
    var carrinho = WidgetProdutos.getCarrinho();
    var descontoState = WidgetProdutos.getDescontoState();

    // Calcula totais
    var subtotalBruto = 0;
    var subtotalTabela = 0; // Subtotal com preços de tabela (originais)
    var totalDescontoItens = 0;
    var totalIPI = 0;
    var totalST = 0;
    var totalIPITabela = 0;
    var totalSTTabela = 0;

    // Mapeia os itens para o formato de envio
    var itensFormatados = carrinho.map(function (item) {
      // Valores de TABELA (originais, para referência)
      var precoBaseTabela = item.precoBaseTabela || item.PrecoBase || 0;
      var ipiTabela = item.ipiTabela || item.IPI || 0;
      var stTabela = item.stTabela || item.ST || 0;
      var precoTabela = item.precoTabela || item.Preco || 0;
      var subtotalTabelaItem = precoTabela * item.Quantidade;

      // Valores ATUAIS (após recálculo de impostos se houver desconto aplicado)
      var subtotalAtualItem = item.Preco * item.Quantidade;

      // Lógica de cálculo baseada no estado do item
      var subtotalLiquido;
      var descontoRealItem;

      if (item.impostosRecalculados && item.descontoAplicadoValor > 0) {
        // Quando impostos foram recalculados, o total final é o preço atual × quantidade
        // O desconto real é a diferença entre tabela e atual
        subtotalLiquido = subtotalAtualItem;
        descontoRealItem = subtotalTabelaItem - subtotalAtualItem;
      } else {
        // Desconto pendente (ainda não aplicado nos impostos)
        var descontoPendente = (item.descontoValor || 0) * item.Quantidade;
        subtotalLiquido = subtotalTabelaItem - descontoPendente;
        descontoRealItem = descontoPendente;
      }

      // Desconto unitário (para exibição)
      var descontoUnitarioReal = descontoRealItem / item.Quantidade;

      // Percentual de desconto calculado sobre o preço de tabela
      var descontoPercentCalculado = 0;
      if (precoTabela > 0) {
        descontoPercentCalculado = (descontoUnitarioReal / precoTabela) * 100;
      }

      // Acumuladores
      subtotalBruto += subtotalAtualItem;
      subtotalTabela += subtotalTabelaItem;
      totalDescontoItens += descontoRealItem;
      totalIPI += (item.IPI || 0) * item.Quantidade;
      totalST += (item.ST || 0) * item.Quantidade;
      totalIPITabela += ipiTabela * item.Quantidade;
      totalSTTabela += stTabela * item.Quantidade;

      return {
        produtoId: item.ID,
        produtoCodigo: item.Codigo || "",
        produtoNome: item.Nome,
        quantidade: item.Quantidade,
        unidade: item.Unidade || "UN",
        imagemProduto: item.imagemProduto || "",

        // Valores ATUAIS (após recálculo de impostos, se aplicável)
        precoUnitario: item.Preco,
        precoBase: item.PrecoBase || item.Preco,
        ipi: item.IPI || 0,
        st: item.ST || 0,

        // Valores de TABELA (originais, nunca mudam)
        precoBaseTabela: precoBaseTabela,
        ipiTabela: ipiTabela,
        stTabela: stTabela,
        precoTabela: precoTabela,

        // Descontos
        descontoPendente: item.descontoValor || 0,
        descontoAplicado: item.descontoAplicadoValor || 0,
        descontoUnitarioReal: Math.round(descontoUnitarioReal * 100) / 100,
        descontoPercentual: Math.round(descontoPercentCalculado * 100) / 100, // Arredonda para 2 casas
        descontoTotal: descontoRealItem,
        impostosRecalculados: item.impostosRecalculados || false,

        // Subtotais
        subtotalBruto: subtotalAtualItem,
        subtotalTabela: subtotalTabelaItem,
        subtotalLiquido: subtotalLiquido,
      };
    });

    // Total final = subtotal de tabela - descontos
    var totalFinal = subtotalTabela - totalDescontoItens;

    // Percentual de desconto geral sobre o pedido
    var descontoPercentualGeral = 0;
    if (subtotalTabela > 0) {
      descontoPercentualGeral = (totalDescontoItens / subtotalTabela) * 100;
    }

    // Monta o JSON estruturado para envio
    var dadosPedido = {
      // --- Dados do Cliente ---
      cliente: {
        id: state.clienteIdReal || state.clienteSelecionado?.ID || "",
        idCRM: state.clienteSelecionado?.ID || "",
        razaoSocial:
          state.clienteDetalhe?.clienteRazaoSocial ||
          state.clienteSelecionado?.RazaoSocial ||
          "",
        nomeFantasia:
          state.clienteDetalhe?.clienteNomeFantasia ||
          state.clienteSelecionado?.NomeFantasia ||
          "",
        cnpjCpf: state.clienteSelecionado?.CPF_CNPJ || "",
        protheusCodigo: state.clienteDetalhe?.protheusCodigo || "",
        protheusLoja: state.clienteDetalhe?.protheusLoja || "",
        codigoMB: state.clienteDetalhe?.clienteCodigoMB || "",
        canal: state.clienteDetalhe?.clienteCanal || "",
        bandeira: state.clienteDetalhe?.bandeiraDescricao || "",
        loteMinimo: state.clienteDetalhe?.municipioLoteMinimo || 0,
      },

      // --- Vendedor ---
      vendedor: {
        id: state.clienteDetalhe?.vendedorID || "",
        nome: state.clienteDetalhe?.vendedorNome || "",
        email: state.loginUser || "",
      },

      // --- Endereço de Entrega ---
      endereco: {
        logradouro: state.clienteDetalhe?.endereco || "",
        bairro: state.clienteDetalhe?.bairro || "",
        municipio: state.clienteDetalhe?.municipio || "",
        estado: state.clienteDetalhe?.estado || "",
        cep: state.clienteDetalhe?.cep || "",
        complemento: state.clienteDetalhe?.complemento || "",
        observacaoEntrega:
          document.getElementById("endereco-entrega")?.value || "",
      },

      // --- Entrega ---
      entrega: {
        dataFormatada: dataEntrega.dataFormatada,
        dataISO: dataEntrega.dataISO,
        diaSemana: dataEntrega.nomeDia,
        observacoes: observacoesEntrega || "",
        // Janela de Entrega do Cliente
        janelaEntrega: state.clienteDetalhe?.janelaEntrega || [],
        horaInicio1: state.clienteDetalhe?.horaInicio1 || "",
        horaFim1: state.clienteDetalhe?.horaFim1 || "",
        horaInicio2: state.clienteDetalhe?.horaInicio2 || "",
        horaFim2: state.clienteDetalhe?.horaFim2 || "",
      },

      // --- Configurações do Pedido ---
      configuracao: {
        condicaoPagamentoId:
          document.getElementById("condicao-pagamento")?.value || "",
        condicaoPagamentoCodigo:
          state.clienteDetalhe?.pagamentoCondicaoCodigo || "",
        tipoFrete: getSelectedOption("frete"),
        transportadoraId: state.clienteDetalhe?.transportadoraID || "",
        transportadoraCodigo: state.clienteDetalhe?.transportadoraCodigo || "",
        transportadoraRazao: state.clienteDetalhe?.transportadoraRazao || "",
        natureza: getSelectedOption("natureza"),
        numeroPedidoCliente:
          document.getElementById("numero-pedido-cliente")?.value || "",
        observacoesGerais: document.getElementById("observacoes")?.value || "",
      },

      // --- Itens do Pedido ---
      itens: itensFormatados,

      // --- Totais ---
      totais: {
        quantidadeItens: carrinho.length,
        // Valores ATUAIS
        subtotalBruto: subtotalBruto,
        totalIPI: totalIPI,
        totalST: totalST,
        // Valores de TABELA (originais)
        subtotalTabela: subtotalTabela,
        totalIPITabela: totalIPITabela,
        totalSTTabela: totalSTTabela,
        // Descontos
        descontoItens: totalDescontoItens,
        descontoGlobal: descontoState.totalDescontoGlobal || 0,
        descontoTotal:
          totalDescontoItens + (descontoState.totalDescontoGlobal || 0),
        descontoPercentualGeral:
          Math.round(descontoPercentualGeral * 100) / 100, // Arredonda para 2 casas
        // Total Final
        totalFinal: totalFinal,
      },

      // --- Metadados ---
      meta: {
        dataGeracao: new Date().toISOString(),
        origemWidget: "melhor-bocado-pedido",
        versao: "1.0.0",
      },
    };

    // ============================================
    // CONSOLE.LOG DETALHADO PARA DEBUG
    // ============================================
    console.log("=".repeat(60));
    console.log("📦 DADOS DO PEDIDO PARA ENVIO À API");
    console.log("=".repeat(60));
    console.log("\n📋 JSON COMPLETO:");
    console.log(JSON.stringify(dadosPedido, null, 2));
    console.log("\n" + "-".repeat(60));
    console.log("📊 RESUMO:");
    console.log(
      "  • Cliente:",
      dadosPedido.cliente.nomeFantasia || dadosPedido.cliente.razaoSocial
    );
    console.log("  • Vendedor:", dadosPedido.vendedor.nome);
    console.log(
      "  • Data Entrega:",
      dadosPedido.entrega.dataFormatada,
      "(" + dadosPedido.entrega.diaSemana + ")"
    );
    console.log("  • Qtd. Itens:", dadosPedido.totais.quantidadeItens);
    console.log(
      "  • Subtotal Bruto:",
      "R$",
      dadosPedido.totais.subtotalBruto.toFixed(2)
    );
    console.log(
      "  • Desconto Itens:",
      "R$",
      dadosPedido.totais.descontoItens.toFixed(2)
    );
    console.log(
      "  • Total Final:",
      "R$",
      dadosPedido.totais.totalFinal.toFixed(2)
    );
    console.log("-".repeat(60));
    console.log("📦 ITENS:");
    dadosPedido.itens.forEach(function (item, index) {
      console.log(
        "  " +
          (index + 1) +
          ". " +
          item.produtoNome +
          " | Qtd: " +
          item.quantidade +
          " | Preço: R$" +
          item.precoUnitario.toFixed(2) +
          " | Desc%: " +
          item.descontoPercentual +
          "%" +
          " | DescR$: R$" +
          item.descontoUnitarioReal.toFixed(2) +
          " | SubTotal: R$" +
          item.subtotalLiquido.toFixed(2)
      );
    });
    console.log("=".repeat(60));

    // Log no painel de debug
    WidgetUI.log("Pedido finalizado! Verifique o console (F12)", "success");

    // Atualiza o modal de sucesso com os dados
    var dataEl = document.getElementById("sucesso-data-entrega");
    var totalEl = document.getElementById("sucesso-total");

    if (dataEl) {
      dataEl.textContent =
        dataEntrega.dataFormatada + " (" + dataEntrega.nomeDia + ")";
    }
    if (totalEl) {
      totalEl.textContent =
        "R$ " +
        dadosPedido.totais.totalFinal.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
    }

    // Mostra o modal de sucesso
    WidgetUI.abrirModal("modal-sucesso");

    // TODO: Enviar pedido para API
    // WidgetAPI.criarPedido(dadosPedido)...

    return dadosPedido;
  }

  /**
   * Volta para seleção de cliente limpando tudo
   * Recarrega a página para garantir estado limpo
   */
  function voltarParaClienteCompleto() {
    // Recarrega a página para garantir estado completamente limpo
    window.location.reload();
  }

  /**
   * Obtém o valor selecionado de um grupo de option-cards
   * @param {string} group - Nome do grupo (ex: 'frete', 'natureza')
   * @returns {string} Valor selecionado ou string vazia
   */
  function getSelectedOption(group) {
    var activeCard = document.querySelector(
      '.option-card.active[data-group="' + group + '"]'
    );
    return activeCard ? activeCard.getAttribute("data-value") : "";
  }

  // API Pública do Módulo
  return {
    init: init,
    searchClients: searchClients,
    selecionarCliente: selecionarCliente,
    voltarParaCliente: voltarParaCliente,
    voltarParaClienteCompleto: voltarParaClienteCompleto,
    confirmarCancelamento: confirmarCancelamento,
    voltarAba: voltarAba,
    getState: getState,
    carregarCondicoesPagamento: carregarCondicoesPagamento,
    footerAction: footerAction,
    gerarPedido: gerarPedido,
    finalizarPedidoComEntrega: finalizarPedidoComEntrega,
  };
})();

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  WidgetApp.init();
});
