/**
 * Widget de Pedidos - Módulo de Produtos
 * Arquivo: app/js/produtos.js
 *
 * Gerencia a seleção de categorias, produtos e carrinho.
 */

var WidgetProdutos = (function () {
  "use strict";

  // Estado do módulo
  var state = {
    clienteId: null,
    categorias: [],
    categoriaAtual: null,
    produtosCategoria: [],
    produtosSelecionados: [], // Produtos selecionados no modal
    carrinho: [], // Itens adicionados ao pedido
  };

  /**
   * Define o ID do cliente para buscar preços personalizados
   * @param {string} clienteId - ID do cliente
   */
  function setClienteId(clienteId) {
    state.clienteId = clienteId;
    WidgetUI.log("Cliente ID definido para produtos: " + clienteId);
  }

  /**
   * Inicializa o módulo de produtos
   */
  function init() {
    WidgetUI.log("Inicializando módulo de produtos...");
  }

  /**
   * Carrega as categorias (subtítulos) da API
   */
  function carregarCategorias() {
    var grid = document.getElementById("categorias-grid");
    if (!grid) return;

    // Mostra loading
    grid.innerHTML = `
      <div class="categorias-loading">
        <div class="loading-spinner"></div>
        <p>Carregando categorias...</p>
      </div>
    `;

    WidgetAPI.buscarSubtitulos()
      .then(function (categorias) {
        state.categorias = categorias;
        WidgetUI.log("Categorias carregadas: " + categorias.length, "success");
        renderizarCategorias(categorias);
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao carregar categorias: " + err, "error");
        grid.innerHTML = `
          <div class="categorias-erro">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Erro ao carregar categorias</p>
            <button class="btn btn-secondary" onclick="WidgetProdutos.carregarCategorias()">Tentar Novamente</button>
          </div>
        `;
      });
  }

  /**
   * Renderiza o grid de categorias
   */
  function renderizarCategorias(categorias) {
    var grid = document.getElementById("categorias-grid");
    if (!grid) return;

    if (!categorias || categorias.length === 0) {
      grid.innerHTML = `
        <div class="categorias-vazio">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>Nenhuma categoria encontrada</p>
        </div>
      `;
      return;
    }

    // Ordena categorias por nome (alfabeticamente)
    var categoriasOrdenadas = categorias.slice().sort(function (a, b) {
      return a.Nome.localeCompare(b.Nome, "pt-BR");
    });

    // Ícones para cada categoria (baseado no nome)
    var icones = {
      bolo: '<path d="M21 15a9 9 0 0 1-18 0c0-3.1 1.5-6 4-8l2 3 3-4 3 4 2-3c2.5 2 4 4.9 4 8Z"/><path d="M13 9c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2Z"/>',
      brownie:
        '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v8M7 7l5 4 5-4"/>',
      croissant:
        '<path d="M4.6 13.11 5.05 9a3 3 0 0 1 2.19-2.64l.95-.24a2 2 0 0 1 1-.08 2 2 0 0 1 .97.44l.3.25a2 2 0 0 0 2.55 0l.3-.25a2 2 0 0 1 .97-.44 2 2 0 0 1 1 .08l.95.24A3 3 0 0 1 18.95 9l.45 4.11M19 15l-1.5 6H6.5L5 15"/>',
      salgado:
        '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
      mini: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/>',
      embalagem:
        '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
      default:
        '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    };

    var html = "";

    categoriasOrdenadas.forEach(function (cat, index) {
      // Pega as iniciais do nome da categoria (máximo 2 letras)
      var iniciais = cat.Nome.split(" ")
        .map(function (p) {
          return p.charAt(0);
        })
        .slice(0, 2)
        .join("")
        .toUpperCase();

      // Cores alternadas para os cards
      var cores = [
        "linear-gradient(135deg, #e91e63 0%, #ff4081 100%)",
        "linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)",
        "linear-gradient(135deg, #673ab7 0%, #9575cd 100%)",
        "linear-gradient(135deg, #3f51b5 0%, #7986cb 100%)",
        "linear-gradient(135deg, #2196f3 0%, #64b5f6 100%)",
        "linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%)",
        "linear-gradient(135deg, #009688 0%, #4db6ac 100%)",
        "linear-gradient(135deg, #4caf50 0%, #81c784 100%)",
        "linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)",
        "linear-gradient(135deg, #ff5722 0%, #ff8a65 100%)",
      ];
      var corIndex = index % cores.length;

      html += `
        <div class="categoria-card" onclick="WidgetProdutos.selecionarCategoria('${
          cat.ID
        }', '${cat.Nome}')" data-id="${
        cat.ID
      }" data-nome="${cat.Nome.toLowerCase()}">
          <div class="categoria-icon" style="background: ${cores[corIndex]}">
            ${iniciais}
          </div>
          <div class="categoria-info">
            <h4>${cat.Nome}</h4>
            <span>Clique para ver produtos</span>
          </div>
          <div class="categoria-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
    });

    grid.innerHTML = html;

    // Inicializa busca de categorias
    inicializarBuscaCategorias();
  }

  /**
   * Inicializa o campo de busca de categorias
   */
  function inicializarBuscaCategorias() {
    var searchInput = document.getElementById("search-produtos");
    if (!searchInput) return;

    searchInput.addEventListener("input", function () {
      var termo = this.value.toLowerCase().trim();
      var cards = document.querySelectorAll(".categoria-card");

      cards.forEach(function (card) {
        var nome = card.getAttribute("data-nome") || "";
        if (termo === "" || nome.indexOf(termo) >= 0) {
          card.style.display = "";
        } else {
          card.style.display = "none";
        }
      });
    });
  }

  /**
   * Seleciona uma categoria e abre o modal de produtos
   */
  function selecionarCategoria(categoriaId, categoriaNome) {
    state.categoriaAtual = { ID: categoriaId, Nome: categoriaNome };
    state.produtosSelecionados = [];

    WidgetUI.log("Categoria selecionada: " + categoriaNome);

    // Atualiza o título do modal
    var tituloEl = document.getElementById("modal-categoria-nome");
    if (tituloEl) tituloEl.textContent = categoriaNome;

    // Mostra loading e abre o modal
    var listaEl = document.getElementById("modal-produtos-lista");
    if (listaEl) {
      listaEl.innerHTML = `
        <div class="produtos-loading">
          <div class="loading-spinner"></div>
          <p>Carregando produtos...</p>
        </div>
      `;
    }

    // Limpa campo de busca
    var searchInput = document.getElementById("search-modal-produtos");
    if (searchInput) searchInput.value = "";

    WidgetUI.abrirModal("modal-produtos");

    // Busca os produtos da categoria (com preços personalizados para o cliente)
    WidgetAPI.buscarProdutosPorSubtitulo(categoriaId, state.clienteId)
      .then(function (produtos) {
        state.produtosCategoria = produtos;
        renderizarProdutosModal(produtos);
      })
      .catch(function (err) {
        WidgetUI.log("Erro ao buscar produtos: " + err, "error");
        if (listaEl) {
          listaEl.innerHTML = `
            <div class="produtos-erro">
              <p>Erro ao carregar produtos</p>
            </div>
          `;
        }
      });
  }

  /**
   * Renderiza produtos no modal
   */
  function renderizarProdutosModal(produtos) {
    var listaEl = document.getElementById("modal-produtos-lista");
    var countEl = document.getElementById("modal-produtos-count");

    if (countEl) {
      countEl.textContent =
        produtos.length +
        " produto" +
        (produtos.length !== 1 ? "s" : "") +
        " disponíve" +
        (produtos.length !== 1 ? "is" : "l");
    }

    if (!listaEl) return;

    if (!produtos || produtos.length === 0) {
      listaEl.innerHTML = `
        <div class="produtos-vazio">
          <p>Nenhum produto encontrado nesta categoria</p>
        </div>
      `;
      return;
    }

    // Ordena: Disponíveis primeiro
    produtos.sort(function (a, b) {
      if (a.Disponivel && !b.Disponivel) return -1;
      if (!a.Disponivel && b.Disponivel) return 1;
      // Se disponibilidade igual, mantém ordem original (ou por nome se preferir)
      return 0;
    });

    var html = "";

    produtos.forEach(function (prod) {
      var classeIndisponivel = !prod.Disponivel ? "indisponivel" : "";
      var disabledAttr = !prod.Disponivel ? 'disabled="disabled"' : "";

      // Composição do preço (discreto)
      var composicaoHtml = "";
      if (prod.Disponivel) {
        composicaoHtml = `
            <div class="produto-composicao">
                <span>Base: R$ ${formatarMoeda(prod.PrecoBase)}</span>
                ${
                  prod.ST > 0
                    ? `<span> | ST: R$ ${formatarMoeda(prod.ST)}</span>`
                    : ""
                }
                ${
                  prod.IPI > 0
                    ? `<span> | IPI: R$ ${formatarMoeda(prod.IPI)}</span>`
                    : ""
                }
            </div>
          `;
      }

      var badgeIndisponivel = !prod.Disponivel
        ? '<span class="badge-indisponivel">Indisponível</span>'
        : "";

      html += `
        <div class="produto-card ${classeIndisponivel}" data-id="${prod.ID}">
          <div class="produto-info">
            <div class="produto-codigo">${prod.Codigo}</div>
            <div class="produto-nome">${prod.Nome} ${badgeIndisponivel}</div>
            <div class="produto-unidade">${prod.Unidade}</div>
            ${composicaoHtml}
          </div>
          <div class="produto-preco">
            R$ ${formatarMoeda(prod.Preco)}
          </div>
          <div class="produto-quantidade">
            <button class="btn-qtd" ${disabledAttr} onclick="WidgetProdutos.alterarQuantidade('${
        prod.ID
      }', -1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <input type="number" id="qtd-${
              prod.ID
            }" value="0" min="0" class="input-qtd" ${disabledAttr} onchange="WidgetProdutos.atualizarQuantidade('${
        prod.ID
      }', this.value)" />
            <button class="btn-qtd btn-qtd-add" ${disabledAttr} onclick="WidgetProdutos.alterarQuantidade('${
        prod.ID
      }', 1)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      `;
    });

    listaEl.innerHTML = html;
  }

  /**
   * Altera a quantidade de um produto
   */
  function alterarQuantidade(produtoId, delta) {
    var input = document.getElementById("qtd-" + produtoId);
    if (!input) return;

    var atual = parseInt(input.value) || 0;
    var novo = Math.max(0, atual + delta);
    input.value = novo;

    atualizarSelecao(produtoId, novo);
  }

  /**
   * Atualiza a quantidade de um produto (via input direto)
   */
  function atualizarQuantidade(produtoId, valor) {
    var quantidade = Math.max(0, parseInt(valor) || 0);
    atualizarSelecao(produtoId, quantidade);
  }

  /**
   * Atualiza a lista de produtos selecionados
   */
  function atualizarSelecao(produtoId, quantidade) {
    // Remove se existir
    state.produtosSelecionados = state.produtosSelecionados.filter(function (
      p
    ) {
      return p.ID !== produtoId;
    });

    // Adiciona se quantidade > 0
    if (quantidade > 0) {
      var produto = state.produtosCategoria.find(function (p) {
        return p.ID === produtoId;
      });

      if (produto) {
        state.produtosSelecionados.push({
          ...produto,
          Quantidade: quantidade,
          Subtotal: produto.Preco * quantidade,
        });
      }
    }

    // Atualiza visual do card
    var card = document.querySelector(
      '.produto-card[data-id="' + produtoId + '"]'
    );
    if (card) {
      if (quantidade > 0) {
        card.classList.add("selecionado");
      } else {
        card.classList.remove("selecionado");
      }
    }
  }

  /**
   * Confirma a seleção e adiciona ao carrinho
   */
  function confirmarSelecao() {
    if (state.produtosSelecionados.length === 0) {
      WidgetUI.log("Nenhum produto selecionado", "error");
      return;
    }

    // Adiciona ao carrinho
    state.produtosSelecionados.forEach(function (prod) {
      // Verifica se já existe no carrinho
      var existente = state.carrinho.find(function (item) {
        return item.ID === prod.ID;
      });

      if (existente) {
        existente.Quantidade += prod.Quantidade;
        existente.Subtotal = existente.Preco * existente.Quantidade;
      } else {
        state.carrinho.push({ ...prod });
      }
    });

    WidgetUI.log(
      state.produtosSelecionados.length +
        " produto(s) adicionado(s) ao carrinho",
      "success"
    );

    // Fecha o modal
    WidgetUI.fecharModal("modal-produtos");

    // Atualiza o carrinho visual
    renderizarCarrinho();
  }

  /**
   * Renderiza o carrinho
   */
  function renderizarCarrinho() {
    var itensEl = document.getElementById("carrinho-itens");
    var countEl = document.getElementById("carrinho-count");
    var subtotalEl = document.getElementById("carrinho-subtotal");
    var totalEl = document.getElementById("carrinho-total");

    if (countEl) {
      countEl.textContent = state.carrinho.length;
    }

    if (!itensEl) return;

    if (state.carrinho.length === 0) {
      itensEl.innerHTML = `
        <div class="carrinho-vazio">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <path d="M16 10a4 4 0 0 1-8 0"></path>
          </svg>
          <p>Seu carrinho está vazio</p>
          <span>Selecione produtos para adicionar</span>
        </div>
      `;

      if (subtotalEl) subtotalEl.textContent = "R$ 0,00";
      if (totalEl) totalEl.textContent = "R$ 0,00";
      return;
    }

    var html = "";
    var total = 0;

    state.carrinho.forEach(function (item) {
      total += item.Subtotal;
      html += `
        <div class="carrinho-item">
          <div class="carrinho-item-info">
            <span class="carrinho-item-nome">${item.Nome}</span>
            <span class="carrinho-item-preco">${
              item.Quantidade
            }x R$ ${formatarMoeda(item.Preco)}</span>
          </div>
          <div class="carrinho-item-subtotal">
            R$ ${formatarMoeda(item.Subtotal)}
          </div>
          <button class="carrinho-item-remove" onclick="WidgetProdutos.removerDoCarrinho('${
            item.ID
          }')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      `;
    });

    itensEl.innerHTML = html;

    if (subtotalEl) subtotalEl.textContent = "R$ " + formatarMoeda(total);
    if (totalEl) totalEl.textContent = "R$ " + formatarMoeda(total);

    // Atualiza o total do footer também
    var footerTotal = document.querySelector(".total-valor");
    if (footerTotal) {
      footerTotal.textContent = "R$ " + formatarMoeda(total);
    }
  }

  /**
   * Remove um item do carrinho
   */
  function removerDoCarrinho(produtoId) {
    state.carrinho = state.carrinho.filter(function (item) {
      return item.ID !== produtoId;
    });
    renderizarCarrinho();
    WidgetUI.log("Produto removido do carrinho");
  }

  /**
   * Retorna o estado atual do carrinho
   */
  function getCarrinho() {
    return state.carrinho;
  }

  /**
   * Formata valor para moeda
   */
  function formatarMoeda(valor) {
    return valor.toFixed(2).replace(".", ",");
  }

  /**
   * Filtra produtos no modal de acordo com o termo de busca
   */
  function filtrarProdutos(termo) {
    termo = termo.toLowerCase().trim();
    var cards = document.querySelectorAll(
      "#modal-produtos-lista .produto-card"
    );

    cards.forEach(function (card) {
      var nome = card.querySelector(".produto-nome");
      var codigo = card.querySelector(".produto-codigo");
      var textoNome = nome ? nome.textContent.toLowerCase() : "";
      var textoCodigo = codigo ? codigo.textContent.toLowerCase() : "";

      if (
        termo === "" ||
        textoNome.indexOf(termo) >= 0 ||
        textoCodigo.indexOf(termo) >= 0
      ) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  }

  // API Pública do Módulo
  return {
    init: init,
    setClienteId: setClienteId,
    carregarCategorias: carregarCategorias,
    selecionarCategoria: selecionarCategoria,
    alterarQuantidade: alterarQuantidade,
    atualizarQuantidade: atualizarQuantidade,
    confirmarSelecao: confirmarSelecao,
    removerDoCarrinho: removerDoCarrinho,
    renderizarCarrinho: renderizarCarrinho,
    filtrarProdutos: filtrarProdutos,
    getCarrinho: getCarrinho,
  };
})();
