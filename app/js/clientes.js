/**
 * Widget de Pedidos - Módulo de Clientes
 * Gerencia busca, seleção e processamento de dados do cliente
 */

var WidgetClientes = (function () {
  "use strict";

  /**
   * Busca clientes na API
   * @param {string} query - Termo de busca
   * @param {string} [type] - Tipo de busca (opcional)
   */
  function searchClients(query, type) {
    WidgetUI.log("Buscando clientes: " + query);
    WidgetUI.setStatus("Buscando clientes...", "loading");

    var state = WidgetApp.getState();
    var email = state.loginUser || "";
    type = type || "";

    if (state.online) {
      WidgetAPI.buscarClientes(query, type, email)
        .then(function (clientes) {
          WidgetApp.setState({ clientes: clientes });
          WidgetUI.renderClientList(clientes);
          WidgetUI.hideStatus();
          WidgetUI.log(
            "Encontrados " + clientes.length + " clientes",
            "success",
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
   * Usa clientes mock (fallback offline)
   */
  function useMockClients(query) {
    var mockClientes = WidgetConfig.MOCK.CLIENTES.filter(function (c) {
      return c.Nome.toLowerCase().indexOf(query.toLowerCase()) >= 0;
    });
    WidgetApp.setState({ clientes: mockClientes });
    WidgetUI.renderClientList(mockClientes);
    WidgetUI.hideStatus();
  }

  /**
   * Carrega condições de pagamento da API
   */
  function carregarCondicoesPagamento() {
    var state = WidgetApp.getState();
    if (state.online) {
      WidgetAPI.buscarCondicoesPagamento()
        .then(function (condicoes) {
          WidgetUI.log(
            "Condições de pagamento carregadas: " + condicoes.length,
          );
          WidgetUI.renderPaymentConditions(condicoes);
        })
        .catch(function (err) {
          WidgetUI.log("Erro ao buscar condições de pgto: " + err, "error");
        });
    } else {
      var mockCondicoes = [
        { ID: "1", Display: "À Vista (Mock)" },
        { ID: "2", Display: "30 Dias (Mock)" },
      ];
      WidgetUI.renderPaymentConditions(mockCondicoes);
    }
  }

  /**
   * Carrega condições de pagamento com pré-seleção
   * @param {string} condicaoID - ID da condição a ser selecionada
   */
  function carregarCondicoesPagamentoComSelecao(condicaoID) {
    var state = WidgetApp.getState();
    if (state.online) {
      WidgetAPI.buscarCondicoesPagamento()
        .then(function (condicoes) {
          WidgetUI.log(
            "Condições de pagamento carregadas: " + condicoes.length,
          );
          WidgetUI.renderPaymentConditions(condicoes, condicaoID);
        })
        .catch(function (err) {
          WidgetUI.log("Erro ao buscar condições de pgto: " + err, "error");
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
   * Seleciona cliente e mostra tela de listagem de pedidos
   * @param {Object} cliente - Dados do cliente
   */
  function selecionarCliente(cliente) {
    var state = WidgetApp.getState();
    WidgetApp.setState({
      clienteSelecionado: cliente,
      etapaAtual: "listagem",
    });

    WidgetUI.log("Cliente selecionado: " + cliente.Nome, "success");
    WidgetUI.mostrarTelaListagem(cliente);

    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          WidgetUI.log("Detalhes do cliente carregados", "success");

          WidgetApp.setState({
            clienteDetalhe: detalhe,
            clienteIdReal: detalhe.id,
          });

          WidgetUI.log("ID real do cliente: " + detalhe.id);
          return WidgetAPI.listarPedidosCliente(detalhe.id);
        })
        .then(function (pedidos) {
          WidgetUI.log("Pedidos carregados: " + pedidos.length, "success");

          if (Array.isArray(pedidos)) {
            pedidos.reverse();
          }

          WidgetApp.setState({ pedidosCliente: pedidos });
          WidgetUI.renderizarListagemPedidos(pedidos);
        })
        .catch(function (err) {
          WidgetUI.log("Erro ao carregar pedidos: " + err, "error");
          WidgetUI.renderizarListagemPedidos([]);
        });
    } else {
      WidgetUI.renderizarListagemPedidos([]);
    }
  }

  /**
   * Processa detalhes do cliente e mostra tela de pedido
   * @param {Object} detalhe - Detalhes vindos da API
   * @param {Object} cliente - Dados básicos do cliente
   */
  function processarDetalhesCliente(detalhe, cliente) {
    WidgetApp.setState({
      clienteDetalhe: detalhe,
      clienteIdReal: detalhe.id,
    });

    WidgetProdutos.setClienteId(detalhe.id);

    // Atualiza dados do cliente
    if (detalhe.clienteRazaoSocial) {
      cliente.RazaoSocial = detalhe.clienteRazaoSocial;
    }
    if (detalhe.clienteNomeFantasia) {
      cliente.NomeFantasia = detalhe.clienteNomeFantasia;
      cliente.Nome = detalhe.clienteNomeFantasia || cliente.Nome;
    }

    WidgetApp.setState({ clienteSelecionado: cliente });
    WidgetUI.preencherDetalheCliente(detalhe);

    // Atualiza vendedor no header
    if (detalhe.vendedorNome) {
      var vendedorNome = document.getElementById("vendedor-nome");
      if (vendedorNome) {
        vendedorNome.textContent = detalhe.vendedorNome;
      }
    }

    // Configura módulos
    WidgetEntrega.setJanelaEntrega(detalhe.janelaEntrega);
    WidgetEntrega.setListaFeriados(detalhe.listaFeriados);
    WidgetProdutos.setLoteMinimo(detalhe.municipioLoteMinimo);

    carregarCondicoesPagamentoComSelecao(detalhe.pagamentoCondicaoID);

    // Seleciona frete automaticamente
    if (detalhe.tipoFrete) {
      var tipoFrete = detalhe.tipoFrete.toLowerCase();
      if (tipoFrete.indexOf("cif") >= 0) {
        WidgetUI.selecionarFreteAutomatico("cif", true);
      } else if (tipoFrete.indexOf("fob") >= 0) {
        WidgetUI.selecionarFreteAutomatico("fob", true);
      }
    }

    WidgetUI.mostrarEtapaPedido(cliente);
    WidgetUI.esconderLoadingTransicao();

    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
  }

  /**
   * Seleciona cliente e avança direto para pedido (modo legado)
   * @param {Object} cliente - Dados do cliente
   */
  function selecionarClienteDireto(cliente) {
    WidgetApp.setState({
      clienteSelecionado: cliente,
      etapaAtual: "pedido",
    });

    WidgetUI.log("Cliente selecionado (direto): " + cliente.Nome, "success");
    WidgetUI.mostrarLoadingTransicao();

    var state = WidgetApp.getState();
    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          WidgetUI.log("Detalhes do cliente carregados", "success");

          WidgetApp.setState({
            clienteDetalhe: detalhe,
            clienteIdReal: detalhe.id,
          });

          WidgetProdutos.setClienteId(detalhe.id);

          if (detalhe.clienteRazaoSocial) {
            cliente.RazaoSocial = detalhe.clienteRazaoSocial;
          }
          if (detalhe.clienteNomeFantasia) {
            cliente.NomeFantasia = detalhe.clienteNomeFantasia;
            cliente.Nome = detalhe.clienteNomeFantasia || cliente.Nome;
          }

          WidgetApp.setState({ clienteSelecionado: cliente });
          WidgetUI.preencherDetalheCliente(detalhe);

          if (detalhe.vendedorNome) {
            var vendedorNome = document.getElementById("vendedor-nome");
            if (vendedorNome) {
              vendedorNome.textContent = detalhe.vendedorNome;
            }
          }

          WidgetEntrega.setJanelaEntrega(detalhe.janelaEntrega);
          WidgetEntrega.setListaFeriados(detalhe.listaFeriados);
          WidgetProdutos.setLoteMinimo(detalhe.municipioLoteMinimo);

          carregarCondicoesPagamentoComSelecao(detalhe.pagamentoCondicaoID);

          if (detalhe.tipoFrete) {
            var tipoFrete = detalhe.tipoFrete.toLowerCase();
            if (tipoFrete.indexOf("cif") >= 0) {
              WidgetUI.selecionarFreteAutomatico("cif", true);
            } else if (tipoFrete.indexOf("fob") >= 0) {
              WidgetUI.selecionarFreteAutomatico("fob", true);
            }
          }

          WidgetUI.mostrarEtapaPedido(cliente);
          WidgetUI.esconderLoadingTransicao();

          setTimeout(function () {
            WidgetEntrega.renderizarPreviewDatas();
          }, 100);
        })
        .catch(function (err) {
          WidgetUI.log("Erro ao buscar detalhes: " + err, "error");
          WidgetUI.mostrarEtapaPedido(cliente);
          WidgetUI.esconderLoadingTransicao();
          WidgetUI.setStatus("Erro ao carregar detalhes do cliente", "error");
          carregarCondicoesPagamento();
        });
    } else {
      WidgetUI.mostrarEtapaPedido(cliente);
      WidgetUI.esconderLoadingTransicao();
      carregarCondicoesPagamento();
    }
  }

  // API Pública
  return {
    searchClients: searchClients,
    selecionarCliente: selecionarCliente,
    selecionarClienteDireto: selecionarClienteDireto,
    processarDetalhesCliente: processarDetalhesCliente,
    carregarCondicoesPagamento: carregarCondicoesPagamento,
    carregarCondicoesPagamentoComSelecao: carregarCondicoesPagamentoComSelecao,
  };
})();
