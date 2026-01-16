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
    WidgetUI.hideStatus();

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

    // Limpa estado do módulo de produtos (carrinho, descontos)
    WidgetProdutos.limparCarrinho();

    // Reset visual da edição no header
    WidgetUI.setHeaderSubtitle("");
    var header = document.querySelector(".app-header");
    if (header) {
      header.classList.remove("header-edicao");
      var oldBadge = document.getElementById("badge-modo-edicao");
      if (oldBadge) oldBadge.remove();
    }

    // Limpa campos de input que podem ter ficado sujos
    setValorInput("numero-pedido-cliente", "");
    setValorInput("observacoes", "");
    setValorInput("endereco-entrega", "");

    // Reseta entrega
    WidgetEntrega.setDataSelecionadaManual(null);
    var obsEntrega = document.getElementById("observacoes-entrega");
    if (obsEntrega) obsEntrega.value = "";

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

    // Define o Lote Mínimo no módulo de produtos
    WidgetProdutos.setLoteMinimo(detalhe.municipioLoteMinimo);

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
      pagamentoCondicaoCodigo: data.configuracao.condicaoPagamentoCodigo,
      pagamentoCondicaoDescricao: data.configuracao.condicaoPagamentoNome,
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
    WidgetProdutos.setLoteMinimo(clienteObj.municipioLoteMinimo || 0);
    WidgetProdutos.setCarrinho(itensCarrinho);

    // 5. Configurações do Pedido

    // Condição Pagamento
    carregarCondicoesPagamentoComSelecao(data.configuracao.condicaoPagamentoId);

    // Frete
    if (data.configuracao.tipoFrete) {
      WidgetUI.selecionarFreteAutomatico(data.configuracao.tipoFrete, true); // true = travar para manter consistência com pagamento
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
      var precoUnitario = parseFloat(item.precoUnitario) || 0;
      var descontoUnitario = parseFloat(item.descontoUnitarioReal) || 0;

      // Tenta obter o preço de tabela original (sem descontos)
      // Se não vier na API, calculamos somando o preço atual + desconto
      var precoTabela = parseFloat(item.precoTabela);
      if (isNaN(precoTabela) || precoTabela === 0) {
        precoTabela = precoUnitario + descontoUnitario;
      }

      return {
        ID: String(item.produtoId),
        Codigo: item.produtoCodigo,
        Nome: item.produtoNome,
        Quantidade: parseFloat(item.quantidade) || 0,
        Unidade: item.unidade,
        imagemProduto: item.imagemProduto,

        // Preços
        Preco: precoUnitario, // Preço atual (com desconto se houver)
        PrecoBase: parseFloat(item.precoBase) || 0,
        IPI: parseFloat(item.ipi) || 0,
        ST: parseFloat(item.st) || 0,

        // Valores de Tabela Originais (para cálculo de desconto correto)
        precoBaseTabela:
          parseFloat(item.precoBaseTabela) || parseFloat(item.precoBase) || 0,
        ipiTabela: parseFloat(item.ipiTabela) || parseFloat(item.ipi) || 0,
        stTabela: parseFloat(item.stTabela) || parseFloat(item.st) || 0,
        precoTabela: precoTabela,

        // Desconto
        // Se impostos recalculados, o desconto unitário real é a diferença de preço
        // Aqui vamos confiar no descontoUnitarioReal que vem calculado
        descontoValor: descontoUnitario,
        descontoPercent: parseFloat(item.descontoPercentual) || 0,
        impostosRecalculados: item.impostosRecalculados,
        descontoAplicadoValor: parseFloat(item.descontoTotal) || 0, // Total do desconto deste item
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
    WidgetUI.log("Carregando visualização do pedido: " + pedidoId);

    // Tenta encontrar o pedido na lista atual para garantir o status
    var pedidoLista = null;
    if (state.pedidosCliente && Array.isArray(state.pedidosCliente)) {
      pedidoLista = state.pedidosCliente.find(function (p) {
        return String(p.pedidoId) === String(pedidoId);
      });
    }

    // Mostra loading
    WidgetUI.setStatus("Carregando pedido...", "loading");

    // Busca detalhes do pedido
    WidgetAPI.buscarDetalhesPedido(pedidoId)
      .then(function (detalhes) {
        WidgetUI.log(
          "Detalhes do pedido recebidos para visualização",
          "success"
        );

        // Se o detalhe não trouxe status mas temos na lista, usa o da lista
        if (!detalhes.status && pedidoLista && pedidoLista.status) {
          detalhes.status = pedidoLista.status;
        }

        popularModalVisualizacao(detalhes, pedidoId);
        WidgetUI.hideStatus();
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao carregar pedido: " + err, "error");
        WidgetUI.setStatus("Erro ao carregar pedido.", "error");
      });
  }

  /**
   * Popula o modal de visualização com os dados do pedido
   * @param {Object} data - Dados completos do pedido
   * @param {string} idOriginal - ID do pedido vindo da chamada original
   */
  function popularModalVisualizacao(data, idOriginal) {
    // Header - Número e Status
    document.getElementById("vis-numero-principal").textContent =
      data.numeroPedidoProtheus ||
      data.configuracao?.numeroPedidoProtheus ||
      "-";

    var numCRM =
      data.numeroPedidoCRM || data.configuracao?.numeroPedidoCRM || "";
    var numCRMEl = document.getElementById("vis-numero-crm");
    if (numCRM) {
      numCRMEl.textContent = numCRM;
      numCRMEl.style.display = "inline";
    } else {
      numCRMEl.style.display = "none";
    }

    // Data de criação
    var dataCriacao = data.emissaoPedido || data.meta?.dataGeracao || null;
    document.getElementById("vis-data-criacao").textContent =
      "Criado em " + (dataCriacao ? WidgetUI.formatarData(dataCriacao) : "-");

    // Status Badge
    var statusBadge = document.getElementById("vis-status-badge");
    var statusClass = getStatusClassVis(data.status);
    var statusIcon = getStatusIconVis(statusClass);
    statusBadge.className = "vis-status-badge " + statusClass;
    statusBadge.querySelector(".status-icon").innerHTML = statusIcon;
    statusBadge.querySelector(".status-text").textContent = data.status || "-";

    // Timeline
    renderizarTimelineVis(data.status);

    // Cliente
    document.getElementById("vis-cliente-nome").textContent =
      data.cliente?.nomeFantasia || "-";
    document.getElementById("vis-cliente-razao").textContent =
      data.cliente?.razaoSocial || "-";
    document.getElementById("vis-cliente-cnpj").textContent =
      formatarCpfCnpjVis(data.cliente?.cnpjCpf) || "-";

    // Monta endereço completo
    var enderecoCompleto = montarEnderecoCompletoVis(data.endereco);
    document.getElementById("vis-cliente-endereco").textContent =
      enderecoCompleto;

    // Entrega
    document.getElementById("vis-data-entrega").textContent =
      data.entrega?.dataFormatada || "-";

    var janelaTexto = montarJanelaEntregaVis(data.entrega);
    document.getElementById("vis-janela-entrega").textContent = janelaTexto;

    // Observações de entrega (mostra/esconde)
    var obsEntrega = data.entrega?.observacoes || "";
    var obsEntregaRow = document.getElementById("vis-obs-entrega-row");
    if (obsEntrega && obsEntrega.trim()) {
      document.getElementById("vis-obs-entrega").textContent = obsEntrega;
      obsEntregaRow.style.display = "flex";
    } else {
      obsEntregaRow.style.display = "none";
    }

    // Configurações
    document.getElementById("vis-condicao-pgto").textContent =
      data.condicaoPagamentoDisplay ||
      data.configuracao?.condicaoPagamentoCodigo ||
      "-";
    document.getElementById("vis-tipo-frete").textContent = (
      data.configuracao?.tipoFrete || "-"
    ).toUpperCase();
    document.getElementById("vis-natureza").textContent =
      capitalize(data.configuracao?.natureza) || "-";
    document.getElementById("vis-num-pedido-cliente").textContent =
      data.configuracao?.numeroPedidoCliente || "-";

    // Observações gerais (mostra/esconde)
    var obsGerais = data.configuracao?.observacoesGerais || "";
    var obsGeraisRow = document.getElementById("vis-obs-gerais-row");
    if (obsGerais && obsGerais.trim()) {
      document.getElementById("vis-obs-gerais").textContent = obsGerais;
      obsGeraisRow.style.display = "flex";
    } else {
      obsGeraisRow.style.display = "none";
    }

    // Produtos
    renderizarProdutosVis(data.itens || []);

    // Resumo Financeiro
    var subtotal = parseFloat(data.totais?.subtotalBruto || data.subTotal) || 0;
    var desconto =
      parseFloat(data.totais?.descontoTotalValor || data.desconto) || 0;
    var total = parseFloat(data.totais?.totalFinal || data.totalPedido) || 0;

    document.getElementById("vis-subtotal").textContent =
      WidgetUI.formatarMoeda(subtotal);
    document.getElementById("vis-total").textContent =
      WidgetUI.formatarMoeda(total);

    var descontoRow = document.getElementById("vis-desconto-row");
    if (desconto > 0) {
      document.getElementById("vis-desconto").textContent =
        "-" + WidgetUI.formatarMoeda(desconto);
      descontoRow.style.display = "flex";
    } else {
      descontoRow.style.display = "none";
    }

    // Detalhes
    var qtdItens = data.totais?.quantidadeItens || (data.itens || []).length;
    document.getElementById("vis-qtd-itens").textContent = qtdItens;

    var descontoPercRow = document.getElementById("vis-desconto-perc-row");
    if (subtotal > 0 && desconto > 0) {
      var descontoPerc = ((desconto / subtotal) * 100).toFixed(1);
      document.getElementById("vis-desconto-perc").textContent =
        descontoPerc + "%";
      descontoPercRow.style.display = "flex";
    } else {
      descontoPercRow.style.display = "none";
    }

    // Botões de Ação (condicionais baseados em canEdit)
    var canEdit = data.canEdit === true;
    var btnEditar = document.getElementById("vis-btn-editar");
    var btnCancelar = document.getElementById("vis-btn-cancelar");

    if (canEdit) {
      btnEditar.style.display = "flex";
      btnCancelar.style.display = "flex";
    } else {
      btnEditar.style.display = "none";
      btnCancelar.style.display = "none";
    }

    // Armazena o ID do pedido para as ações
    // Usa o ID original passado ou tenta encontrar no objeto (fallback)
    var idFinal = idOriginal || data.idPedido || data.pedidoID || data.id;

    state.pedidoVisualizando = {
      id: idFinal,
      numero:
        data.numeroPedidoProtheus || data.configuracao?.numeroPedidoProtheus,
      total: WidgetUI.formatarMoeda(total),
    };

    // Abre o modal
    WidgetUI.abrirModal("modal-visualizar-pedido");
  }

  // ============================================
  // FUNÇÕES AUXILIARES PARA VISUALIZAÇÃO
  // ============================================

  /**
   * Fecha o modal de visualização
   */
  function fecharVisualizarPedido() {
    WidgetUI.fecharModal("modal-visualizar-pedido");
    state.pedidoVisualizando = null;
  }

  /**
   * Edita o pedido a partir da visualização
   */
  function editarPedidoVisualizacao() {
    if (state.pedidoVisualizando) {
      var id = state.pedidoVisualizando.id;
      fecharVisualizarPedido();
      editarPedido(id);
    }
  }

  /**
   * Clona o pedido a partir da visualização
   */
  function clonarPedidoVisualizacao() {
    if (state.pedidoVisualizando) {
      var id = state.pedidoVisualizando.id;
      fecharVisualizarPedido();
      clonarPedido(id);
    }
  }

  /**
   * Cancela o pedido a partir da visualização
   */
  function cancelarPedidoVisualizacao() {
    if (state.pedidoVisualizando) {
      var pedido = state.pedidoVisualizando;
      fecharVisualizarPedido();
      abrirModalCancelarPedido(pedido.id, pedido.numero, pedido.total);
    }
  }

  /**
   * Helpers para formatação na visualização
   */
  function formatarCpfCnpjVis(doc) {
    if (!doc) return "-";
    var numeros = doc.replace(/\D/g, "");
    if (numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (numeros.length === 14) {
      return numeros.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return doc;
  }

  function montarEnderecoCompletoVis(endereco) {
    if (!endereco) return "-";
    var partes = [];
    if (endereco.logradouro) partes.push(endereco.logradouro);
    if (endereco.bairro) partes.push(endereco.bairro);
    if (endereco.municipio || endereco.estado) {
      var cidadeEstado = [];
      if (endereco.municipio) cidadeEstado.push(endereco.municipio);
      if (endereco.estado) cidadeEstado.push(endereco.estado);
      partes.push(cidadeEstado.join("/"));
    }
    if (endereco.cep) {
      var cep = endereco.cep.replace(/\D/g, "");
      if (cep.length === 8) {
        partes.push("CEP " + cep.replace(/(\d{5})(\d{3})/, "$1-$2"));
      } else {
        partes.push("CEP " + endereco.cep);
      }
    }
    return partes.length > 0 ? partes.join(", ") : "-";
  }

  function montarJanelaEntregaVis(entrega) {
    if (!entrega) return "-";
    var janelas = [];
    if (entrega.janelaEntrega && entrega.janelaEntrega.length > 0) {
      janelas = janelas.concat(entrega.janelaEntrega);
    }
    if (entrega.horaInicio1 && entrega.horaFim1) {
      janelas.push(entrega.horaInicio1 + " - " + entrega.horaFim1);
    }
    return janelas.length > 0 ? janelas.join(", ") : "-";
  }

  function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function getStatusClassVis(status) {
    if (!status) return "status-rascunho";
    var s = status.toLowerCase();
    if (s.indexOf("rascunho") >= 0) return "status-rascunho";
    if (s.indexOf("criado") >= 0) return "status-criado";
    if (
      s.indexOf("aguardando") >= 0 ||
      s.indexOf("aprovação") >= 0 ||
      s.indexOf("aprovacao") >= 0
    )
      return "status-aguardando";
    if (s.indexOf("sincronizado") >= 0) return "status-sincronizado";
    if (s.indexOf("faturado") >= 0) return "status-faturado";
    if (s.indexOf("agendado") >= 0) return "status-agendado";
    if (s.indexOf("entregue") >= 0) return "status-entregue";
    if (s.indexOf("cancelado") >= 0) return "status-cancelado";
    if (s.indexOf("erro") >= 0) return "status-erro";
    return "status-rascunho";
  }

  function getStatusIconVis(statusClass) {
    var icons = {
      "status-rascunho":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>',
      "status-criado":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>',
      "status-aguardando":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
      "status-sincronizado":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>',
      "status-faturado":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>',
      "status-agendado":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M9 16l2 2 4-4"></path></svg>',
      "status-entregue":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
      "status-cancelado":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
      "status-erro":
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>',
    };
    return icons[statusClass] || icons["status-rascunho"];
  }

  function renderizarTimelineVis(status) {
    var statusClass = getStatusClassVis(status);
    var statusMap = {
      "status-rascunho": 1,
      "status-criado": 2,
      "status-aguardando": 3,
      "status-sincronizado": 4,
      "status-faturado": 5,
      "status-agendado": 6,
      "status-entregue": 7,
      "status-cancelado": 0,
      "status-erro": 0,
    };

    var currentOrder = statusMap[statusClass] || 0;
    var timeline = document.getElementById("vis-timeline");

    // Se cancelado ou erro, não mostra timeline
    if (currentOrder === 0) {
      timeline.style.display = "none";
      return;
    }

    timeline.style.display = "flex";
    var html = "";

    for (var i = 1; i <= 7; i++) {
      var stepClass = "";
      if (i < currentOrder) stepClass = "completed";
      else if (i === currentOrder) stepClass = "current";
      else stepClass = "pending";

      html += '<div class="progress-step ' + stepClass + '">';
      html += '<div class="step-dot"></div>';
      if (i < 7) html += '<div class="step-line"></div>';
      html += "</div>";
    }

    timeline.innerHTML = html;
  }

  function renderizarProdutosVis(itens) {
    var container = document.getElementById("vis-produtos-lista");
    var countBadge = document.getElementById("vis-produtos-count");
    countBadge.textContent = itens.length;

    if (!itens || itens.length === 0) {
      container.innerHTML =
        '<div style="text-align:center;padding:20px;color:#999;">Nenhum produto encontrado</div>';
      return;
    }

    var html = "";
    itens.forEach(function (item) {
      var precoUnitario = parseFloat(item.precoUnitario) || 0;
      var quantidade = parseInt(item.quantidade) || 0;
      var subtotalItem = precoUnitario * quantidade;
      var descontoItem = parseFloat(item.descontoUnitarioReal) || 0;
      var descontoPerc = parseFloat(item.descontoPercentual) || 0;

      html += '<div class="vis-produto-item">';

      // Imagem ou placeholder
      // Extrai URL principal (pode conter metadados extras separados por espaço)
      var imagemUrl = "";
      if (item.imagemProduto && item.imagemProduto.trim()) {
        // Pega apenas a primeira URL (antes de " lowqual" ou espaço)
        imagemUrl = item.imagemProduto.split(" ")[0];
      }

      if (imagemUrl) {
        html +=
          '<img src="' +
          imagemUrl +
          '" alt="' +
          (item.produtoNome || "") +
          '" class="vis-produto-img" onerror="this.style.display=\'none\'" />';
      } else {
        var inicial = item.produtoNome
          ? item.produtoNome.charAt(0).toUpperCase()
          : "P";
        html +=
          '<div class="vis-produto-img-placeholder">' + inicial + "</div>";
      }

      // Info
      html += '<div class="vis-produto-info">';
      html +=
        '<div class="vis-produto-nome">' + (item.produtoNome || "-") + "</div>";
      html +=
        '<div class="vis-produto-codigo">Cód: ' +
        (item.produtoCodigo || "-") +
        "</div>";
      html += "</div>";

      // Valores
      html += '<div class="vis-produto-valores">';
      html +=
        '<div class="vis-produto-qtd">' +
        quantidade +
        " × " +
        WidgetUI.formatarMoeda(precoUnitario) +
        "</div>";
      html +=
        '<div class="vis-produto-preco">' +
        WidgetUI.formatarMoeda(subtotalItem) +
        "</div>";
      if (descontoItem > 0) {
        html +=
          '<div class="vis-produto-desconto">-' +
          WidgetUI.formatarMoeda(descontoItem * quantidade) +
          " (" +
          descontoPerc.toFixed(1) +
          "%)</div>";
      }
      html += "</div>";

      html += "</div>";
    });

    container.innerHTML = html;
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
   * Clona um pedido existente
   * @param {string} pedidoId - ID do pedido a ser clonado
   */
  function clonarPedido(pedidoId) {
    WidgetUI.log("Iniciando clonagem do pedido: " + pedidoId);
    state.modo = "clonar";
    state.pedidoId = null; // Não armazenamos o ID pois será um novo pedido
    state.pedidoClonadoId = pedidoId; // Guarda referência do pedido original

    // Mostra loading de transição para evitar "choque" visual
    WidgetUI.mostrarLoadingTransicao(
      "Clonando Pedido",
      "Carregando dados e preparando novo pedido..."
    );

    // Cria uma promise de delay mínimo de 1.5 segundos
    var delayPromise = new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    });

    // Executa a busca e o delay em paralelo
    Promise.all([WidgetAPI.buscarDetalhesPedido(pedidoId), delayPromise])
      .then(function (results) {
        // O primeiro resultado é o retorno da API
        var detalhes = results[0];
        WidgetUI.log("Detalhes do pedido recebidos para clonagem", "success");

        processarPedidoClonar(detalhes);

        // Esconde o loading de transição após processar
        WidgetUI.esconderLoadingTransicao();
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao carregar pedido: " + err, "error");
        WidgetUI.status("Erro ao carregar pedido.", "error"); // Use status instead of setStatus if setStatus is not available/working, but keeping setStatus if it was there. Wait, previous code used setStatus.
        // Actually, let's keep setStatus, but also hide transition
        WidgetUI.esconderLoadingTransicao();
        WidgetUI.setStatus("Erro ao carregar pedido.", "error");
      });
  }

  /**
   * Processa os dados do pedido para clonagem e preenche a interface
   * Similar ao processarPedidoEdicao mas limpa campos que devem ser preenchidos novamente
   * @param {Object} data - Dados do pedido vindos da API
   */
  function processarPedidoClonar(data) {
    // 1. Popula Cliente
    var clienteObj = data.cliente;
    var cliente = {
      ID: clienteObj.idCRM || clienteObj.id,
      Nome: clienteObj.nomeFantasia || clienteObj.razaoSocial,
      RazaoSocial: clienteObj.razaoSocial,
      NomeFantasia: clienteObj.nomeFantasia,
      CPF_CNPJ: clienteObj.cnpjCpf,
      Endereco: data.endereco.logradouro,
    };

    state.clienteSelecionado = cliente;
    state.clienteIdReal = clienteObj.id;

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
      pagamentoCondicaoCodigo: data.configuracao.condicaoPagamentoCodigo,
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

    // Atualiza nome do vendedor
    var vEl = document.getElementById("vendedor-nome");
    if (vEl && detalheSimulado.vendedorNome)
      vEl.textContent = detalheSimulado.vendedorNome;

    // 4. Popula Carrinho com os produtos clonados
    var itensCarrinho = transformarItensEdicao(data.itens);
    WidgetProdutos.setClienteId(clienteObj.id);
    WidgetProdutos.setLoteMinimo(clienteObj.municipioLoteMinimo || 0);
    WidgetProdutos.setCarrinho(itensCarrinho);

    // 5. Configurações do Pedido

    // Condição Pagamento
    carregarCondicoesPagamentoComSelecao(data.configuracao.condicaoPagamentoId);

    // Frete
    if (data.configuracao.tipoFrete) {
      WidgetUI.selecionarFreteAutomatico(data.configuracao.tipoFrete, false);
    }

    // Natureza
    selecionarOpcaoCard("natureza", data.configuracao.natureza);

    // 6. DIFERENÇA NA CLONAGEM: Limpar campos que devem ser preenchidos novamente

    // LIMPA: Número do Pedido do Cliente (novo pedido = novo número)
    setValorInput("numero-pedido-cliente", "");

    // MANTÉM: Observações gerais (opcional - pode ser útil manter)
    setValorInput("observacoes", data.configuracao.observacoesGerais);

    // LIMPA: Observação de entrega (contexto do novo pedido)
    setValorInput("endereco-entrega", "");

    // 7. LIMPA: Data de Entrega (usuário deve selecionar nova data)
    // Não chama setDataSelecionadaManual, deixa vazio
    var obsEntrega = document.getElementById("observacoes-entrega");
    if (obsEntrega) obsEntrega.value = "";

    // 8. Atualiza janela de entrega para gerar datas disponíveis
    if (data.entrega && data.entrega.janelaEntrega) {
      WidgetEntrega.setJanelaEntrega(data.entrega.janelaEntrega);
    }

    // 9. Ajusta visualização - Inicia na aba de configuração
    WidgetUI.switchTab("config");
    WidgetUI.esconderTelaListagem();
    WidgetUI.hideStatus();

    // 10. Log de sucesso
    WidgetUI.log(
      "Pedido clonado com sucesso - preencha os dados faltantes",
      "success"
    );

    // Renderiza preview de datas de entrega
    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
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

          // Define o Lote Mínimo
          WidgetProdutos.setLoteMinimo(detalhe.municipioLoteMinimo);

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
   * @param {Object} resultadoAprovacao - Resultado da verificação de aprovação {precisaAprovacao, motivos}
   */
  function finalizarPedidoComEntrega(
    dataEntrega,
    observacoesEntrega,
    resultadoAprovacao,
    isDraft
  ) {
    // Default isDraft to false if not provided
    isDraft = isDraft === true;

    WidgetUI.log(
      "Finalizando pedido " +
        (isDraft ? "(RASCUNHO) " : "") +
        "com entrega em: " +
        dataEntrega.dataFormatada,
      "success"
    );

    // ... (keeps existing cart and calculation logic) ...

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

      // --- Aprovação do Pedido ---
      // Flag indicando se o pedido precisa de aprovação da gestão
      aprovacaoPedido:
        resultadoAprovacao && resultadoAprovacao.precisaAprovacao
          ? true
          : false,
      motivosAprovacao:
        resultadoAprovacao && resultadoAprovacao.precisaAprovacao
          ? resultadoAprovacao.motivos
          : [],

      // --- Rascunho ---
      isDraft: isDraft,
    };

    // ============================================
    // CONSOLE.LOG DETALHADO PARA DEBUG
    // ============================================
    console.log("=".repeat(60));
    console.log(
      "📦 DADOS DO PEDIDO " +
        (isDraft ? "(RASCUNHO) " : "") +
        "PARA ENVIO À API"
    );
    console.log("=".repeat(60));
    console.log("\n📋 JSON COMPLETO:");
    console.log(JSON.stringify(dadosPedido, null, 2));
    console.log("\n" + "-".repeat(60));
    console.log("📊 RESUMO:");
    console.log(
      "  • Cliente:",
      dadosPedido.cliente.nomeFantasia || dadosPedido.cliente.razaoSocial
    );
    // ... (rest of logging code) ...
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
        if (state.modo === "editar" && state.pedidoId) {
          if (modalTitulo) {
            modalTitulo.textContent = isDraft
              ? "Rascunho Atualizado!"
              : "Pedido Atualizado com Sucesso!";
          }
          if (modalMsg) {
            modalMsg.textContent = isDraft
              ? "As alterações foram salvas no rascunho."
              : "As alterações foram salvas e o pedido foi atualizado com sucesso.";
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
          // Novo Pedido
          if (modalTitulo) {
            modalTitulo.textContent = isDraft
              ? "Rascunho Salvo com Sucesso!"
              : "Pedido Criado com Sucesso!";
          }
          if (modalMsg) {
            modalMsg.textContent = isDraft
              ? "O pedido foi salvo como rascunho. Você pode finalizá-lo depois."
              : "Seu pedido foi registrado e será processado em breve.";
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

    // Pega o usuário logado e ID
    var usuario = state.loginUser || "";
    var idPedido = pedidoCancelando ? pedidoCancelando.id : "";

    if (!idPedido) {
      WidgetUI.setStatus("Erro: ID do pedido não encontrado", "error");
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
        btnConfirmar.textContent = "Confirmar Cancelamento";
      }
      return;
    }

    // Chama a API de cancelamento
    WidgetAPI.cancelarPedido(idPedido, usuario, motivo)
      .then(function (response) {
        // Verifica sucesso na resposta (trata string "true" ou booleano true)
        var sucesso =
          response &&
          (response.success === true || response.success === "true");
        var mensagem = response
          ? response.message || "Operação realizada"
          : "Sem resposta da API";

        if (sucesso) {
          // Sucesso - Mostra loading e recarrega
          WidgetUI.log("Pedido cancelado: " + mensagem, "success");

          // Fecha modal
          fecharModalCancelarPedido();

          // Mostra loading de transição para o reload
          WidgetUI.mostrarLoadingTransicao(
            "Cancelando pedido...",
            "Aguarde enquanto processamos o cancelamento. A página será recarregada."
          );

          // Mensagem final e reload
          WidgetUI.setStatus(mensagem, "success");
          setTimeout(function () {
            window.location.reload();
          }, 2000);
        } else {
          // Erro retornado pela API (Ex: Regra de negócio)
          WidgetUI.log("Erro API Cancelamento: " + mensagem, "error");
          WidgetUI.setStatus("Não foi possível cancelar: " + mensagem, "error");

          // Restaura botão
          if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = "Confirmar Cancelamento";
          }
        }
      })
      .catch(function (err) {
        // Erro de rede ou outro
        var erroMsg = err && err.message ? err.message : "Erro desconhecido";
        console.error("Erro ao cancelar:", err);
        WidgetUI.log("Erro ao chamar API de cancelamento: " + erroMsg, "error");
        WidgetUI.setStatus("Erro ao conectar com o servidor.", "error");

        // Restaura botão
        if (btnConfirmar) {
          btnConfirmar.disabled = false;
          btnConfirmar.textContent = "Confirmar Cancelamento";
        }
      });
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
    clonarPedido: clonarPedido,
    // Funções do modal de visualização
    fecharVisualizarPedido: fecharVisualizarPedido,
    editarPedidoVisualizacao: editarPedidoVisualizacao,
    clonarPedidoVisualizacao: clonarPedidoVisualizacao,
    cancelarPedidoVisualizacao: cancelarPedidoVisualizacao,
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
