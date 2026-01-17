/**
 * Widget de Pedidos - Módulo de Visualização
 * Modal de visualização de pedidos (somente leitura)
 */

var WidgetVisualizacao = (function () {
  "use strict";

  // ============================================
  // ÍCONES SVG PARA STATUS
  // ============================================

  var STATUS_ICONS = {
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

  // ============================================
  // HELPERS DE FORMATAÇÃO
  // ============================================

  function formatarCpfCnpj(doc) {
    if (!doc) return "-";
    var numeros = doc.replace(/\D/g, "");
    if (numeros.length === 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (numeros.length === 14) {
      return numeros.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
    return doc;
  }

  function montarEnderecoCompleto(endereco) {
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

  function montarJanelaEntrega(entrega) {
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

  // ============================================
  // HELPERS DE STATUS
  // ============================================

  function getStatusClass(status) {
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

  function getStatusIcon(statusClass) {
    return STATUS_ICONS[statusClass] || STATUS_ICONS["status-rascunho"];
  }

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  function renderizarTimeline(status) {
    var statusClass = getStatusClass(status);
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

    // Não mostra timeline para cancelado/erro
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

  function renderizarProdutos(itens) {
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
      var imagemUrl = "";
      if (item.imagemProduto && item.imagemProduto.trim()) {
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

  // ============================================
  // FUNÇÕES PRINCIPAIS
  // ============================================

  /**
   * Visualiza um pedido existente (somente leitura)
   * @param {string} pedidoId - ID do pedido
   */
  function visualizarPedido(pedidoId) {
    WidgetUI.log("Carregando visualização do pedido: " + pedidoId);

    var state = WidgetApp.getState();
    var pedidoLista = null;
    if (state.pedidosCliente && Array.isArray(state.pedidosCliente)) {
      pedidoLista = state.pedidosCliente.find(function (p) {
        return String(p.pedidoId) === String(pedidoId);
      });
    }

    WidgetUI.setStatus("Carregando pedido...", "loading");

    WidgetAPI.buscarDetalhesPedido(pedidoId)
      .then(function (detalhes) {
        WidgetUI.log(
          "Detalhes do pedido recebidos para visualização",
          "success",
        );

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
   * @param {string} idOriginal - ID do pedido
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
    var statusClass = getStatusClass(data.status);
    var statusIcon = getStatusIcon(statusClass);
    statusBadge.className = "vis-status-badge " + statusClass;
    statusBadge.querySelector(".status-icon").innerHTML = statusIcon;
    statusBadge.querySelector(".status-text").textContent = data.status || "-";

    // Timeline
    renderizarTimeline(data.status);

    // Cliente
    document.getElementById("vis-cliente-nome").textContent =
      data.cliente?.nomeFantasia || "-";
    document.getElementById("vis-cliente-razao").textContent =
      data.cliente?.razaoSocial || "-";
    document.getElementById("vis-cliente-cnpj").textContent =
      formatarCpfCnpj(data.cliente?.cnpjCpf) || "-";

    var enderecoCompleto = montarEnderecoCompleto(data.endereco);
    document.getElementById("vis-cliente-endereco").textContent =
      enderecoCompleto;

    // Entrega
    document.getElementById("vis-data-entrega").textContent =
      data.entrega?.dataFormatada || "-";

    var janelaTexto = montarJanelaEntrega(data.entrega);
    document.getElementById("vis-janela-entrega").textContent = janelaTexto;

    // Observações de entrega
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

    // Observações gerais
    var obsGerais = data.configuracao?.observacoesGerais || "";
    var obsGeraisRow = document.getElementById("vis-obs-gerais-row");
    if (obsGerais && obsGerais.trim()) {
      document.getElementById("vis-obs-gerais").textContent = obsGerais;
      obsGeraisRow.style.display = "flex";
    } else {
      obsGeraisRow.style.display = "none";
    }

    // Produtos
    renderizarProdutos(data.itens || []);

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

    // Botões de Ação
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

    // Armazena dados para as ações
    var idFinal = idOriginal || data.idPedido || data.pedidoID || data.id;
    WidgetApp.setState({
      pedidoVisualizando: {
        id: idFinal,
        numero:
          data.numeroPedidoProtheus || data.configuracao?.numeroPedidoProtheus,
        total: WidgetUI.formatarMoeda(total),
      },
    });

    WidgetUI.abrirModal("modal-visualizar-pedido");
  }

  /**
   * Fecha o modal de visualização
   */
  function fecharVisualizarPedido() {
    WidgetUI.fecharModal("modal-visualizar-pedido");
    WidgetApp.setState({ pedidoVisualizando: null });
  }

  /**
   * Edita o pedido a partir da visualização
   */
  function editarPedidoVisualizacao() {
    var state = WidgetApp.getState();
    if (state.pedidoVisualizando) {
      var id = state.pedidoVisualizando.id;
      fecharVisualizarPedido();
      WidgetPedido.editarPedido(id);
    }
  }

  /**
   * Clona o pedido a partir da visualização
   */
  function clonarPedidoVisualizacao() {
    var state = WidgetApp.getState();
    if (state.pedidoVisualizando) {
      var id = state.pedidoVisualizando.id;
      fecharVisualizarPedido();
      WidgetPedido.clonarPedido(id);
    }
  }

  /**
   * Cancela o pedido a partir da visualização
   */
  function cancelarPedidoVisualizacao() {
    var state = WidgetApp.getState();
    if (state.pedidoVisualizando) {
      var pedido = state.pedidoVisualizando;
      fecharVisualizarPedido();
      WidgetPedido.abrirModalCancelarPedido(
        pedido.id,
        pedido.numero,
        pedido.total,
      );
    }
  }

  // API Pública
  return {
    visualizarPedido: visualizarPedido,
    fecharVisualizarPedido: fecharVisualizarPedido,
    editarPedidoVisualizacao: editarPedidoVisualizacao,
    clonarPedidoVisualizacao: clonarPedidoVisualizacao,
    cancelarPedidoVisualizacao: cancelarPedidoVisualizacao,
    // Expõe helpers para uso em outros módulos
    getStatusClass: getStatusClass,
    getStatusIcon: getStatusIcon,
    formatarCpfCnpj: formatarCpfCnpj,
  };
})();
