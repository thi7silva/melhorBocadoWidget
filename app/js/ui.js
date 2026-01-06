/**
 * Widget de Pedidos - Funções de UI
 * Arquivo: app/js/ui.js
 *
 * Funções para manipulação do DOM e interface do usuário.
 */

var WidgetUI = (function () {
  "use strict";

  // Cache de elementos DOM
  var elements = {};

  /**
   * Inicializa o cache de elementos DOM
   */
  function init() {
    elements = {
      // Status e Debug
      status: document.getElementById("status"),
      alertTitle: document.querySelector("#status .alert-title"),
      alertMessage: document.querySelector("#status .alert-message"),
      alertIcon: document.querySelector("#status .alert-icon"),
      debug: document.getElementById("debug"),
      debugPanel: document.getElementById("debug-panel"),
      headerSubtitle: document.getElementById("header-subtitle"),

      // Etapa 1: Seleção de Cliente
      stepCliente: document.getElementById("step-cliente"),
      searchInput: document.getElementById("search-cliente"),
      clientList: document.getElementById("client-list"),

      // Etapa 2: Pedido
      stepPedido: document.getElementById("step-pedido"),
      clienteAvatarLg: document.getElementById("cliente-avatar-lg"),
      clienteRazao: document.getElementById("cliente-razao"),
      clienteFantasia: document.getElementById("cliente-fantasia"),
      clienteDocumento: document.getElementById("cliente-documento"),
    };

    // Setup do campo de busca
    if (elements.searchInput) {
      elements.searchInput.addEventListener(
        "input",
        debounce(handleSearch, 400)
      );
    }
  }

  /**
   * Debounce helper
   */
  function debounce(func, wait) {
    var timeout;
    return function () {
      var context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(function () {
        func.apply(context, args);
      }, wait);
    };
  }

  /**
   * Handler para busca de clientes
   */
  function handleSearch() {
    var query = elements.searchInput.value.trim();
    if (query.length >= 2) {
      WidgetApp.searchClients(query);
    } else if (query.length === 0) {
      showEmptyState();
    }
  }

  /**
   * Adiciona uma mensagem no painel de debug
   */
  function log(msg, type) {
    type = type || "info";

    if (type === "error") {
      console.error("[Widget]", msg);
    } else {
      console.log("[Widget]", msg);
    }

    if (WidgetConfig.UI.DEBUG_ENABLED && elements.debug) {
      var entry = document.createElement("div");
      entry.className = "entry";
      entry.style.color =
        type === "error"
          ? "#EF5350"
          : type === "success"
          ? "#81C784"
          : "#B0BEC5";
      entry.textContent = msg;
      elements.debug.appendChild(entry);
      elements.debug.scrollTop = elements.debug.scrollHeight;
    }
  }

  /**
   * Define o status exibido na tela
   */
  function setStatus(msg, type, title) {
    if (!elements.status) return;

    // Títulos padrão por tipo
    var defaultTitles = {
      loading: "Aguarde",
      success: "Sucesso",
      error: "Erro",
    };

    // Atualiza classes
    elements.status.className = "alert-box " + type + " visible";

    // Atualiza textos
    if (elements.alertTitle) {
      elements.alertTitle.textContent = title || defaultTitles[type] || "";
    }
    if (elements.alertMessage) {
      elements.alertMessage.textContent = msg;
    }

    // Atualiza ícone baseado no tipo
    if (elements.alertIcon) {
      if (type === "loading") {
        elements.alertIcon.innerHTML = '<div class="spinner-brand"></div>';
      } else if (type === "success") {
        elements.alertIcon.innerHTML =
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4caf50" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
      } else if (type === "error") {
        elements.alertIcon.innerHTML =
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f44336" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
      }
    }
  }

  /**
   * Esconde o status
   */
  function hideStatus() {
    if (elements.status) {
      elements.status.classList.remove("visible");
    }
  }

  /**
   * Atualiza o subtítulo do header
   */
  function setHeaderSubtitle(text) {
    if (elements.headerSubtitle) {
      elements.headerSubtitle.textContent = text;
    }
  }

  /**
   * Extrai iniciais do nome para o avatar
   */
  function getInitials(name) {
    if (!name) return "??";
    var parts = name.split(" ").filter(function (p) {
      return p.length > 0;
    });
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Formata CPF/CNPJ para exibição
   */
  function formatCpfCnpj(value) {
    if (!value) return "-";
    var digits = String(value).replace(/\D/g, "");
    if (digits.length === 11) {
      return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (digits.length === 14) {
      return digits.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5"
      );
    }
    return value;
  }

  /**
   * Renderiza a lista de clientes
   */
  function renderClientList(clientes) {
    if (!elements.clientList) return;

    if (!clientes || clientes.length === 0) {
      showEmptyState("Nenhum cliente encontrado");
      return;
    }

    elements.clientList.innerHTML = "";

    clientes.forEach(function (cliente) {
      var item = document.createElement("div");
      item.className = "client-item";
      item.setAttribute("data-id", cliente.ID);

      item.innerHTML =
        '<div class="client-avatar">' +
        getInitials(cliente.Nome) +
        "</div>" +
        '<div class="client-info">' +
        '<div class="client-name">' +
        cliente.Nome +
        "</div>" +
        '<div class="client-details">' +
        formatCpfCnpj(cliente.CPF_CNPJ) +
        "</div>" +
        "</div>" +
        '<div class="client-check">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">' +
        '<polyline points="20 6 9 17 4 12"></polyline>' +
        "</svg>" +
        "</div>";

      item.addEventListener("click", function () {
        WidgetApp.selecionarCliente(cliente);
      });

      elements.clientList.appendChild(item);
    });
  }

  /**
   * Mostra estado vazio
   */
  function showEmptyState(message) {
    if (!elements.clientList) return;

    elements.clientList.innerHTML =
      '<div class="empty-state">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>' +
      '<circle cx="9" cy="7" r="4"></circle>' +
      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>' +
      '<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>' +
      "</svg>" +
      "<p>" +
      (message || "Digite para buscar clientes") +
      "</p>" +
      "</div>";
  }

  /**
   * Mostra a etapa de seleção de cliente
   */
  function mostrarEtapaCliente() {
    if (elements.stepCliente) {
      elements.stepCliente.classList.remove("hidden");
    }
    if (elements.stepPedido) {
      elements.stepPedido.classList.add("hidden");
    }
    setHeaderSubtitle("Selecione o cliente para iniciar");
  }

  /**
   * Mostra a etapa de pedido com dados do cliente
   */
  function mostrarEtapaPedido(cliente) {
    if (elements.stepCliente) {
      elements.stepCliente.classList.add("hidden");
    }
    if (elements.stepPedido) {
      elements.stepPedido.classList.remove("hidden");
    }

    // Preenche dados do cliente no header
    var headerAvatar = document.getElementById("header-cliente-avatar");
    var headerNome = document.getElementById("header-cliente-nome");
    var headerRazao = document.getElementById("header-cliente-razao");
    var headerDoc = document.getElementById("header-cliente-doc");

    if (headerAvatar) {
      headerAvatar.textContent = getInitials(cliente.Nome);
    }
    if (headerNome) {
      headerNome.textContent =
        cliente.NomeFantasia.toUpperCase() || cliente.Nome.toUpperCase() || "-";
    }
    if (headerRazao) {
      headerRazao.textContent = cliente.RazaoSocial || "";
    }
    if (headerDoc) {
      headerDoc.textContent = formatCpfCnpj(cliente.CPF_CNPJ);
    }

    // Preenche endereço de entrega
    var enderecoInput = document.getElementById("endereco-entrega");
    if (enderecoInput && cliente.Endereco) {
      enderecoInput.value = cliente.Endereco;
    }
  }

  /**
   * Alterna visibilidade do painel de debug
   */
  function toggleDebug() {
    if (elements.debugPanel) {
      elements.debugPanel.classList.toggle("hidden");
    }
  }

  /**
   * Troca entre tabs
   */
  function switchTab(tabId) {
    // Desativa todas as tabs
    var tabBtns = document.querySelectorAll(".tab-btn");
    var tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach(function (btn) {
      btn.classList.remove("active");
    });
    tabContents.forEach(function (content) {
      content.classList.remove("active");
    });

    // Ativa a tab selecionada
    var selectedBtn = document.querySelector(
      '.tab-btn[data-tab="' + tabId + '"]'
    );
    var selectedContent = document.getElementById("tab-" + tabId);

    if (selectedBtn) selectedBtn.classList.add("active");
    if (selectedContent) selectedContent.classList.add("active");

    // Atualiza o botão do footer conforme a aba
    updateFooterButton(tabId);

    // Controle do FAB Carrinho Mobile
    var fabCarrinho = document.querySelector(".fab-carrinho");
    if (fabCarrinho) {
      if (tabId === "produtos") {
        fabCarrinho.style.display = "flex";
      } else {
        fabCarrinho.style.display = "none";
      }
    }

    // Se for a aba de produtos, carrega as categorias
    if (tabId === "produtos" && typeof WidgetProdutos !== "undefined") {
      WidgetProdutos.carregarCategorias();
    }
  }

  /**
   * Atualiza o botão do footer conforme a aba ativa
   * @param {string} tabId - ID da aba atual ('config' ou 'produtos')
   */
  function updateFooterButton(tabId) {
    var btnText = document.getElementById("btn-footer-text");
    var btnIcon = document.getElementById("btn-footer-icon");
    var btnVoltar = document.getElementById("btn-voltar");

    if (!btnText || !btnIcon) return;

    if (tabId === "config") {
      // Aba de configurações: botão "Avançar", esconde Voltar
      btnText.textContent = "Avançar";
      btnIcon.innerHTML = '<polyline points="9 18 15 12 9 6"></polyline>';
      if (btnVoltar) btnVoltar.classList.add("hidden");
    } else if (tabId === "produtos") {
      // Aba de produtos: botão "Gerar Pedido", mostra Voltar
      btnText.textContent = "Gerar Pedido";
      btnIcon.innerHTML =
        '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
      if (btnVoltar) btnVoltar.classList.remove("hidden");
    }
  }

  /**
   * Retorna a aba ativa atual
   * @returns {string} ID da aba ativa
   */
  function getActiveTab() {
    var activeTab = document.querySelector(".tab-btn.active");
    return activeTab ? activeTab.getAttribute("data-tab") : "config";
  }

  /**
   * Abre um modal
   * @param {string} modalId - ID do modal
   */
  function abrirModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("hidden");
    }
  }

  /**
   * Fecha um modal
   * @param {string} modalId - ID do modal
   */
  function fecharModal(modalId) {
    var modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  /**
   * Seleciona option card (genérico para frete, natureza, etc.)
   */
  function selectOption(element) {
    var group = element.getAttribute("data-group");
    var value = element.getAttribute("data-value");

    // Remove active de todos os cards do mesmo grupo
    var cards = document.querySelectorAll(
      '.option-card[data-group="' + group + '"]'
    );
    cards.forEach(function (card) {
      card.classList.remove("active");
    });

    // Adiciona active no selecionado
    element.classList.add("active");
  }

  /**
   * Abre um modal
   */
  /**
   * Abre/Fecha Select
   */
  function toggleSelect(element) {
    // Fecha outros selects
    var allSelects = document.querySelectorAll(".custom-select-wrapper");
    allSelects.forEach(function (s) {
      if (s !== element) s.classList.remove("open");
    });

    element.classList.toggle("open");
  }

  /**
   * Seleciona opção do Select Customizado
   */
  function selectCustomOption(optionElement, value) {
    var wrapper = optionElement.closest(".custom-select-wrapper");
    var trigger = wrapper.querySelector(
      ".custom-select-trigger .selected-value"
    );
    var hiddenInput = wrapper.querySelector("input[type='hidden']");
    var options = wrapper.querySelectorAll(".custom-option");

    // Atualiza visual
    options.forEach(function (opt) {
      opt.classList.remove("selected");
    });
    optionElement.classList.add("selected");

    // Atualiza valores
    trigger.textContent = optionElement.textContent;
    hiddenInput.value = value;

    // Armazena no estado (exemplo)
    if (typeof WidgetApp !== "undefined" && WidgetApp.getState) {
      var key = hiddenInput.id;
      WidgetApp.getState()[key] = value;
    }
  }

  // Fecha selects ao clicar fora
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".custom-select-wrapper")) {
      var allSelects = document.querySelectorAll(".custom-select-wrapper");
      allSelects.forEach(function (s) {
        s.classList.remove("open");
      });
    }
  });

  /**
   * Renderiza a lista de condições de pagamento no select customizado
   * @param {Array} condicoes - Lista de condições vindas da API
   * @param {string} [selectedId] - ID da condição a ser pré-selecionada
   */
  function renderPaymentConditions(condicoes, selectedId) {
    var wrapper = document
      .querySelector("#condicao-pagamento")
      .closest(".custom-select-wrapper");
    if (!wrapper) return;

    var optionsContainer = wrapper.querySelector(".custom-options");
    var triggerText = wrapper.querySelector(".selected-value");
    var hiddenInput = document.getElementById("condicao-pagamento");
    var foiSelecionado = false;

    // Limpa opções atuais
    optionsContainer.innerHTML = "";
    triggerText.textContent = "Selecione...";
    hiddenInput.value = "";

    // Log para debug
    log("renderPaymentConditions - selectedId: " + selectedId);
    log("Total de condições: " + (condicoes ? condicoes.length : 0));

    // Adiciona novas opções
    if (condicoes && condicoes.length > 0) {
      condicoes.forEach(function (cond) {
        var div = document.createElement("div");
        div.className = "custom-option";
        div.textContent = cond.Display;

        // Log para debug de cada condição
        // log("Condição: ID=" + cond.ID + ", Display=" + cond.Display);

        // Verifica se deve pré-selecionar
        if (selectedId && String(cond.ID) === String(selectedId)) {
          div.classList.add("selected");
          triggerText.textContent = cond.Display;
          hiddenInput.value = cond.ID;
          foiSelecionado = true;
          log(
            "Condição de pagamento pré-selecionada: " + cond.Display,
            "success"
          );
        }

        // Adiciona evento onclick apenas se não estiver travado
        div.onclick = function () {
          if (!wrapper.classList.contains("locked")) {
            WidgetUI.selectCustomOption(this, cond.ID);
          }
        };

        optionsContainer.appendChild(div);
      });

      // Se foi pré-selecionado, trava o campo
      if (foiSelecionado && selectedId) {
        travarCondicaoPagamento(wrapper);
      }
    } else {
      var emptyDiv = document.createElement("div");
      emptyDiv.className = "custom-option";
      emptyDiv.textContent = "Nenhuma condição encontrada";
      emptyDiv.style.color = "var(--color-text-muted)";
      emptyDiv.style.pointerEvents = "none";
      optionsContainer.appendChild(emptyDiv);
    }
  }

  /**
   * Trava o campo de condição de pagamento (não permite edição)
   */
  function travarCondicaoPagamento(wrapper) {
    if (!wrapper) {
      wrapper = document
        .querySelector("#condicao-pagamento")
        .closest(".custom-select-wrapper");
    }
    if (wrapper) {
      wrapper.classList.add("locked");
      // Remove a capacidade de abrir o dropdown
      wrapper.removeAttribute("onclick");
    }
  }

  /**
   * Preenche os campos com os detalhes do cliente
   * @param {Object} detalhe - Detalhes do cliente vindos da API
   */
  function preencherDetalheCliente(detalhe) {
    // Monta o endereço completo
    var partes = [];
    if (detalhe.endereco) partes.push(detalhe.endereco);
    if (detalhe.complemento) partes.push(detalhe.complemento);

    var enderecoCompleto = partes.join(", ");

    // Atualiza os campos de endereço individuais
    var enderecoField = document.getElementById("endereco-logradouro");
    if (enderecoField) enderecoField.value = detalhe.endereco || "";

    var bairroField = document.getElementById("endereco-bairro");
    if (bairroField) bairroField.value = detalhe.bairro || "";

    var municipioField = document.getElementById("endereco-municipio");
    if (municipioField) municipioField.value = detalhe.municipio || "";

    var estadoField = document.getElementById("endereco-estado");
    if (estadoField) estadoField.value = detalhe.estado || "";

    var cepField = document.getElementById("endereco-cep");
    if (cepField) {
      var cep = detalhe.cep || "";
      // Formata o CEP se tiver 8 dígitos
      if (cep.length === 8) {
        cep = cep.substring(0, 5) + "-" + cep.substring(5);
      }
      cepField.value = cep;
    }

    var complementoField = document.getElementById("endereco-complemento");
    if (complementoField) complementoField.value = detalhe.complemento || "";

    // Atualiza campo de endereço resumido (exibido quando colapsado)
    var enderecoResumoField = document.getElementById("endereco-resumo");
    var enderecoResumoTexto = [
      detalhe.endereco,
      detalhe.bairro,
      detalhe.municipio + "/" + detalhe.estado,
      formatarCep(detalhe.cep),
    ]
      .filter(function (p) {
        return p && p.trim() && p !== "/";
      })
      .join(" - ");

    if (enderecoResumoField) {
      enderecoResumoField.value = enderecoResumoTexto;
    }

    // Atualiza campo legado de endereço (para compatibilidade)
    var enderecoEntrega = document.getElementById("endereco-entrega");
    if (enderecoEntrega) {
      enderecoEntrega.value = enderecoResumoTexto;
    }

    // Preenche informações de janela de entrega se houver elemento
    var janelaField = document.getElementById("janela-entrega");
    if (
      janelaField &&
      detalhe.janelaEntrega &&
      detalhe.janelaEntrega.length > 0
    ) {
      var janelaTexto = detalhe.janelaEntrega.join(", ");
      if (detalhe.horaInicio1 && detalhe.horaFim1) {
        janelaTexto +=
          " (" + detalhe.horaInicio1 + " - " + detalhe.horaFim1 + ")";
      }
      janelaField.value = janelaTexto;
    }

    // Preenche informações de transportadora se houver
    var transportadoraField = document.getElementById("transportadora");
    if (transportadoraField && detalhe.transportadoraRazao) {
      transportadoraField.value = detalhe.transportadoraRazao;
    }
  }

  /**
   * Formata o CEP para exibição
   */
  function formatarCep(cep) {
    if (!cep) return "";
    cep = String(cep).replace(/\D/g, "");
    if (cep.length === 8) {
      return cep.substring(0, 5) + "-" + cep.substring(5);
    }
    return cep;
  }

  /**
   * Seleciona automaticamente o tipo de frete e opcionalmente trava
   * @param {string} tipo - 'cif' ou 'fob'
   * @param {boolean} [travar] - Se true, impede o usuário de alterar
   */
  function selecionarFreteAutomatico(tipo, travar) {
    var cards = document.querySelectorAll('.option-card[data-group="frete"]');
    cards.forEach(function (card) {
      card.classList.remove("active");
      if (card.getAttribute("data-value") === tipo) {
        card.classList.add("active");
      }

      // Se deve travar, adiciona classe locked e remove onclick
      if (travar) {
        card.classList.add("locked");
        card.onclick = function (e) {
          e.stopPropagation();
          // Não faz nada - está travado
        };
      }
    });
  }

  /**
   * Expande ou colapsa a seção de endereço
   */
  function toggleEndereco() {
    var section = document.getElementById("endereco-section");
    var detailGrid = document.getElementById("endereco-detail-grid");
    var resumoField = document.getElementById("endereco-resumo-container");
    var toggleIcon = document.getElementById("endereco-toggle-icon");

    if (!section) return;

    var isExpanded = section.classList.contains("expanded");

    if (isExpanded) {
      // Colapsar
      section.classList.remove("expanded");
      section.classList.add("collapsed");
      if (detailGrid) detailGrid.style.display = "none";
      if (resumoField) resumoField.style.display = "block";
      if (toggleIcon) toggleIcon.style.transform = "rotate(0deg)";
    } else {
      // Expandir
      section.classList.remove("collapsed");
      section.classList.add("expanded");
      if (detailGrid) detailGrid.style.display = "grid";
      if (resumoField) resumoField.style.display = "none";
      if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
    }
  }

  /**
   * Mostra o loading de transição
   */
  function mostrarLoadingTransicao() {
    var overlay = document.getElementById("loading-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
    }
  }

  /**
   * Esconde o loading de transição
   */
  function esconderLoadingTransicao() {
    var overlay = document.getElementById("loading-overlay");
    if (overlay) {
      // Pequeno delay para suavizar a transição
      setTimeout(function () {
        overlay.classList.add("hidden");
      }, 300);
    }
  }

  /**
   * Expande ou colapsa a sidebar do cliente
   */
  function toggleSidebarCliente() {
    var sidebar = document.getElementById("cliente-sidebar");
    var dadosContainer = document.getElementById("cliente-dados-container");
    var toggleIcon = document.getElementById("sidebar-toggle-icon");

    if (!sidebar) return;

    var isCollapsed = sidebar.classList.contains("collapsed");

    if (isCollapsed) {
      // Expandir
      sidebar.classList.remove("collapsed");
      if (dadosContainer) dadosContainer.style.display = "flex";
      if (toggleIcon) toggleIcon.style.transform = "rotate(180deg)";
    } else {
      // Colapsar
      sidebar.classList.add("collapsed");
      if (dadosContainer) dadosContainer.style.display = "none";
      if (toggleIcon) toggleIcon.style.transform = "rotate(0deg)";
    }
  }

  // API Pública do Módulo
  return {
    init: init,
    log: log,
    setStatus: setStatus,
    hideStatus: hideStatus,
    setHeaderSubtitle: setHeaderSubtitle,
    renderClientList: renderClientList,
    showEmptyState: showEmptyState,
    mostrarEtapaCliente: mostrarEtapaCliente,
    mostrarEtapaPedido: mostrarEtapaPedido,
    formatCpfCnpj: formatCpfCnpj,
    toggleDebug: toggleDebug,
    switchTab: switchTab,
    selectOption: selectOption,
    toggleSelect: toggleSelect,
    selectCustomOption: selectCustomOption,
    renderPaymentConditions: renderPaymentConditions,
    preencherDetalheCliente: preencherDetalheCliente,
    selecionarFreteAutomatico: selecionarFreteAutomatico,
    toggleEndereco: toggleEndereco,
    toggleSidebarCliente: toggleSidebarCliente,
    mostrarLoadingTransicao: mostrarLoadingTransicao,
    esconderLoadingTransicao: esconderLoadingTransicao,
    getActiveTab: getActiveTab,
    abrirModal: abrirModal,
    fecharModal: fecharModal,
  };
})();
