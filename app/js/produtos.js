/**
 * Widget de Pedidos - Módulo de Produtos
 * Arquivo: app/js/produtos.js
 *
 * Gerencia a seleção de categorias, produtos e carrinho.
 */

var WidgetProdutos = (function () {
  "use strict";

  // Imagem padrão para produtos sem imagem
  var DEFAULT_PRODUCT_IMAGE =
    "https://melhorbocado.com.br/wp-content/uploads/2023/12/logo.png";

  /**
   * Extrai a primeira URL de imagem válida de um texto
   * O texto pode conter múltiplas URLs separadas por espaço
   * @param {string} text - Texto contendo possível URL de imagem
   * @returns {string|null} - URL da imagem ou null se não encontrar
   */
  function extractFirstImageUrl(text) {
    if (!text) return null;

    // Divide o texto por espaços e busca a primeira URL que termine com extensão de imagem
    var parts = text.split(/\s+/);
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      // Verifica se é uma URL https que termina com extensão de imagem
      if (/^https:\/\/.+\.(jpg|jpeg|png|gif|svg)$/i.test(part)) {
        return part;
      }
    }
    return null;
  }

  /**
   * Obtém a URL da imagem do produto ou a imagem padrão
   * @param {object} produto - Objeto do produto
   * @returns {string} - URL da imagem
   */
  function getProductImageUrl(produto) {
    var imageUrl = extractFirstImageUrl(
      produto.imagemProduto || produto.ImagemProduto || ""
    );
    return imageUrl || DEFAULT_PRODUCT_IMAGE;
  }

  // Estado do módulo
  var state = {
    clienteId: null,
    categorias: [],
    categoriaAtual: null,
    produtosCategoria: [],
    produtosSelecionados: [], // Produtos selecionados no modal
    carrinho: [], // Itens adicionados ao pedido
    modoEdicao: false, // Controle do modo de edição do carrinho
    // Controle de Descontos
    desconto: {
      globalTipo: "percent", // "percent" ou "valor"
      globalValor: 0, // Valor do desconto global (%) ou (R$)
      totalDescontoItens: 0, // Soma dos descontos aplicados nos itens
      totalDescontoGlobal: 0, // Valor do desconto global calculado
    },
    // Snapshot dos descontos ao abrir o modal (para detectar alterações)
    snapshotDescontos: null,
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
      var imagemUrl = getProductImageUrl(prod);

      // Composição do preço (discreto)
      var composicaoHtml = "";
      if (prod.Disponivel) {
        composicaoHtml = `
            <div class="produto-composicao">
                <span>Unit: R$ ${formatarMoeda(prod.PrecoBase)}</span>
                <span>+ IPI: R$ ${formatarMoeda(prod.IPI)}</span>
                <span>+ ST: R$ ${formatarMoeda(prod.ST)}</span>
            </div>
          `;
      }

      var badgeIndisponivel = !prod.Disponivel
        ? '<span class="badge-indisponivel">Indisponível</span>'
        : "";

      html += `
        <div class="produto-card ${classeIndisponivel}" data-id="${prod.ID}">
          <div class="produto-imagem">
            <img src="${imagemUrl}" alt="${
        prod.Nome
      }" onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'" />
          </div>
          <div class="produto-info">
            <div class="produto-codigo">${prod.Codigo}</div>
            <div class="produto-nome">${prod.Nome} ${badgeIndisponivel}</div>
            ${composicaoHtml}
          </div>
          <div class="produto-acoes-wrapper">
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
   * Renderiza o carrinho (Modo Compacto na Sidebar)
   */
  function renderizarCarrinho() {
    var itensEl = document.getElementById("carrinho-itens");
    var countEl = document.getElementById("carrinho-count");
    var subtotalEl = document.getElementById("carrinho-subtotal");
    var totalEl = document.getElementById("carrinho-total");
    var editBtn = document.getElementById("carrinho-edit-btn");

    if (countEl) {
      countEl.textContent = state.carrinho.length;
    }

    // Atualiza FAB Badge
    var fabBadge = document.getElementById("carrinho-count-fab");
    if (fabBadge) {
      fabBadge.textContent = state.carrinho.length;
      if (state.carrinho.length > 0) {
        fabBadge.style.display = "flex";
      } else {
        fabBadge.style.display = "none"; // Oculta se vazio
      }
    }

    // Botão de editar sempre "Editar"
    if (editBtn) {
      if (state.carrinho.length > 0) {
        editBtn.style.display = "block";
        editBtn.textContent = "Editar";
        editBtn.className = "carrinho-edit-btn";
      } else {
        editBtn.style.display = "none";
      }
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

      // Limpa footer
      var footerTotal = document.querySelector(".total-valor");
      if (footerTotal) {
        footerTotal.textContent = "R$ 0,00";
      }
      return;
    }

    var html = "";
    var subtotalBruto = 0;
    var totalDescontoItens = 0;

    state.carrinho.forEach(function (item) {
      var subtotalItem = item.Preco * item.Quantidade;
      var descontoItem = (item.descontoValor || 0) * item.Quantidade;
      var subtotalLiquido = subtotalItem - descontoItem;

      item.Subtotal = subtotalLiquido;
      subtotalBruto += subtotalItem;
      totalDescontoItens += descontoItem;

      var imagemUrl = getProductImageUrl(item);

      // Mostra preço com ou sem desconto - usando rosa da marca
      var precoExibido =
        descontoItem > 0
          ? `<span style="text-decoration: line-through; color: #999; font-size: 0.7rem;">R$ ${formatarMoeda(
              subtotalItem
            )}</span> <span style="color: var(--color-primary);">R$ ${formatarMoeda(
              subtotalLiquido
            )}</span>`
          : `R$ ${formatarMoeda(subtotalItem)}`;

      html += `
        <div class="carrinho-item">
          <div class="carrinho-item-imagem">
            <img src="${imagemUrl}" alt="${
        item.Nome
      }" onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'" />
          </div>
          <div class="carrinho-item-info">
            <span class="carrinho-item-nome">${item.Nome}</span>
            <span class="carrinho-item-preco">${
              item.Quantidade
            }x R$ ${formatarMoeda(
        item.Preco - (item.descontoValor || 0)
      )}</span>
          </div>
          <span class="carrinho-item-subtotal">${precoExibido}</span>
        </div>
      `;
    });

    itensEl.innerHTML = html;

    // Total após descontos de itens
    var totalFinal = subtotalBruto - totalDescontoItens;

    // Atualiza totais
    if (subtotalEl)
      subtotalEl.textContent = "R$ " + formatarMoeda(subtotalBruto);
    if (totalEl) {
      if (totalDescontoItens > 0) {
        totalEl.innerHTML = `
          <div style="font-size: 0.7rem; color: var(--color-primary);">(-R$ ${formatarMoeda(
            totalDescontoItens
          )})</div>
          <div>R$ ${formatarMoeda(totalFinal)}</div>
        `;
      } else {
        totalEl.textContent = "R$ " + formatarMoeda(totalFinal);
      }
    }

    // Atualiza o total do footer também
    var footerTotal = document.querySelector(".total-valor");
    if (footerTotal) {
      footerTotal.textContent = "R$ " + formatarMoeda(totalFinal);
    }
  }

  /**
   * Abre o modal de edição do carrinho
   * Salva snapshot dos descontos para detectar alterações
   */
  function toggleModoEdicao() {
    // Salva snapshot dos descontos atuais para comparar ao salvar
    state.snapshotDescontos = criarSnapshotDescontos();

    renderizarCarrinhoModal();
    WidgetUI.abrirModal("modal-carrinho");
  }

  /**
   * Cria um snapshot dos descontos dos itens do carrinho
   * @returns {string} JSON string do snapshot para comparação
   */
  function criarSnapshotDescontos() {
    return JSON.stringify(
      state.carrinho.map(function (item) {
        return {
          id: item.ID,
          descontoPercent: item.descontoPercent || 0,
          descontoValor: item.descontoValor || 0,
          quantidade: item.Quantidade,
        };
      })
    );
  }

  /**
   * Verifica se houve alteração nos descontos desde a abertura do modal
   * @returns {boolean} true se houve alteração
   */
  function houveAlteracaoDescontos() {
    var snapshotAtual = criarSnapshotDescontos();
    return state.snapshotDescontos !== snapshotAtual;
  }

  /**
   * Renderiza a tabela do modal de carrinho com sistema de descontos
   */
  function renderizarCarrinhoModal() {
    var tbody = document.getElementById("modal-carrinho-tbody");
    var totalEl = document.getElementById("modal-carrinho-total");
    var descontoResumoRow = document.getElementById("desconto-resumo-row");
    var descontoTotalValor = document.getElementById("desconto-total-valor");

    if (!tbody) return;

    // Calcula valores para limite de desconto
    var totais = calcularTotaisDesconto();
    atualizarBarraLimite(totais);

    var html = "";
    var totalGeral = 0;
    var totalDescontoItens = 0;

    state.carrinho.forEach(function (item) {
      // Inicializa campos de desconto se não existirem
      if (item.descontoPercent === undefined) item.descontoPercent = 0;
      if (item.descontoValor === undefined) item.descontoValor = 0;

      var subtotalBase = item.Preco * item.Quantidade;
      var descontoItem = item.descontoValor * item.Quantidade;
      var subtotalFinal = subtotalBase - descontoItem;
      var imagemUrl = getProductImageUrl(item);

      totalGeral += subtotalFinal;
      totalDescontoItens += descontoItem;

      // Classes para inputs com valor
      var classPercent = item.descontoPercent > 0 ? "has-value" : "";
      var classValor = item.descontoValor > 0 ? "has-value" : "";

      html += `
        <tr>
          <td>
            <div class="carrinho-modal-produto">
              <div class="carrinho-modal-imagem">
                <img src="${imagemUrl}" alt="${
        item.Nome
      }" onerror="this.src='${DEFAULT_PRODUCT_IMAGE}'" />
              </div>
              <div>
                <div class="font-bold">${item.Nome}</div>
                <div class="text-xs text-muted">${item.Codigo || ""}</div>
              </div>
            </div>
          </td>
          <td class="text-right">R$ ${item.PrecoBase.toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</td>
          <td class="text-right">
             ${
               item.IPI > 0
                 ? `<div>R$ ${item.IPI.toLocaleString("pt-BR", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                   })}</div>`
                 : "-"
             }
          </td>
          <td class="text-right">
             ${
               item.ST > 0
                 ? `<div>R$ ${item.ST.toLocaleString("pt-BR", {
                     minimumFractionDigits: 2,
                     maximumFractionDigits: 2,
                   })}</div>`
                 : "-"
             }
          </td>
          <td class="text-center">
             <div class="qtd-wrapper center">
                <button class="btn-micro" onclick="WidgetProdutos.editarQuantidadeCarrinho('${
                  item.ID
                }', -1)">-</button>
                <input type="number" readonly value="${
                  item.Quantidade
                }" class="input-micro" />
                <button class="btn-micro" onclick="WidgetProdutos.editarQuantidadeCarrinho('${
                  item.ID
                }', 1)">+</button>
             </div>
          </td>
          <td class="text-right font-bold">
            <div>R$ ${subtotalBase.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}</div>
          </td>
          <td class="text-center desconto-cell">
            <div class="desconto-item-container" style="display: flex; flex-direction: column; gap: 4px;">
              <div class="desconto-item-row">
                <span class="desconto-item-label">%</span>
                <input 
                  type="number" 
                  id="desconto-percent-${item.ID}"
                  class="desconto-item-input ${classPercent}" 
                  value="${item.descontoPercent || ""}"
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.01"
                  onchange="WidgetProdutos.aplicarDescontoItem('${
                    item.ID
                  }', 'percent', this.value)"
                  onkeydown="if(event.key==='Enter'){this.blur();}"
                />
              </div>
              <div class="desconto-item-row">
                <span class="desconto-item-label">R$</span>
                <input 
                  type="number" 
                  id="desconto-valor-${item.ID}"
                  class="desconto-item-input ${classValor}" 
                  value="${item.descontoValor || ""}"
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  onchange="WidgetProdutos.aplicarDescontoItem('${
                    item.ID
                  }', 'valor', this.value)"
                  onkeydown="if(event.key==='Enter'){this.blur();}"
                />
              </div>
            </div>
          </td>
          <td class="text-right font-bold">
            <div style="color: var(--color-primary);">R$ ${subtotalFinal.toLocaleString(
              "pt-BR",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}</div>
          </td>
          <td class="text-center">
            <button class="btn-icon-remove" onclick="WidgetProdutos.removerDoCarrinho('${
              item.ID
            }')" title="Remover item">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
               </svg>
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Atualiza state com desconto de itens
    state.desconto.totalDescontoItens = totalDescontoItens;

    // Total do pedido = subtotal - descontos dos itens
    var totalFinal = totalGeral;
    var descontoTotal = totalDescontoItens;

    // Mostra/esconde linha de desconto
    if (descontoResumoRow) {
      if (descontoTotal > 0) {
        descontoResumoRow.style.display = "";
        if (descontoTotalValor) {
          descontoTotalValor.textContent =
            "- R$ " +
            descontoTotal.toLocaleString("pt-BR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
        }
      } else {
        descontoResumoRow.style.display = "none";
      }
    }

    if (totalEl)
      totalEl.textContent =
        "R$ " +
        totalFinal.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }

  /**
   * Calcula totais para validação de desconto
   * @returns {Object} totais - Objeto com subtotal sem impostos, limite, usado, disponível
   */
  function calcularTotaisDesconto() {
    var subtotalSemImpostos = 0;
    var descontoUsado = 0;

    state.carrinho.forEach(function (item) {
      subtotalSemImpostos += (item.PrecoBase || 0) * item.Quantidade;
      descontoUsado += (item.descontoValor || 0) * item.Quantidade;
    });

    var limiteMaximo =
      (subtotalSemImpostos * WidgetConfig.DESCONTO.LIMITE_PERCENTUAL) / 100;
    var disponivel = Math.max(0, limiteMaximo - descontoUsado);
    var percentualUsado =
      limiteMaximo > 0 ? (descontoUsado / limiteMaximo) * 100 : 0;

    return {
      subtotalSemImpostos: subtotalSemImpostos,
      limiteMaximo: limiteMaximo,
      descontoUsado: descontoUsado,
      disponivel: disponivel,
      percentualUsado: Math.min(100, percentualUsado),
    };
  }

  /**
   * Atualiza a barra de limite de desconto
   */
  function atualizarBarraLimite(totais) {
    var maxValorEl = document.getElementById("desconto-max-valor");
    var progressFill = document.getElementById("desconto-progress-fill");
    var percentEl = document.getElementById("desconto-usado-percent");

    if (maxValorEl) {
      maxValorEl.textContent = "R$ " + formatarMoeda(totais.limiteMaximo);
    }

    if (progressFill) {
      progressFill.style.width = totais.percentualUsado + "%";

      // Cores baseadas no uso
      progressFill.classList.remove("warning", "danger");
      if (totais.percentualUsado >= 100) {
        progressFill.classList.add("danger");
      } else if (totais.percentualUsado >= 80) {
        progressFill.classList.add("warning");
      }
    }

    if (percentEl) {
      percentEl.textContent = Math.round(totais.percentualUsado) + "%";
      percentEl.classList.remove("warning", "danger");
      if (totais.percentualUsado >= 100) {
        percentEl.classList.add("danger");
      } else if (totais.percentualUsado >= 80) {
        percentEl.classList.add("warning");
      }
    }
  }

  /**
   * Aplica desconto em um item específico
   * @param {string} produtoId - ID do produto
   * @param {string} tipo - "percent" ou "valor"
   * @param {string} valor - Valor digitado
   */
  function aplicarDescontoItem(produtoId, tipo, valor) {
    var item = state.carrinho.find(function (i) {
      return i.ID === produtoId;
    });

    if (!item) return;

    var valorNum = parseFloat(valor) || 0;

    // Calcula o desconto em R$ baseado no tipo
    var descontoUnitario = 0;
    var descontoPercent = 0;

    if (tipo === "percent") {
      descontoPercent = Math.max(0, Math.min(100, valorNum));
      descontoUnitario = (item.PrecoBase * descontoPercent) / 100;
    } else {
      descontoUnitario = Math.max(0, valorNum);
      descontoPercent =
        item.PrecoBase > 0 ? (descontoUnitario / item.PrecoBase) * 100 : 0;
    }

    // Calcula o novo total de desconto para validar limite
    var novoDescontoItem = descontoUnitario * item.Quantidade;
    var totaisAtuais = calcularTotaisDesconto();

    // Remove o desconto atual do item para recalcular
    var descontoAtualItem = (item.descontoValor || 0) * item.Quantidade;
    var descontoSemEsteItem = totaisAtuais.descontoUsado - descontoAtualItem;
    var novoTotalDesconto = descontoSemEsteItem + novoDescontoItem;

    // Valida se ultrapassa o limite
    if (novoTotalDesconto > totaisAtuais.limiteMaximo) {
      // Mostra alerta e ajusta para o máximo
      mostrarAlertaDesconto(
        "O desconto máximo permitido é de " +
          WidgetConfig.DESCONTO.LIMITE_PERCENTUAL +
          "% do valor das mercadorias (R$ " +
          formatarMoeda(totaisAtuais.limiteMaximo) +
          ")."
      );

      // Calcula o máximo que pode aplicar neste item
      var disponivelParaItem = totaisAtuais.limiteMaximo - descontoSemEsteItem;
      descontoUnitario = Math.max(0, disponivelParaItem / item.Quantidade);
      descontoPercent =
        item.PrecoBase > 0 ? (descontoUnitario / item.PrecoBase) * 100 : 0;
    }

    // Aplica os valores
    item.descontoValor = descontoUnitario;
    item.descontoPercent = descontoPercent;

    // Re-renderiza a tabela
    renderizarCarrinhoModal();
    renderizarCarrinho();
  }

  /**
   * Mostra alerta de desconto excedido
   */
  function mostrarAlertaDesconto(mensagem) {
    var alert = document.getElementById("desconto-alert");
    var msgEl = document.getElementById("desconto-alert-message");

    if (alert && msgEl) {
      msgEl.textContent = mensagem;
      alert.classList.remove("hidden");

      // Auto-fecha após timeout
      setTimeout(function () {
        fecharAlertaDesconto();
      }, WidgetConfig.DESCONTO.ALERT_TIMEOUT);
    }
  }

  /**
   * Fecha alerta de desconto
   */
  function fecharAlertaDesconto() {
    var alert = document.getElementById("desconto-alert");
    if (alert) {
      alert.classList.add("hidden");
    }
  }

  /**
   * Abre o modal de confirmação genérico
   */
  function mostrarConfirmacao(titulo, mensagem, callback) {
    var tituloEl = document.getElementById("modal-confirmacao-titulo");
    var msgEl = document.getElementById("modal-confirmacao-msg");
    var btnConfirm = document.getElementById("btn-confirmar-acao");

    if (tituloEl) tituloEl.textContent = titulo;
    if (msgEl) msgEl.textContent = mensagem;

    if (btnConfirm) {
      // Remove listeners antigos (cloneNode hack ou apenas sobescrever onclick)
      btnConfirm.onclick = function () {
        callback();
        WidgetUI.fecharModal("modal-confirmacao");
      };
    }

    WidgetUI.abrirModal("modal-confirmacao");
  }

  /**
   * Salva as alterações do carrinho e recalcula impostos se houver descontos
   * Chama a API de recálculo de impostos quando há descontos aplicados E houve alteração
   */
  function salvarAlteracoesCarrinho() {
    // Verifica se houve alteração nos descontos desde a abertura do modal
    if (!houveAlteracaoDescontos()) {
      // Não houve alteração, apenas fecha o modal
      WidgetUI.log("Nenhuma alteração nos descontos", "success");
      renderizarCarrinho();
      WidgetUI.fecharModal("modal-carrinho");
      return;
    }

    // Verifica se há descontos aplicados
    var temDesconto = state.carrinho.some(function (item) {
      return (item.descontoPercent || 0) > 0 || (item.descontoValor || 0) > 0;
    });

    if (!temDesconto) {
      // Se não há desconto, apenas fecha o modal e atualiza o carrinho
      WidgetUI.log("Alterações salvas (sem desconto)", "success");
      renderizarCarrinho();
      WidgetUI.fecharModal("modal-carrinho");
      return;
    }

    // Se há desconto E houve alteração, precisa recalcular impostos
    WidgetUI.log("Recalculando impostos com desconto...", "success");
    mostrarLoadingRecalculo(true);

    // Monta os dados para enviar à API de recálculo
    // IMPORTANTE: Inclui percentuais sobre preço base E sobre preço total
    var dadosRecalculo = {
      clienteId: state.clienteId,
      itens: state.carrinho.map(function (item) {
        var precoBase = item.PrecoBase || 0;
        var ipi = item.IPI || 0;
        var st = item.ST || 0;
        var precoTotal = item.Preco || precoBase + ipi + st; // base + IPI + ST
        var descontoValorUnit = item.descontoValor || 0;

        // Percentual de desconto sobre o preço BASE (sem ST/IPI)
        var descontoPercentSobreBase =
          precoBase > 0 ? (descontoValorUnit / precoBase) * 100 : 0;

        // Percentual de desconto sobre o preço TOTAL (com ST/IPI)
        // Este é o valor que você precisa: ex: 5,00 / 51,27 × 100 = 9,75%
        var descontoPercentSobreTotal =
          precoTotal > 0 ? (descontoValorUnit / precoTotal) * 100 : 0;

        // Preços com desconto aplicado
        var precoBaseComDesconto = precoBase - descontoValorUnit;
        var precoTotalComDesconto = precoTotal - descontoValorUnit;

        return {
          // Identificação do produto
          produtoId: item.ID,
          produtoCodigo: item.Codigo || "",
          produtoNome: item.Nome || "",
          quantidade: item.Quantidade,
          unidade: item.Unidade || "UN",

          // Preços originais
          precoBase: precoBase, // Valor unitário SEM impostos
          ipiOriginal: ipi, // IPI unitário original
          stOriginal: st, // ST unitário original
          precoTotal: precoTotal, // Preço total (base + IPI + ST)

          // Desconto aplicado - VALOR
          descontoValorUnitario: descontoValorUnit, // R$ por unidade
          descontoValorTotal: descontoValorUnit * item.Quantidade, // R$ total do item

          // Desconto aplicado - PERCENTUAIS
          descontoPercentSobreBase: descontoPercentSobreBase, // % sobre PrecoBase (sem ST/IPI)
          descontoPercentSobreTotal: descontoPercentSobreTotal, // % sobre PrecoTotal (COM ST/IPI) ← ESSE QUE VOCÊ PRECISA

          // Valores com desconto (para conferência)
          precoBaseComDesconto: precoBaseComDesconto, // Preço base já com desconto
          precoTotalComDesconto: precoTotalComDesconto, // Preço total já com desconto
        };
      }),
    };

    // Log dos dados que seriam enviados à API
    console.log("=".repeat(60));
    console.log("🔄 DADOS PARA RECÁLCULO DE IMPOSTOS:");
    console.log("=".repeat(60));
    console.log("\n📋 JSON para API:");
    console.log(JSON.stringify(dadosRecalculo, null, 2));
    console.log("\n" + "-".repeat(60));
    console.log("📊 RESUMO DOS DESCONTOS:");
    dadosRecalculo.itens.forEach(function (item, index) {
      console.log(
        "  " +
          (index + 1) +
          ". " +
          item.produtoNome +
          "\n     Preço Base (sem ST/IPI): R$" +
          item.precoBase.toFixed(2) +
          "\n     Preço Total (com ST/IPI): R$" +
          item.precoTotal.toFixed(2) +
          " (IPI: R$" +
          item.ipiOriginal.toFixed(2) +
          " + ST: R$" +
          item.stOriginal.toFixed(2) +
          ")" +
          "\n     Desconto: R$" +
          item.descontoValorUnitario.toFixed(2) +
          "\n     → % sobre Base (sem ST/IPI): " +
          item.descontoPercentSobreBase.toFixed(2) +
          "%" +
          "\n     → % sobre Total (COM ST/IPI): " +
          item.descontoPercentSobreTotal.toFixed(2) +
          "% ← VOCÊ PRECISA DESSE"
      );
    });
    console.log("=".repeat(60));

    // TODO: Substituir pelo call real da API
    // WidgetAPI.recalcularImpostos(dadosRecalculo)
    //   .then(function(resultado) { ... })
    //   .catch(function(err) { ... });

    // SIMULAÇÃO: Timer fixo para testar o loading
    setTimeout(function () {
      // Simula atualização dos valores de IPI e ST recalculados
      // Na implementação real, esses valores virão da API
      state.carrinho.forEach(function (item) {
        if ((item.descontoPercent || 0) > 0 || (item.descontoValor || 0) > 0) {
          // Simula recálculo: reduz proporcionalmente IPI e ST baseado no desconto
          var percentualDesconto = 0;
          if (item.descontoPercent > 0) {
            percentualDesconto = item.descontoPercent / 100;
          } else if (item.descontoValor > 0 && item.PrecoBase > 0) {
            percentualDesconto = item.descontoValor / item.PrecoBase;
          }

          // Valores recalculados (simulação)
          var ipiRecalculado = (item.IPI || 0) * (1 - percentualDesconto);
          var stRecalculado = (item.ST || 0) * (1 - percentualDesconto);

          // Armazena os valores originais e recalculados para exibição
          item.IPIOriginal = item.IPI;
          item.STOriginal = item.ST;
          item.IPIRecalculado = ipiRecalculado;
          item.STRecalculado = stRecalculado;

          // Atualiza com valores recalculados
          item.IPI = ipiRecalculado;
          item.ST = stRecalculado;

          // Recalcula preço total com novos impostos
          item.Preco = (item.PrecoBase || 0) + ipiRecalculado + stRecalculado;

          console.log(
            "📊 Item recalculado: " + item.Nome,
            "\n   Desconto: " + (percentualDesconto * 100).toFixed(2) + "%",
            "\n   IPI: " +
              (item.IPIOriginal || 0).toFixed(2) +
              " → " +
              ipiRecalculado.toFixed(2),
            "\n   ST: " +
              (item.STOriginal || 0).toFixed(2) +
              " → " +
              stRecalculado.toFixed(2)
          );
        }
      });

      // Esconde loading
      mostrarLoadingRecalculo(false);

      // Atualiza a visualização
      renderizarCarrinhoModal();
      renderizarCarrinho();

      // Log de sucesso
      WidgetUI.log("Impostos recalculados com sucesso!", "success");
      console.log("✅ Recálculo de impostos concluído!");

      // Fecha o modal
      WidgetUI.fecharModal("modal-carrinho");
    }, 2000); // 2 segundos de delay para simular a chamada de API
  }

  /**
   * Mostra/esconde o overlay de loading de recálculo
   * @param {boolean} mostrar - true para mostrar, false para esconder
   */
  function mostrarLoadingRecalculo(mostrar) {
    var loadingEl = document.getElementById("carrinho-recalculo-loading");
    var btnSalvar = document.getElementById("btn-salvar-carrinho");

    if (loadingEl) {
      if (mostrar) {
        loadingEl.classList.remove("hidden");
      } else {
        loadingEl.classList.add("hidden");
      }
    }

    // Desabilita o botão durante o loading
    if (btnSalvar) {
      btnSalvar.disabled = mostrar;
      if (mostrar) {
        btnSalvar.style.opacity = "0.6";
        btnSalvar.style.cursor = "not-allowed";
      } else {
        btnSalvar.style.opacity = "1";
        btnSalvar.style.cursor = "pointer";
      }
    }
  }

  /**
   * Edita a quantidade de um item no carrinho
   */
  function editarQuantidadeCarrinho(produtoId, delta) {
    var item = state.carrinho.find(function (i) {
      return i.ID === produtoId;
    });

    if (item) {
      var novaM = item.Quantidade + delta;

      if (novaM <= 0) {
        mostrarConfirmacao(
          "Remover Item",
          "A quantidade chegou a zero. Deseja remover este item?",
          function () {
            var index = state.carrinho.indexOf(item);
            if (index > -1) {
              state.carrinho.splice(index, 1);
              renderizarCarrinho();
              renderizarCarrinhoModal();
            }
          }
        );
        return;
      }

      item.Quantidade = novaM;
      item.Subtotal = item.Preco * item.Quantidade;

      // Atualiza tudo
      renderizarCarrinho();
      renderizarCarrinhoModal();
    }
  }

  /**
   * Remove item do carrinho
   */
  function removerDoCarrinho(produtoId) {
    var item = state.carrinho.find(function (i) {
      return i.ID === produtoId;
    });
    if (!item) return;

    mostrarConfirmacao(
      "Remover Item",
      "Deseja remover '" + item.Nome + "' do carrinho?",
      function () {
        var index = state.carrinho.indexOf(item);
        if (index > -1) {
          state.carrinho.splice(index, 1);
          renderizarCarrinho();
          renderizarCarrinhoModal(); // Se estiver aberto
        }
      }
    );
  }

  /**
   * Retorna o estado atual do carrinho
   */
  function getCarrinho() {
    return state.carrinho;
  }

  /**
   * Retorna o estado de descontos
   * @returns {Object} Estado com globalTipo, globalValor, totalDescontoItens, totalDescontoGlobal
   */
  function getDescontoState() {
    return state.desconto;
  }

  /**
   * Formata valor para moeda
   */
  function formatarMoeda(valor) {
    return valor.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
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
    getDescontoState: getDescontoState,
    toggleModoEdicao: toggleModoEdicao,
    editarQuantidadeCarrinho: editarQuantidadeCarrinho,
    salvarAlteracoesCarrinho: salvarAlteracoesCarrinho,
    // Funções de Desconto
    aplicarDescontoItem: aplicarDescontoItem,
    fecharAlertaDesconto: fecharAlertaDesconto,
  };
})();
