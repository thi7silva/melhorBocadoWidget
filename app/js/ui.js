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
      status: document.getElementById("status"),
      statusText: document.querySelector("#status span"),
      debug: document.getElementById("debug"),
      searchInput: document.getElementById("search-cliente"),
      clientList: document.getElementById("client-list"),
      selectedBadge: document.getElementById("selected-client"),
      selectedAvatar: document.getElementById("selected-avatar"),
      selectedName: document.getElementById("selected-name"),
      selectedDetails: document.getElementById("selected-details"),
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
  function setStatus(msg, type) {
    if (!elements.status) return;

    elements.status.className = "status-message " + type + " visible";

    // Spinner apenas para loading
    var spinner = elements.status.querySelector(".spinner");
    if (spinner) {
      spinner.style.display = type === "loading" ? "block" : "none";
    }

    if (elements.statusText) {
      elements.statusText.textContent = msg;
    } else {
      // Fallback se não tiver span
      var span = elements.status.querySelector("span");
      if (span) span.textContent = msg;
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
    if (!value) return "";
    var digits = value.replace(/\D/g, "");
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
        selectClient(cliente);
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
   * Seleciona um cliente e mostra o badge
   */
  function selectClient(cliente) {
    WidgetApp.setSelectedClient(cliente);

    // PRIMEIRO: Limpa TODAS as seleções
    var items = elements.clientList.querySelectorAll(".client-item");
    items.forEach(function (item) {
      item.classList.remove("selected");
    });

    // DEPOIS: Aplica seleção no item correto (forçando comparação como string)
    var clienteIdStr = String(cliente.ID);
    items.forEach(function (item) {
      if (String(item.getAttribute("data-id")) === clienteIdStr) {
        item.classList.add("selected");
      }
    });

    // Mostra badge
    if (elements.selectedBadge) {
      elements.selectedBadge.classList.add("visible");
    }
    if (elements.selectedAvatar) {
      elements.selectedAvatar.textContent = getInitials(cliente.Nome);
    }
    if (elements.selectedName) {
      elements.selectedName.textContent = cliente.Nome;
    }
    if (elements.selectedDetails) {
      elements.selectedDetails.textContent = formatCpfCnpj(cliente.CPF_CNPJ);
    }

    log("Cliente selecionado: " + cliente.Nome, "success");
  }

  /**
   * Limpa a seleção de cliente
   */
  function clearClientSelection() {
    if (elements.selectedBadge) {
      elements.selectedBadge.classList.remove("visible");
    }

    var items = elements.clientList.querySelectorAll(".client-item");
    items.forEach(function (item) {
      item.classList.remove("selected");
    });
  }

  // API Pública do Módulo
  return {
    init: init,
    log: log,
    setStatus: setStatus,
    hideStatus: hideStatus,
    renderClientList: renderClientList,
    showEmptyState: showEmptyState,
    clearClientSelection: clearClientSelection,
  };
})();
