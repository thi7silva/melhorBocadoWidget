/**
 * Widget de Pedidos - Módulo de Pedido
 * Edição, clonagem, geração e cancelamento de pedidos
 */

var WidgetPedido = (function () {
  "use strict";

  // Armazena o pedido sendo cancelado
  var pedidoCancelando = null;

  // ============================================
  // HELPERS
  // ============================================

  function setValorInput(id, valor) {
    var el = document.getElementById(id);
    if (el) el.value = valor || "";
  }

  function selecionarOpcaoCard(group, valor) {
    if (!valor) return;
    var cards = document.querySelectorAll(
      '.option-card[data-group="' + group + '"]',
    );
    cards.forEach(function (card) {
      if (card.getAttribute("data-value") === valor) {
        card.click();
      }
    });
  }

  function getSelectedOption(group) {
    var activeCard = document.querySelector(
      '.option-card.active[data-group="' + group + '"]',
    );
    return activeCard ? activeCard.getAttribute("data-value") : "";
  }

  /**
   * Transforma itens da API para formato do carrinho
   */
  function transformarItensEdicao(itensApi) {
    if (!Array.isArray(itensApi)) return [];

    return itensApi.map(function (item) {
      var precoUnitario = parseFloat(item.precoUnitario) || 0;
      var descontoUnitario = parseFloat(item.descontoUnitarioReal) || 0;

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
        Preco: precoUnitario,
        PrecoBase: parseFloat(item.precoBase) || 0,
        IPI: parseFloat(item.ipi) || 0,
        ST: parseFloat(item.st) || 0,
        precoBaseTabela:
          parseFloat(item.precoBaseTabela) || parseFloat(item.precoBase) || 0,
        ipiTabela: parseFloat(item.ipiTabela) || parseFloat(item.ipi) || 0,
        stTabela: parseFloat(item.stTabela) || parseFloat(item.st) || 0,
        precoTabela: precoTabela,
        descontoValor: descontoUnitario,
        descontoPercent: parseFloat(item.descontoPercentual) || 0,
        impostosRecalculados: item.impostosRecalculados,
        descontoAplicadoValor: descontoUnitario,
      };
    });
  }

  // ============================================
  // NOVO PEDIDO
  // ============================================

  /**
   * Inicia um novo pedido
   */
  function iniciarNovoPedido() {
    var state = WidgetApp.getState();
    var cliente = state.clienteSelecionado;
    if (!cliente) {
      WidgetUI.log("Nenhum cliente selecionado", "error");
      return;
    }

    WidgetApp.setState({
      etapaAtual: "pedido",
      modo: null,
      pedidoId: null,
    });

    WidgetProdutos.limparCarrinho();

    // Reset visual
    WidgetUI.setHeaderSubtitle("");
    var header = document.querySelector(".app-header");
    if (header) {
      header.classList.remove("header-edicao");
      var oldBadge = document.getElementById("badge-modo-edicao");
      if (oldBadge) oldBadge.remove();
    }

    setValorInput("numero-pedido-cliente", "");
    setValorInput("observacoes", "");
    setValorInput("endereco-entrega", "");

    WidgetEntrega.setDataSelecionadaManual(null);
    var obsEntrega = document.getElementById("observacoes-entrega");
    if (obsEntrega) obsEntrega.value = "";

    WidgetUI.log("Iniciando novo pedido para: " + cliente.Nome, "success");
    WidgetUI.esconderTelaListagem();
    WidgetUI.mostrarLoadingTransicao();

    // Se já temos os detalhes, usa direto
    if (state.clienteDetalhe) {
      WidgetClientes.processarDetalhesCliente(state.clienteDetalhe, cliente);
      return;
    }

    // Busca os detalhes
    if (state.online) {
      WidgetAPI.buscarDetalheCliente(cliente.ID)
        .then(function (detalhe) {
          WidgetClientes.processarDetalhesCliente(detalhe, cliente);
        })
        .catch(function (err) {
          WidgetUI.log("Erro ao buscar detalhes: " + err, "error");
          WidgetUI.mostrarEtapaPedido(cliente);
          WidgetUI.esconderLoadingTransicao();
          WidgetUI.setStatus("Erro ao carregar detalhes do cliente", "error");
          WidgetClientes.carregarCondicoesPagamento();
        });
    } else {
      WidgetUI.mostrarEtapaPedido(cliente);
      WidgetUI.esconderLoadingTransicao();
      WidgetClientes.carregarCondicoesPagamento();
    }
  }

  // ============================================
  // EDIÇÃO
  // ============================================

  /**
   * Carrega pedido para edição
   * @param {string} idPedido - ID do pedido
   */
  function carregarPedidoEdicao(idPedido) {
    WidgetApp.setState({
      modo: "editar",
      pedidoId: idPedido,
    });
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
   * Edita um pedido existente
   * @param {string} pedidoId - ID do pedido
   */
  function editarPedido(pedidoId) {
    WidgetUI.log("Iniciando edição do pedido: " + pedidoId);
    carregarPedidoEdicao(pedidoId);
  }

  /**
   * Processa dados do pedido para a interface de edição
   * @param {Object} data - Dados do pedido
   */
  function processarPedidoEdicao(data) {
    var clienteObj = data.cliente;
    var cliente = {
      ID: clienteObj.idCRM || clienteObj.id,
      Nome: clienteObj.nomeFantasia || clienteObj.razaoSocial,
      RazaoSocial: clienteObj.razaoSocial,
      NomeFantasia: clienteObj.nomeFantasia,
      CPF_CNPJ: clienteObj.cnpjCpf,
      Endereco: data.endereco.logradouro,
    };

    WidgetApp.setState({
      clienteSelecionado: cliente,
      clienteIdReal: clienteObj.id,
    });

    var detalheSimulado = {
      clienteRazaoSocial: cliente.RazaoSocial,
      clienteNomeFantasia: cliente.NomeFantasia,
      endereco: data.endereco.logradouro,
      bairro: data.endereco.bairro,
      municipio: data.endereco.municipio,
      estado: data.endereco.estado,
      cep: data.endereco.cep,
      complemento: data.endereco.complemento,
      vendedorNome: data.vendedor.nome,
      vendedorID: data.vendedor.id,
      pagamentoCondicaoID: data.configuracao.condicaoPagamentoId,
      pagamentoCondicaoCodigo: data.configuracao.condicaoPagamentoCodigo,
      pagamentoCondicaoDescricao: data.configuracao.condicaoPagamentoNome,
      tipoFrete: data.configuracao.tipoFrete,
      transportadoraID: data.configuracao.transportadoraId,
      transportadoraRazao: data.configuracao.transportadoraRazao,
      janelaEntrega: data.entrega.janelaEntrega || [],
      horaInicio1: data.entrega.horaInicio1,
      horaFim1: data.entrega.horaFim1,
      horaInicio2: data.entrega.horaInicio2,
      horaFim2: data.entrega.horaFim2,
      listaFeriados: [],
    };

    WidgetApp.setState({ clienteDetalhe: detalheSimulado });

    WidgetUI.mostrarEtapaPedido(cliente);
    WidgetUI.preencherDetalheCliente(detalheSimulado);

    var vEl = document.getElementById("vendedor-nome");
    if (vEl && detalheSimulado.vendedorNome)
      vEl.textContent = detalheSimulado.vendedorNome;

    // Popula carrinho
    var itensCarrinho = transformarItensEdicao(data.itens);
    WidgetProdutos.setClienteId(clienteObj.id);
    WidgetProdutos.setLoteMinimo(clienteObj.municipioLoteMinimo || 0);
    WidgetProdutos.setCarrinho(itensCarrinho);

    // Configurações
    WidgetClientes.carregarCondicoesPagamentoComSelecao(
      data.configuracao.condicaoPagamentoId,
    );

    if (data.configuracao.tipoFrete) {
      WidgetUI.selecionarFreteAutomatico(data.configuracao.tipoFrete, true);
    }

    selecionarOpcaoCard("natureza", data.configuracao.natureza);
    setValorInput(
      "numero-pedido-cliente",
      data.configuracao.numeroPedidoCliente,
    );
    setValorInput("observacoes", data.configuracao.observacoesGerais);
    setValorInput("endereco-entrega", data.endereco.observacaoEntrega);

    // Data de entrega
    if (data.entrega && data.entrega.dataISO) {
      WidgetEntrega.setDataSelecionadaManual({
        dataFormatada: data.entrega.dataFormatada,
        dataISO: data.entrega.dataISO,
        diaSemana: data.entrega.diaSemana,
      });
      var obsEntrega = document.getElementById("observacoes-entrega");
      if (obsEntrega) obsEntrega.value = data.entrega.observacoes || "";
    }

    // Badge de edição
    WidgetUI.setHeaderSubtitle("Atualização de Pedido");
    var header = document.querySelector(".app-header");
    if (header) {
      header.classList.add("header-edicao");

      var oldBadge = document.getElementById("badge-modo-edicao");
      if (oldBadge) oldBadge.remove();

      var badge = document.createElement("div");
      badge.id = "badge-modo-edicao";
      badge.className = "badge-edicao";

      var numProtheus =
        data.numeroPedidoProtheus ||
        data.configuracao.numeroPedidoProtheus ||
        "-";
      var numCRM =
        data.numeroPedidoCRM || data.configuracao.numeroPedidoCRM || "";

      var html = "EDIÇÃO <span>" + numProtheus + "</span>";
      if (numCRM) {
        html +=
          "<span style='margin-left:8px; padding-left:8px; border-left:1px solid rgba(255,255,255,0.3)'>" +
          numCRM +
          "</span>";
      }

      badge.innerHTML = html;
      header.appendChild(badge);
    }

    WidgetUI.switchTab("produtos");
    WidgetUI.esconderTelaListagem();
    WidgetUI.hideStatus();

    if (data.entrega && data.entrega.janelaEntrega) {
      WidgetEntrega.setJanelaEntrega(data.entrega.janelaEntrega);
    }

    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
  }

  // ============================================
  // CLONAGEM
  // ============================================

  /**
   * Clona um pedido existente
   * @param {string} pedidoId - ID do pedido
   */
  function clonarPedido(pedidoId) {
    WidgetUI.log("Iniciando clonagem do pedido: " + pedidoId);
    WidgetApp.setState({
      modo: "clonar",
      pedidoId: null,
      pedidoClonadoId: pedidoId,
    });

    WidgetUI.mostrarLoadingTransicao(
      "Clonando Pedido",
      "Carregando dados e preparando novo pedido...",
    );

    var delayPromise = new Promise(function (resolve) {
      setTimeout(resolve, 1000);
    });

    Promise.all([WidgetAPI.buscarDetalhesPedido(pedidoId), delayPromise])
      .then(function (results) {
        var detalhes = results[0];
        WidgetUI.log("Detalhes do pedido recebidos para clonagem", "success");
        processarPedidoClonar(detalhes);
        WidgetUI.esconderLoadingTransicao();
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao carregar pedido: " + err, "error");
        WidgetUI.esconderLoadingTransicao();
        WidgetUI.setStatus("Erro ao carregar pedido.", "error");
      });
  }

  /**
   * Processa dados do pedido para clonagem
   * Similar ao processarPedidoEdicao mas limpa campos específicos
   * @param {Object} data - Dados do pedido
   */
  function processarPedidoClonar(data) {
    var clienteObj = data.cliente;
    var cliente = {
      ID: clienteObj.idCRM || clienteObj.id,
      Nome: clienteObj.nomeFantasia || clienteObj.razaoSocial,
      RazaoSocial: clienteObj.razaoSocial,
      NomeFantasia: clienteObj.nomeFantasia,
      CPF_CNPJ: clienteObj.cnpjCpf,
      Endereco: data.endereco.logradouro,
    };

    WidgetApp.setState({
      clienteSelecionado: cliente,
      clienteIdReal: clienteObj.id,
    });

    var detalheSimulado = {
      clienteRazaoSocial: cliente.RazaoSocial,
      clienteNomeFantasia: cliente.NomeFantasia,
      endereco: data.endereco.logradouro,
      bairro: data.endereco.bairro,
      municipio: data.endereco.municipio,
      estado: data.endereco.estado,
      cep: data.endereco.cep,
      complemento: data.endereco.complemento,
      vendedorNome: data.vendedor.nome,
      vendedorID: data.vendedor.id,
      pagamentoCondicaoID: data.configuracao.condicaoPagamentoId,
      pagamentoCondicaoCodigo: data.configuracao.condicaoPagamentoCodigo,
      tipoFrete: data.configuracao.tipoFrete,
      transportadoraID: data.configuracao.transportadoraId,
      transportadoraRazao: data.configuracao.transportadoraRazao,
      janelaEntrega: data.entrega.janelaEntrega || [],
      horaInicio1: data.entrega.horaInicio1,
      horaFim1: data.entrega.horaFim1,
      horaInicio2: data.entrega.horaInicio2,
      horaFim2: data.entrega.horaFim2,
      listaFeriados: [],
    };

    WidgetApp.setState({ clienteDetalhe: detalheSimulado });

    WidgetUI.mostrarEtapaPedido(cliente);
    WidgetUI.preencherDetalheCliente(detalheSimulado);

    var vEl = document.getElementById("vendedor-nome");
    if (vEl && detalheSimulado.vendedorNome)
      vEl.textContent = detalheSimulado.vendedorNome;

    var itensCarrinho = transformarItensEdicao(data.itens);
    WidgetProdutos.setClienteId(clienteObj.id);
    WidgetProdutos.setLoteMinimo(clienteObj.municipioLoteMinimo || 0);
    WidgetProdutos.setCarrinho(itensCarrinho);

    WidgetClientes.carregarCondicoesPagamentoComSelecao(
      data.configuracao.condicaoPagamentoId,
    );

    if (data.configuracao.tipoFrete) {
      WidgetUI.selecionarFreteAutomatico(data.configuracao.tipoFrete, true);
    }

    selecionarOpcaoCard("natureza", data.configuracao.natureza);

    // LIMPA campos para novo pedido
    setValorInput("numero-pedido-cliente", "");
    setValorInput("observacoes", "");
    setValorInput("endereco-entrega", "");
    var obsEntrega = document.getElementById("observacoes-entrega");
    if (obsEntrega) obsEntrega.value = "";

    if (data.entrega && data.entrega.janelaEntrega) {
      WidgetEntrega.setJanelaEntrega(data.entrega.janelaEntrega);
    }

    WidgetUI.switchTab("config");
    WidgetUI.esconderTelaListagem();
    WidgetUI.hideStatus();

    setTimeout(function () {
      WidgetEntrega.renderizarPreviewDatas();
    }, 100);
  }

  // ============================================
  // GERAÇÃO DE PEDIDO
  // ============================================

  /**
   * Finaliza o pedido com data de entrega
   * @param {Object} dataEntrega - Dados da data de entrega
   * @param {string} observacoesEntrega - Observações de entrega
   * @param {Object} resultadoAprovacao - Resultado da verificação de aprovação
   * @param {boolean} isDraft - Se é rascunho
   */
  function finalizarPedidoComEntrega(
    dataEntrega,
    observacoesEntrega,
    resultadoAprovacao,
    isDraft,
  ) {
    isDraft = isDraft === true;
    var state = WidgetApp.getState();

    WidgetUI.log(
      "Finalizando pedido " +
        (isDraft ? "(RASCUNHO) " : "") +
        "com entrega em: " +
        dataEntrega.dataFormatada,
      "success",
    );

    var carrinho = WidgetProdutos.getCarrinho();
    var descontoState = WidgetProdutos.getDescontoState();

    // Cálculos de totais
    var subtotalBruto = 0;
    var subtotalTabela = 0;
    var totalDescontoItens = 0;
    var totalIPI = 0;
    var totalST = 0;
    var totalIPITabela = 0;
    var totalSTTabela = 0;

    var itensFormatados = carrinho.map(function (item) {
      var precoBaseTabela = item.precoBaseTabela || item.PrecoBase || 0;
      var ipiTabela = item.ipiTabela || item.IPI || 0;
      var stTabela = item.stTabela || item.ST || 0;
      var precoTabela = item.precoTabela || item.Preco || 0;
      var subtotalTabelaItem = precoTabela * item.Quantidade;
      var subtotalAtualItem = item.Preco * item.Quantidade;

      var subtotalLiquido;
      var descontoRealItem;

      if (item.impostosRecalculados && item.descontoAplicadoValor > 0) {
        subtotalLiquido = subtotalAtualItem;
        descontoRealItem = subtotalTabelaItem - subtotalAtualItem;
      } else {
        var descontoPendente = (item.descontoValor || 0) * item.Quantidade;
        subtotalLiquido = subtotalTabelaItem - descontoPendente;
        descontoRealItem = descontoPendente;
      }

      var descontoUnitarioReal = descontoRealItem / item.Quantidade;
      var descontoPercentCalculado = 0;
      if (precoTabela > 0) {
        descontoPercentCalculado = (descontoUnitarioReal / precoTabela) * 100;
      }

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
        precoUnitario: item.Preco,
        precoBase: item.PrecoBase || item.Preco,
        ipi: item.IPI || 0,
        st: item.ST || 0,
        precoBaseTabela: precoBaseTabela,
        ipiTabela: ipiTabela,
        stTabela: stTabela,
        precoTabela: precoTabela,
        descontoPendente: item.descontoValor || 0,
        descontoAplicado: item.descontoAplicadoValor || 0,
        descontoUnitarioReal: Math.round(descontoUnitarioReal * 100) / 100,
        descontoPercentual: Math.round(descontoPercentCalculado * 100) / 100,
        descontoTotal: descontoRealItem,
        impostosRecalculados: item.impostosRecalculados || false,
        subtotalBruto: subtotalAtualItem,
        subtotalTabela: subtotalTabelaItem,
        subtotalLiquido: subtotalLiquido,
      };
    });

    var totalFinal = subtotalTabela - totalDescontoItens;
    var descontoPercentualGeral = 0;
    if (subtotalTabela > 0) {
      descontoPercentualGeral = (totalDescontoItens / subtotalTabela) * 100;
    }

    var dadosPedido = {
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
      vendedor: {
        id: state.clienteDetalhe?.vendedorID || "",
        nome: state.clienteDetalhe?.vendedorNome || "",
        email: state.loginUser || "",
      },
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
      entrega: {
        dataFormatada: dataEntrega.dataFormatada,
        dataISO: dataEntrega.dataISO,
        diaSemana: dataEntrega.nomeDia,
        observacoes: observacoesEntrega || "",
        janelaEntrega: state.clienteDetalhe?.janelaEntrega || [],
        horaInicio1: state.clienteDetalhe?.horaInicio1 || "",
        horaFim1: state.clienteDetalhe?.horaFim1 || "",
        horaInicio2: state.clienteDetalhe?.horaInicio2 || "",
        horaFim2: state.clienteDetalhe?.horaFim2 || "",
      },
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
      itens: itensFormatados,
      totais: {
        quantidadeItens: carrinho.length,
        subtotalBruto: Math.round(subtotalBruto * 100) / 100,
        totalIPI: Math.round(totalIPI * 100) / 100,
        totalST: Math.round(totalST * 100) / 100,
        subtotalTabela: Math.round(subtotalTabela * 100) / 100,
        totalIPITabela: Math.round(totalIPITabela * 100) / 100,
        totalSTTabela: Math.round(totalSTTabela * 100) / 100,
        descontoItensValor: Math.round(totalDescontoItens * 100) / 100,
        descontoGlobalValor:
          Math.round((descontoState.totalDescontoGlobal || 0) * 100) / 100,
        descontoTotalValor:
          Math.round(
            (totalDescontoItens + (descontoState.totalDescontoGlobal || 0)) *
              100,
          ) / 100,
        descontoItensPercentual:
          Math.round(descontoPercentualGeral * 100) / 100,
        descontoTotalPercentual:
          Math.round(descontoPercentualGeral * 100) / 100,
        totalFinal: Math.round(totalFinal * 100) / 100,
      },
      meta: {
        dataGeracao: new Date().toISOString(),
        origemWidget: "melhor-bocado-pedido",
        versao: "1.0.0",
      },
      aprovacaoPedido:
        resultadoAprovacao && resultadoAprovacao.precisaAprovacao
          ? true
          : false,
      motivosAprovacao:
        resultadoAprovacao && resultadoAprovacao.precisaAprovacao
          ? resultadoAprovacao.motivos
          : [],
      isDraft: isDraft,
    };

    // Modo edição
    if (state.modo === "editar" && state.pedidoId) {
      dadosPedido.idPedido = state.pedidoId;
    }

    WidgetUI.log("Enviando pedido para API...", "success");

    WidgetAPI.criarPedido(dadosPedido)
      .then(function (response) {
        console.log("✅ Pedido criado com sucesso!");

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
        if (numeroPedidoEl && response && response.numeroPedido) {
          numeroPedidoEl.textContent = response.numeroPedido;
          numeroPedidoEl.parentElement.style.display = "block";
        }

        // Atualiza modal
        var modalTitulo = document.getElementById("sucesso-titulo");
        var modalMsg = document.getElementById("sucesso-mensagem-texto");
        var btnSucesso = document.querySelector(".sucesso-btn");

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
        } else {
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
        }

        if (btnSucesso) {
          btnSucesso.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            ${state.modo === "editar" ? "Voltar ao Início" : "Criar Novo Pedido"}
          `;
        }

        // Lista de produtos no modal
        var listaProdutosEl = document.getElementById("sucesso-produtos-lista");
        var carrinhoParaExibir = WidgetProdutos.getCarrinho();

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

        WidgetUI.abrirModal("modal-sucesso");
        WidgetUI.log("Pedido enviado com sucesso!", "success");
      })
      .catch(function (error) {
        console.error("❌ Erro ao criar pedido:", error);
        WidgetUI.log("Erro ao enviar pedido: " + error, "error");
        alert(
          "Erro ao enviar pedido. Por favor, tente novamente.\n\nDetalhes: " +
            (error.message || error),
        );
      });

    return dadosPedido;
  }

  // ============================================
  // CANCELAMENTO
  // ============================================

  /**
   * Abre modal de cancelamento
   * @param {string} pedidoId - ID do pedido
   * @param {string} numeroPedido - Número para exibição
   * @param {string} valorTotal - Valor formatado
   */
  function abrirModalCancelarPedido(pedidoId, numeroPedido, valorTotal) {
    WidgetUI.log("Abrindo modal de cancelamento para pedido: " + pedidoId);

    var state = WidgetApp.getState();
    var nomeCliente = state.clienteSelecionado
      ? state.clienteSelecionado.Nome
      : "";
    if (!nomeCliente) {
      var clienteEl = document.getElementById("listagem-cliente-nome");
      if (clienteEl) nomeCliente = clienteEl.textContent;
    }

    pedidoCancelando = {
      id: pedidoId,
      numero: numeroPedido,
      valor: valorTotal,
      cliente: nomeCliente,
    };

    var identificacaoEl = document.getElementById(
      "cancelar-pedido-identificacao",
    );
    if (identificacaoEl) {
      if (numeroPedido && numeroPedido.trim() !== "") {
        identificacaoEl.textContent = numeroPedido;
      } else {
        identificacaoEl.textContent =
          nomeCliente + " - " + (valorTotal || "R$ 0,00");
      }
    }

    var motivoEl = document.getElementById("cancelar-motivo");
    if (motivoEl) {
      motivoEl.value = "";
      motivoEl.classList.remove("input-error");
    }

    var erroEl = document.getElementById("cancelar-motivo-erro");
    if (erroEl) {
      erroEl.style.display = "none";
    }

    WidgetUI.abrirModal("modal-cancelar-pedido");
  }

  /**
   * Fecha modal de cancelamento
   */
  function fecharModalCancelarPedido() {
    WidgetUI.fecharModal("modal-cancelar-pedido");
    pedidoCancelando = null;
  }

  /**
   * Confirma cancelamento do pedido
   */
  function confirmarCancelamentoPedido() {
    var motivoEl = document.getElementById("cancelar-motivo");
    var erroEl = document.getElementById("cancelar-motivo-erro");
    var btnConfirmar = document.getElementById("btn-confirmar-cancelar-pedido");

    var motivo = motivoEl ? motivoEl.value.trim() : "";

    if (!motivo) {
      if (erroEl) erroEl.style.display = "flex";
      if (motivoEl) {
        motivoEl.focus();
        motivoEl.classList.add("input-error");
      }
      return;
    }

    if (motivoEl) motivoEl.classList.remove("input-error");
    if (erroEl) erroEl.style.display = "none";

    if (btnConfirmar) {
      btnConfirmar.disabled = true;
      btnConfirmar.innerHTML =
        '<span class="loading-spinner-mini"></span> Processando...';
    }

    var state = WidgetApp.getState();
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

    WidgetAPI.cancelarPedido(idPedido, usuario, motivo)
      .then(function (response) {
        var sucesso =
          response &&
          (response.success === true || response.success === "true");
        var mensagem = response
          ? response.message || "Operação realizada"
          : "Sem resposta da API";

        if (sucesso) {
          WidgetUI.log("Pedido cancelado: " + mensagem, "success");
          fecharModalCancelarPedido();

          WidgetUI.mostrarLoadingTransicao(
            "Cancelando pedido...",
            "Aguarde enquanto processamos o cancelamento. A página será recarregada.",
          );

          WidgetUI.setStatus(mensagem, "success");
          setTimeout(function () {
            window.location.reload();
          }, 2000);
        } else {
          WidgetUI.log("Erro API Cancelamento: " + mensagem, "error");
          WidgetUI.setStatus("Não foi possível cancelar: " + mensagem, "error");

          if (btnConfirmar) {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = "Confirmar Cancelamento";
          }
        }
      })
      .catch(function (err) {
        var erroMsg = err && err.message ? err.message : "Erro desconhecido";
        console.error("Erro ao cancelar:", err);
        WidgetUI.log("Erro ao chamar API de cancelamento: " + erroMsg, "error");
        WidgetUI.setStatus("Erro ao conectar com o servidor.", "error");

        if (btnConfirmar) {
          btnConfirmar.disabled = false;
          btnConfirmar.textContent = "Confirmar Cancelamento";
        }
      });
  }

  // API Pública
  return {
    iniciarNovoPedido: iniciarNovoPedido,
    editarPedido: editarPedido,
    clonarPedido: clonarPedido,
    finalizarPedidoComEntrega: finalizarPedidoComEntrega,
    abrirModalCancelarPedido: abrirModalCancelarPedido,
    fecharModalCancelarPedido: fecharModalCancelarPedido,
    confirmarCancelamentoPedido: confirmarCancelamentoPedido,
    // Helpers expostos
    getSelectedOption: getSelectedOption,
    setValorInput: setValorInput,
    selecionarOpcaoCard: selecionarOpcaoCard,
  };
})();
