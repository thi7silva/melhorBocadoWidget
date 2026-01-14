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

            // Verifica se está em modo de edição
            // Parâmetro esperado: idPedido
            var idPedido =
              response.idPedido || response.idpedido || response.pedidoId;

            if (idPedido) {
              WidgetUI.log(
                "Modo Edição Detectado. Pedido: " + idPedido,
                "success"
              );
              carregarPedidoEdicao(idPedido);
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
   * Seleciona um cliente e mostra a tela de listagem de pedidos
   */
  function selecionarCliente(cliente) {
    state.clienteSelecionado = cliente;
    state.etapaAtual = "listagem";

    WidgetUI.log("Cliente selecionado: " + cliente.Nome, "success");

    // Mostra a tela de listagem
    WidgetUI.mostrarTelaListagem(cliente);

    // Busca detalhes completos do cliente primeiro
    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          WidgetUI.log("Detalhes do cliente carregados", "success");

          // Armazena os detalhes no estado
          state.clienteDetalhe = detalhe;
          state.clienteIdReal = detalhe.id;

          WidgetUI.log("ID real do cliente: " + detalhe.id);

          // Agora busca os pedidos usando o ID real
          return WidgetAPI.listarPedidosCliente(detalhe.id);
        })
        .then(function (pedidos) {
          WidgetUI.log("Pedidos carregados: " + pedidos.length, "success");

          // Reverte a ordem para mostrar os mais recentes primeiro
          if (Array.isArray(pedidos)) {
            pedidos.reverse();
          }

          // Armazena os pedidos no estado
          state.pedidosCliente = pedidos;

          // Renderiza a lista de pedidos
          WidgetUI.renderizarListagemPedidos(pedidos);
        })
        .catch(function (err) {
          var errMsg = err;
          try {
            errMsg = JSON.stringify(err);
          } catch (e) {}
          WidgetUI.log("Erro ao carregar pedidos: " + errMsg, "error");

          // Em caso de erro, mostra lista vazia
          WidgetUI.renderizarListagemPedidos([]);
        });
    } else {
      // Modo offline - mostra lista vazia
      WidgetUI.renderizarListagemPedidos([]);
    }
  }

  /**
   * Inicia um novo pedido (chamado a partir da tela de listagem)
   */
  function iniciarNovoPedido() {
    var cliente = state.clienteSelecionado;
    if (!cliente) {
      WidgetUI.log("Nenhum cliente selecionado", "error");
      return;
    }

    state.etapaAtual = "pedido";

    // Garante que não está em modo edição
    state.modo = null;
    state.pedidoId = null;

    WidgetUI.log("Iniciando novo pedido para: " + cliente.Nome, "success");

    // Esconde a listagem
    WidgetUI.esconderTelaListagem();

    // Mostra loading de transição
    WidgetUI.mostrarLoadingTransicao();

    // Se já temos os detalhes do cliente, usa direto
    if (state.clienteDetalhe) {
      processarDetalhesCliente(state.clienteDetalhe, cliente);
      return;
    }

    // Caso contrário, busca os detalhes
    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          processarDetalhesCliente(detalhe, cliente);
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
   * Processa os detalhes do cliente e mostra a tela de pedido
   * @param {Object} detalhe - Detalhes do cliente vindos da API
   * @param {Object} cliente - Dados básicos do cliente
   */
  function processarDetalhesCliente(detalhe, cliente) {
    // Armazena os detalhes no estado
    state.clienteDetalhe = detalhe;
    state.clienteIdReal = detalhe.id;

    // Define o cliente no módulo de produtos usando o ID real
    WidgetProdutos.setClienteId(detalhe.id);

    // Atualiza RazaoSocial e NomeFantasia
    if (detalhe.clienteRazaoSocial) {
      cliente.RazaoSocial = detalhe.clienteRazaoSocial;
    }
    if (detalhe.clienteNomeFantasia) {
      cliente.NomeFantasia = detalhe.clienteNomeFantasia;
      cliente.Nome = detalhe.clienteNomeFantasia || cliente.Nome;
    }

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

    // Define a janela de entrega no módulo de entrega
    WidgetEntrega.setJanelaEntrega(detalhe.janelaEntrega);
    WidgetEntrega.setListaFeriados(detalhe.listaFeriados);

    // Carrega condições de pagamento e pré-seleciona a do cliente
    carregarCondicoesPagamentoComSelecao(detalhe.pagamentoCondicaoID);

    // Seleciona o tipo de frete automaticamente e trava
    if (detalhe.tipoFrete) {
      var tipoFrete = detalhe.tipoFrete.toLowerCase();
      if (tipoFrete.indexOf("cif") >= 0) {
        WidgetUI.selecionarFreteAutomatico("cif", true);
      } else if (tipoFrete.indexOf("fob") >= 0) {
        WidgetUI.selecionarFreteAutomatico("fob", true);
      }
    }

    // Mostra a etapa do pedido e esconde loading
    WidgetUI.mostrarEtapaPedido(cliente);
    WidgetUI.esconderLoadingTransicao();

    // Renderiza preview de datas de entrega
    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
  }

  /**
   * Carrega um pedido para edição
   * @param {string} idPedido - ID do pedido
   */
  function carregarPedidoEdicao(idPedido) {
    state.modo = "editar";
    state.pedidoId = idPedido;
    WidgetUI.setStatus("Carregando dados do pedido...", "loading");

    WidgetAPI.buscarDetalhesPedido(idPedido)
      .then(function (detalhes) {
        WidgetUI.log("Detalhes do pedido recebidos", "success");
        processarPedidoEdicao(detalhes);
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao carregar pedido: " + err, "error");
        WidgetUI.setStatus("Erro ao carregar pedido.", "error");
      });
  }

  /**
   * Processa os dados do pedido e preenche a interface
   * @param {Object} data - Dados do pedido vindos da API
   */
  function processarPedidoEdicao(data) {
    // 1. Popula Cliente
    var clienteObj = data.cliente;
    var cliente = {
      ID: clienteObj.idCRM || clienteObj.id,
      Nome: clienteObj.nomeFantasia || clienteObj.razaoSocial,
      RazaoSocial: clienteObj.razaoSocial,
      NomeFantasia: clienteObj.nomeFantasia,
      CPF_CNPJ: clienteObj.cnpjCpf,
      Endereco: data.endereco.logradouro, // Usado pela mostrarEtapaPedido
    };

    state.clienteSelecionado = cliente;
    state.clienteIdReal = clienteObj.id; // Record ID used for queries

    // 2. Transforma detalhe para formato compatível com UI
    var detalheSimulado = {
      clienteRazaoSocial: cliente.RazaoSocial,
      clienteNomeFantasia: cliente.NomeFantasia,

      // Endereço
      endereco: data.endereco.logradouro,
      bairro: data.endereco.bairro,
      municipio: data.endereco.municipio,
      estado: data.endereco.estado,
      cep: data.endereco.cep,
      complemento: data.endereco.complemento,

      // Vendedor
      vendedorNome: data.vendedor.nome,
      vendedorID: data.vendedor.id,

      // Configurações
      pagamentoCondicaoID: data.configuracao.condicaoPagamentoId,
      pagamentoCondicaoCodigo: data.configuracao.condicaoPagamentoCodigo, // Importante manter
      tipoFrete: data.configuracao.tipoFrete,
      transportadoraID: data.configuracao.transportadoraId,
      transportadoraRazao: data.configuracao.transportadoraRazao,

      // Janela Entrega
      janelaEntrega: data.entrega.janelaEntrega || [],
      horaInicio1: data.entrega.horaInicio1,
      horaFim1: data.entrega.horaFim1,
      horaInicio2: data.entrega.horaInicio2,
      horaFim2: data.entrega.horaFim2,
      listaFeriados: [],
    };

    state.clienteDetalhe = detalheSimulado;

    // 3. Renderiza Cliente e Detalhes
    WidgetUI.mostrarEtapaPedido(cliente);
    WidgetUI.preencherDetalheCliente(detalheSimulado);

    // Atualiza nome do vendedor explicitamente se necessário
    var vEl = document.getElementById("vendedor-nome");
    if (vEl && detalheSimulado.vendedorNome)
      vEl.textContent = detalheSimulado.vendedorNome;

    // 4. Popula Carrinho
    var itensCarrinho = transformarItensEdicao(data.itens);
    WidgetProdutos.setClienteId(clienteObj.id);
    WidgetProdutos.setCarrinho(itensCarrinho);

    // 5. Configurações do Pedido

    // Condição Pagamento
    carregarCondicoesPagamentoComSelecao(data.configuracao.condicaoPagamentoId);

    // Frete
    if (data.configuracao.tipoFrete) {
      WidgetUI.selecionarFreteAutomatico(data.configuracao.tipoFrete, false); // false = não travar hard, permitir edição se quiser
    }

    // Natureza
    selecionarOpcaoCard("natureza", data.configuracao.natureza);

    // Campos de texto
    setValorInput(
      "numero-pedido-cliente",
      data.configuracao.numeroPedidoCliente
    );
    setValorInput("observacoes", data.configuracao.observacoesGerais);
    setValorInput("endereco-entrega", data.endereco.observacaoEntrega);

    // 6. Data de Entrega
    if (data.entrega && data.entrega.dataISO) {
      WidgetEntrega.setDataSelecionadaManual({
        dataFormatada: data.entrega.dataFormatada,
        dataISO: data.entrega.dataISO,
        diaSemana: data.entrega.diaSemana,
      });
      // Popula o campo de observações de entrega
      var obsEntrega = document.getElementById("observacoes-entrega");
      if (obsEntrega) obsEntrega.value = data.entrega.observacoes || "";
    }

    // Feedback visual de edição
    WidgetUI.setHeaderSubtitle("Atualização de Pedido");
    var header = document.querySelector(".app-header");
    if (header) {
      header.classList.add("header-edicao"); // Classe CSS para customizar visualmente

      // Remove badge anterior se existir para evitar duplicidade
      var oldBadge = document.getElementById("badge-modo-edicao");
      if (oldBadge) oldBadge.remove();

      var badge = document.createElement("div");
      badge.id = "badge-modo-edicao";
      badge.className = "badge-edicao";

      // Monta o texto do badge com número do pedido e CRM se houver
      var badgeText = "EDIÇÃO";

      var numProtheus =
        data.numeroPedidoProtheus ||
        data.configuracao.numeroPedidoProtheus ||
        "-";
      var numCRM =
        data.numeroPedidoCRM || data.configuracao.numeroPedidoCRM || "";

      var html = badgeText + " <span>" + numProtheus + "</span>";
      if (numCRM) {
        html +=
          "<span style='margin-left:8px; padding-left:8px; border-left:1px solid rgba(255,255,255,0.3)'>" +
          numCRM +
          "</span>";
      }

      // Estrutura HTML do badge
      badge.innerHTML = html;

      header.appendChild(badge);
    }

    // Muda para aba produtos
    WidgetUI.switchTab("produtos");

    // Ajusta visualização
    WidgetUI.esconderTelaListagem();
    WidgetUI.hideStatus();

    // Recalcula e seleciona a data de entrega correta
    // Primeiro gera as datas disponíveis novamente para o cliente selecionado
    // Como a lógica de janela de entrega não depende de uma chamada async SEPARADA (já veio no 'data' ou é calculada localmente),
    // podemos apenas garantir que o cálculo está feito:

    // Se a API trouxer a janela de entrega permitida do cliente, atualizamos
    // (no detalheSimulado acima já populamos, mas vamos reforçar aqui se necessário)
    if (data.entrega && data.entrega.janelaEntrega) {
      WidgetEntrega.setJanelaEntrega(data.entrega.janelaEntrega);
    }

    // Força a geração das datas disponíveis
    // Isso garante que se o usuário abrir o modal, verá as datas corretas
    // E também permite validarmos se a data do pedido ainda é válida
    // Porém, para edição, queremos manter a data original MESMO que ela não esteja mais "disponível" (ex: passado)
    // Então apenas setamos ela visualmente como selecionada.

    // Se não veio dataSelecionadaManual acima, tentamos recalcular
    // Mas a lógica anterior já tratou o 'data.entrega.dataISO'
    // O IMPORTANTE é que ao abrir o modal, as datas estejam lá.
    // O modal chama 'gerarDatasDisponiveis' ao abrir. Então está ok.

    // Apenas garantimos que o WidgetEntrega saiba da janela do cliente para quando for abrir o modal
    WidgetUI.log(
      "Pedido carregado para edição e janela de entrega atualizada",
      "success"
    );

    // Renderiza preview de datas de entrega (mesmo comportamento do fluxo normal)
    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
  }

  /**
   * Transforma itens da API para o formato do Carrinho
   */
  function transformarItensEdicao(itensApi) {
    if (!Array.isArray(itensApi)) return [];

    return itensApi.map(function (item) {
      return {
        ID: String(item.produtoId),
        Codigo: item.produtoCodigo,
        Nome: item.produtoNome,
        Quantidade: item.quantidade,
        Unidade: item.unidade,
        imagemProduto: item.imagemProduto,

        // Preços
        Preco: item.precoUnitario, // Preço atual (com desconto se houver)
        PrecoBase: item.precoBase,
        IPI: item.ipi,
        ST: item.st,

        // Valores de Tabela Originais
        precoBaseTabela: item.precoBaseTabela,
        ipiTabela: item.ipiTabela,
        stTabela: item.stTabela,
        precoTabela: item.precoTabela,

        // Desconto
        // Se impostos recalculados, o desconto unitário real é a diferença de preço
        // Se não, é o descontoPendente dividido pela quantidade
        // Aqui vamos confiar no descontoUnitarioReal que vem calculado
        descontoValor: item.descontoUnitarioReal,
        descontoPercent: item.descontoPercentual,
        impostosRecalculados: item.impostosRecalculados,
        descontoAplicadoValor: item.descontoTotal, // Total do desconto deste item
      };
    });
  }

  // Helpers internos para edição
  function setValorInput(id, valor) {
    var el = document.getElementById(id);
    if (el) el.value = valor || "";
  }

  function selecionarOpcaoCard(group, valor) {
    if (!valor) return;
    var cards = document.querySelectorAll(
      '.option-card[data-group="' + group + '"]'
    );
    cards.forEach(function (card) {
      if (card.getAttribute("data-value") === valor) {
        card.click(); // Simula click para ativar lógica visual
      }
    });
  }

  /**
   * Visualiza um pedido existente (somente leitura)
   * @param {string} pedidoId - ID do pedido
   */
  function visualizarPedido(pedidoId) {
    WidgetUI.log("Visualizar pedido: " + pedidoId);
    // TODO: Implementar tela de visualização (próxima fase)
    alert(
      "Funcionalidade de visualização será implementada em breve.\n\nID do Pedido: " +
        pedidoId
    );
  }

  /**
   * Edita um pedido existente
   * @param {string} pedidoId - ID do pedido
   */
  function editarPedido(pedidoId) {
    WidgetUI.log("Iniciando edição do pedido: " + pedidoId);
    carregarPedidoEdicao(pedidoId);
  }

  /**
   * Seleciona um cliente e avança direto para a etapa de pedido (modo legado/direto)
   * Mantido para compatibilidade caso seja necessário pular a listagem
   */
  function selecionarClienteDireto(cliente) {
    state.clienteSelecionado = cliente;
    state.etapaAtual = "pedido";

    WidgetUI.log("Cliente selecionado (direto): " + cliente.Nome, "success");

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

    // Limpa estado de edição
    state.modo = null;
    state.pedidoId = null;

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

        // Valores ATUAIS (recalculados)
        subtotalBruto: Math.round(subtotalBruto * 100) / 100,
        totalIPI: Math.round(totalIPI * 100) / 100,
        totalST: Math.round(totalST * 100) / 100,

        // Valores de TABELA (originais)
        subtotalTabela: Math.round(subtotalTabela * 100) / 100,
        totalIPITabela: Math.round(totalIPITabela * 100) / 100,
        totalSTTabela: Math.round(totalSTTabela * 100) / 100,

        // Descontos - VALOR (R$)
        descontoItensValor: Math.round(totalDescontoItens * 100) / 100,
        descontoGlobalValor:
          Math.round((descontoState.totalDescontoGlobal || 0) * 100) / 100,
        descontoTotalValor:
          Math.round(
            (totalDescontoItens + (descontoState.totalDescontoGlobal || 0)) *
              100
          ) / 100,

        // Descontos - PERCENTUAL (%)
        descontoItensPercentual:
          Math.round(descontoPercentualGeral * 100) / 100,
        descontoTotalPercentual:
          Math.round(descontoPercentualGeral * 100) / 100,

        // Total Final
        totalFinal: Math.round(totalFinal * 100) / 100,
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
      dadosPedido.totais.descontoItensValor.toFixed(2)
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
    WidgetUI.log("Enviando pedido para API...", "success");

    // Chama a API para criar o pedido

    // MODO EDIÇÃO: Adiciona o ID do pedido ao payload e prossegue com a chamada
    if (state.modo === "editar" && state.pedidoId) {
      dadosPedido.idPedido = state.pedidoId;
      WidgetUI.log("Atualizando Pedido: " + state.pedidoId, "success");
    }

    WidgetAPI.criarPedido(dadosPedido)
      .then(function (response) {
        console.log("✅ Pedido criado com sucesso!");
        console.log("Resposta:", response);

        // Atualiza o modal de sucesso com os dados
        var dataEl = document.getElementById("sucesso-data-entrega");
        var totalEl = document.getElementById("sucesso-total");
        var numeroPedidoEl = document.getElementById("sucesso-numero-pedido");

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

        // Se a API retornar um número de pedido, exibe
        if (numeroPedidoEl && response && response.numeroPedido) {
          numeroPedidoEl.textContent = response.numeroPedido;
          numeroPedidoEl.parentElement.style.display = "block";
        }

        // --- ATUALIZAÇÕES PARA O MODAL DE SUCESSO ---
        var modalTitulo = document.getElementById("sucesso-titulo");
        var modalMsg = document.getElementById("sucesso-mensagem-texto");
        var btnSucesso = document.querySelector(".sucesso-btn");

        // Verifica Modo de Edição
        // Verifica Modo de Edição
        if (state.modo === "editar" && state.pedidoId) {
          if (modalTitulo) {
            modalTitulo.textContent = "Pedido Atualizado com Sucesso!";
          }
          if (modalMsg) {
            modalMsg.textContent =
              "As alterações foram salvas e o pedido foi atualizado com sucesso.";
          }
          if (btnSucesso) {
            btnSucesso.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Voltar ao Início
           `;
          }
        } else {
          // Restaura padrão para novo pedido
          if (modalTitulo) {
            modalTitulo.textContent = "Pedido Criado com Sucesso!";
          }
          if (modalMsg) {
            modalMsg.textContent =
              "Seu pedido foi registrado e será processado em breve.";
          }
          if (btnSucesso) {
            btnSucesso.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
              Criar Novo Pedido
           `;
          }
        }

        // Renderiza lista de produtos no modal de sucesso
        var listaProdutosEl = document.getElementById("sucesso-produtos-lista");

        // Garante que pega o carrinho mais atual se possível
        var carrinhoParaExibir = state.carrinho;
        if (
          typeof WidgetProdutos !== "undefined" &&
          WidgetProdutos.getCarrinho
        ) {
          carrinhoParaExibir = WidgetProdutos.getCarrinho();
        }

        console.log("Exibindo produtos no modal sucesso:", carrinhoParaExibir);

        if (listaProdutosEl) {
          if (carrinhoParaExibir && carrinhoParaExibir.length > 0) {
            var htmlProdutos =
              '<h3 class="sucesso-produtos-titulo">Itens do Pedido</h3>';
            htmlProdutos += '<div class="sucesso-produtos-scroll">';

            carrinhoParaExibir.forEach(function (item) {
              htmlProdutos += `
                     <div class="sucesso-produto-item">
                        <span class="produto-qtd">${item.Quantidade}x</span>
                        <span class="produto-nome">${item.Nome}</span>
                     </div>
                  `;
            });

            htmlProdutos += "</div>";
            listaProdutosEl.innerHTML = htmlProdutos;
            listaProdutosEl.style.display = "block";
          } else {
            listaProdutosEl.style.display = "none";
          }
        }

        // Mostra o modal de sucesso
        WidgetUI.abrirModal("modal-sucesso");

        // Log de sucesso
        WidgetUI.log("Pedido enviado com sucesso!", "success");
      })
      .catch(function (error) {
        console.error("❌ Erro ao criar pedido:", error);
        WidgetUI.log("Erro ao enviar pedido: " + error, "error");

        // Mostra mensagem de erro para o usuário
        alert(
          "Erro ao enviar pedido. Por favor, tente novamente.\n\nDetalhes: " +
            (error.message || error)
        );
      });

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

  // ============================================
  // FUNÇÕES DE CANCELAMENTO DE PEDIDO
  // ============================================

  // Armazena o pedido que está sendo cancelado
  var pedidoCancelando = null;

  /**
   * Abre o modal de cancelamento de pedido
   * @param {string} pedidoId - ID do pedido
   * @param {string} numeroPedido - Número do pedido para exibição
   * @param {string} valorTotal - Valor total formatado do pedido
   */
  function abrirModalCancelarPedido(pedidoId, numeroPedido, valorTotal) {
    WidgetUI.log("Abrindo modal de cancelamento para pedido: " + pedidoId);

    // Tenta obter o nome do cliente do estado ou do DOM
    var nomeCliente = state.clienteSelecionado
      ? state.clienteSelecionado.Nome
      : "";
    if (!nomeCliente) {
      var clienteEl = document.getElementById("listagem-cliente-nome");
      if (clienteEl) nomeCliente = clienteEl.textContent;
    }

    // Armazena o pedido sendo cancelado
    pedidoCancelando = {
      id: pedidoId,
      numero: numeroPedido,
      valor: valorTotal,
      cliente: nomeCliente,
    };

    // Atualiza a identificação do pedido no modal
    var identificacaoEl = document.getElementById(
      "cancelar-pedido-identificacao"
    );
    if (identificacaoEl) {
      if (numeroPedido && numeroPedido.trim() !== "") {
        // Se tiver número, mostra o número
        identificacaoEl.textContent = numeroPedido;
      } else {
        // Se não tiver número, mostra Nome do Cliente + Valor
        identificacaoEl.textContent =
          nomeCliente + " - " + (valorTotal || "R$ 0,00");
      }
    }

    // Limpa o campo de motivo
    var motivoEl = document.getElementById("cancelar-motivo");
    if (motivoEl) {
      motivoEl.value = "";
      motivoEl.classList.remove("input-error");
    }

    // Esconde mensagem de erro
    var erroEl = document.getElementById("cancelar-motivo-erro");
    if (erroEl) {
      erroEl.style.display = "none";
    }

    // Abre o modal
    WidgetUI.abrirModal("modal-cancelar-pedido");
  }

  /**
   * Fecha o modal de cancelamento de pedido
   */
  function fecharModalCancelarPedido() {
    WidgetUI.fecharModal("modal-cancelar-pedido");
    pedidoCancelando = null;
  }

  /**
   * Confirma o cancelamento do pedido
   * Valida o motivo e processa o cancelamento
   */
  function confirmarCancelamentoPedido() {
    var motivoEl = document.getElementById("cancelar-motivo");
    var erroEl = document.getElementById("cancelar-motivo-erro");
    var btnConfirmar = document.getElementById("btn-confirmar-cancelar-pedido");

    // Valida o motivo
    var motivo = motivoEl ? motivoEl.value.trim() : "";

    if (!motivo) {
      // Mostra erro visual
      if (erroEl) {
        erroEl.style.display = "flex"; // Flex para alinhar ícone
      }
      if (motivoEl) {
        motivoEl.focus();
        motivoEl.classList.add("input-error");
      }
      return;
    }

    // Remove classe de erro se existir
    if (motivoEl) {
      motivoEl.classList.remove("input-error");
    }
    if (erroEl) {
      erroEl.style.display = "none";
    }

    // Bloqueia botão para evitar duplo clique
    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML =
        '<span class="loading-spinner-mini"></span> Processando...';
    }

    // Pega o usuário logado
    var usuario = state.loginUser || "Usuário não identificado";

    // Por enquanto, apenas console.log (conforme solicitado)
    console.log("=== CANCELAMENTO DE PEDIDO ===");
    console.log(
      "ID do Pedido:",
      pedidoCancelando ? pedidoCancelando.id : "N/A"
    );
    console.log(
      "Número do Pedido:",
      pedidoCancelando ? pedidoCancelando.numero : "N/A"
    );
    console.log(
      "Cliente:",
      pedidoCancelando ? pedidoCancelando.cliente : "N/A"
    );
    console.log("Valor:", pedidoCancelando ? pedidoCancelando.valor : "N/A");
    console.log("Motivo:", motivo);
    console.log("Usuário:", usuario);
    console.log("Data/Hora:", new Date().toISOString());
    console.log("==============================");

    WidgetUI.log(
      "Cancelamento solicitado - Pedido: " +
        (pedidoCancelando ? pedidoCancelando.id : "N/A"),
      "success"
    );

    // Fecha o modal após um pequeno delay para feedback
    setTimeout(function () {
      fecharModalCancelarPedido();

      // Restaura botão
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar Cancelamento";
      }

      // UX: Mostra loading de tela cheia para suavizar a transição/reload
      WidgetUI.mostrarLoadingTransicao(
        "Cancelando pedido...",
        "Aguarde enquanto processamos o cancelamento. A página será recarregada."
      );
      WidgetUI.setStatus("Solicitação enviada com sucesso!", "success");

      // Recarrega a página após 2 segundos para dar tempo do usuário ler
      setTimeout(function () {
        window.location.reload();
      }, 2000);
    }, 800);
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
    // Novas funções de listagem/edição
    iniciarNovoPedido: iniciarNovoPedido,
    visualizarPedido: visualizarPedido,
    editarPedido: editarPedido,
    // Funções de cancelamento de pedido
    abrirModalCancelarPedido: abrirModalCancelarPedido,
    fecharModalCancelarPedido: fecharModalCancelarPedido,
    confirmarCancelamentoPedido: confirmarCancelamentoPedido,
  };
})();

// ============================================
// INICIALIZAÇÃO
// ============================================
document.addEventListener("DOMContentLoaded", function () {
  WidgetApp.init();
});
