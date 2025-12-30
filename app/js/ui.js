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

    setHeaderSubtitle("Adicione os produtos ao pedido");

    // Preenche dados do cliente na sidebar
    if (elements.clienteAvatarLg) {
      elements.clienteAvatarLg.textContent = getInitials(cliente.Nome);
    }
    if (elements.clienteRazao) {
      elements.clienteRazao.textContent =
        cliente.RazaoSocial || cliente.Nome || "-";
    }
    if (elements.clienteFantasia) {
      elements.clienteFantasia.textContent =
        cliente.NomeFantasia || cliente.Nome || "-";
    }
    if (elements.clienteDocumento) {
      elements.clienteDocumento.textContent = formatCpfCnpj(cliente.CPF_CNPJ);
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
   */
  function renderPaymentConditions(condicoes) {
    var wrapper = document
      .querySelector("#condicao-pagamento")
      .closest(".custom-select-wrapper");
    if (!wrapper) return;

    var optionsContainer = wrapper.querySelector(".custom-options");
    var triggerText = wrapper.querySelector(".selected-value");

    // Limpa opções atuais
    optionsContainer.innerHTML = "";
    triggerText.textContent = "Selecione...";
    document.getElementById("condicao-pagamento").value = "";

    // Adiciona novas opções
    if (condicoes && condicoes.length > 0) {
      condicoes.forEach(function (cond) {
        var div = document.createElement("div");
        div.className = "custom-option";
        div.textContent = cond.Display; // Usa o campo Display retornado pela API

        // Adiciona evento onclick
        div.onclick = function () {
          WidgetUI.selectCustomOption(this, cond.ID);
        };

        optionsContainer.appendChild(div);
      });
    } else {
      var emptyDiv = document.createElement("div");
      emptyDiv.className = "custom-option";
      emptyDiv.textContent = "Nenhuma condição encontrada";
      emptyDiv.style.color = "var(--color-text-muted)";
      emptyDiv.style.pointerEvents = "none";
      optionsContainer.appendChild(emptyDiv);
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
  };
})();
