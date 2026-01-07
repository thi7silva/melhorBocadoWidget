/**
 * Widget de Pedidos - Módulo de Janela de Entrega
 * Arquivo: app/js/entrega.js
 *
 * Gerencia a seleção de data de entrega baseado nas regras de negócio.
 */

var WidgetEntrega = (function () {
  "use strict";

  // Estado do módulo
  var state = {
    janelaEntrega: [], // Dias permitidos ["Segunda-Feira", "Terça-Feira", ...]
    listaFeriados: [], // Lista de feriados/bloqueios [{dataBloqueio, dataCondicao}]
    datasDisponiveis: [],
    dataSelecionada: null,
  };

  // Mapeamento de dia da semana para nome em português
  var DIAS_SEMANA = [
    "Domingo",
    "Segunda-Feira",
    "Terça-Feira",
    "Quarta-Feira",
    "Quinta-Feira",
    "Sexta-Feira",
    "Sábado",
  ];

  // Meses em português para exibição
  var MESES = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  /**
   * Define a janela de entrega do cliente
   * @param {Array} janela - Lista de dias permitidos
   */
  function setJanelaEntrega(janela) {
    state.janelaEntrega = janela || [];
    WidgetUI.log("Janela de entrega definida: " + JSON.stringify(janela));
  }

  /**
   * Define a lista de feriados/datas bloqueadas
   * @param {Array} listaFeriados - Lista de bloqueios [{dataBloqueio, dataCondicao}]
   */
  function setListaFeriados(listaFeriados) {
    state.listaFeriados = listaFeriados || [];
    WidgetUI.log(
      "Lista de feriados definida: " + state.listaFeriados.length + " data(s)"
    );
  }

  /**
   * Converte data de formato DD/MM/YYYY para YYYY-MM-DD
   * @param {string} dataBR - Data no formato DD/MM/YYYY
   * @returns {string} Data no formato YYYY-MM-DD
   */
  function converterDataBRparaISO(dataBR) {
    if (!dataBR) return "";
    var partes = dataBR.split("/");
    if (partes.length !== 3) return dataBR; // Retorna original se não conseguir parsear
    return partes[2] + "-" + partes[1] + "-" + partes[0]; // YYYY-MM-DD
  }

  /**
   * Converte dataCondicao de formato DD/MM/YYYY HH:mm:ss para Date
   * @param {string} dataCondicaoStr - Data no formato DD/MM/YYYY HH:mm:ss
   * @returns {Date} Objeto Date
   */
  function parsearDataCondicao(dataCondicaoStr) {
    if (!dataCondicaoStr) return null;

    // Formato esperado: "07/01/2026 09:00:00"
    var partes = dataCondicaoStr.split(" ");
    var dataPartes = partes[0].split("/");
    var horaPartes = partes[1] ? partes[1].split(":") : ["0", "0", "0"];

    return new Date(
      parseInt(dataPartes[2]), // ano
      parseInt(dataPartes[1]) - 1, // mês (0-indexed)
      parseInt(dataPartes[0]), // dia
      parseInt(horaPartes[0]), // hora
      parseInt(horaPartes[1]), // minuto
      parseInt(horaPartes[2] || 0) // segundo
    );
  }

  /**
   * Verifica se uma data está bloqueada por feriado ou condição
   * Regra:
   * - Se dataCondicao existe e agora > dataCondicao → bloqueia
   * - Se dataCondicao é null/vazia → sempre bloqueia
   * @param {string} dataISO - Data no formato ISO (YYYY-MM-DD)
   * @returns {boolean} true se a data está bloqueada
   */
  function isDataBloqueada(dataISO) {
    if (!state.listaFeriados || state.listaFeriados.length === 0) {
      return false;
    }

    var agora = new Date();

    for (var i = 0; i < state.listaFeriados.length; i++) {
      var feriado = state.listaFeriados[i];
      var dataBloqueio = feriado.dataBloqueio;

      // Converte dataBloqueio de DD/MM/YYYY para YYYY-MM-DD para comparação
      var dataBloqueioISO = converterDataBRparaISO(dataBloqueio);

      // Verifica se é a data que estamos checando
      if (dataBloqueioISO === dataISO) {
        var dataCondicaoStr = feriado.dataCondicao;

        // Se dataCondicao é null ou string vazia, sempre bloqueia
        if (!dataCondicaoStr || dataCondicaoStr.trim() === "") {
          WidgetUI.log(
            "Data " + dataISO + " bloqueada (sem condição - feriado)",
            "warning"
          );
          return true;
        }

        // Se dataCondicao existe, verifica se agora > dataCondicao
        var dataCondicao = parsearDataCondicao(dataCondicaoStr);

        if (!dataCondicao || isNaN(dataCondicao.getTime())) {
          // Se não conseguiu parsear, bloqueia por segurança
          WidgetUI.log(
            "Data " + dataISO + " bloqueada (erro ao parsear condição)",
            "warning"
          );
          return true;
        }

        if (agora > dataCondicao) {
          WidgetUI.log(
            "Data " +
              dataISO +
              " bloqueada (condição expirada em " +
              dataCondicao.toLocaleString("pt-BR") +
              ")",
            "warning"
          );
          return true;
        } else {
          WidgetUI.log(
            "Data " +
              dataISO +
              " disponível (condição válida até " +
              dataCondicao.toLocaleString("pt-BR") +
              ")",
            "success"
          );
          return false;
        }
      }
    }

    return false;
  }

  /**
   * Calcula o ponto de partida (start point) baseado nas regras de lead time
   * @returns {Date} Data inicial para considerar entregas
   */
  function calcularStartPoint() {
    var agora = new Date();
    var diaSemana = agora.getDay(); // 0 = Domingo, 6 = Sábado
    var hora = agora.getHours();
    var diasAdicionar = 0;

    if (diaSemana === 6) {
      // Sábado: +3 dias
      diasAdicionar = 3;
    } else if (diaSemana === 0) {
      // Domingo: +2 dias
      diasAdicionar = 2;
    } else {
      // Dia útil (Seg-Sex)
      if (hora < 16) {
        // Antes das 16:00: +1 dia
        diasAdicionar = 1;
      } else {
        // Após 16:00: +2 dias
        diasAdicionar = 2;
      }
    }

    var startPoint = new Date(agora);
    startPoint.setDate(startPoint.getDate() + diasAdicionar);
    startPoint.setHours(0, 0, 0, 0); // Reseta para meia-noite

    WidgetUI.log(
      "Start Point calculado: " +
        startPoint.toLocaleDateString("pt-BR") +
        " (+" +
        diasAdicionar +
        " dias)"
    );

    return startPoint;
  }

  /**
   * Gera a lista de datas disponíveis para entrega
   * @returns {Array} Lista de objetos com data e informações
   */
  function gerarDatasDisponiveis() {
    var startPoint = calcularStartPoint();
    var datas = [];
    var dataAtual = new Date(startPoint);

    // Itera pelos próximos 30 dias
    for (var i = 0; i < 30; i++) {
      var diaSemanaIndex = dataAtual.getDay();
      var nomeDia = DIAS_SEMANA[diaSemanaIndex];

      // Verifica se a data é permitida
      var permitida = false;

      if (state.janelaEntrega.length === 0) {
        // Lista vazia: aceita qualquer data
        permitida = true;
      } else {
        // Verifica se o dia está na lista
        permitida = state.janelaEntrega.some(function (dia) {
          return dia.toLowerCase() === nomeDia.toLowerCase();
        });
      }

      // Gera data ISO para verificação de bloqueio
      var dataISOCheck = dataAtual.toISOString().split("T")[0];

      if (permitida) {
        // Verifica se a data está bloqueada por feriado/condição
        var bloqueada = isDataBloqueada(dataISOCheck);

        datas.push({
          data: new Date(dataAtual),
          dia: dataAtual.getDate(),
          mes: dataAtual.getMonth(),
          ano: dataAtual.getFullYear(),
          nomeDia: nomeDia,
          nomeMes: MESES[dataAtual.getMonth()],
          dataFormatada: dataAtual.toLocaleDateString("pt-BR"),
          dataISO: dataISOCheck,
          bloqueada: bloqueada, // Flag para indicar se é feriado/bloqueada
        });
      }

      // Avança para o próximo dia
      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    state.datasDisponiveis = datas;
    WidgetUI.log("Datas disponíveis geradas: " + datas.length);

    return datas;
  }

  /**
   * Abre o modal de seleção de entrega
   */
  function abrirModalEntrega() {
    // Gera as datas disponíveis
    var datas = gerarDatasDisponiveis();

    // Renderiza o calendário
    renderizarCalendario(datas);

    // Abre o modal
    WidgetUI.abrirModal("modal-entrega");
  }

  /**
   * Renderiza o calendário de datas disponíveis
   * @param {Array} datas - Lista de datas disponíveis
   */
  function renderizarCalendario(datas) {
    var container = document.getElementById("entrega-datas-grid");
    if (!container) return;

    if (datas.length === 0) {
      container.innerHTML = `
        <div class="entrega-vazio">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
          </svg>
          <p>Nenhuma data disponível</p>
          <span>Não há datas de entrega disponíveis para este cliente.</span>
        </div>
      `;
      return;
    }

    // Agrupa datas por mês para melhor visualização
    var datasPorMes = {};
    datas.forEach(function (d) {
      var chave = d.nomeMes + " " + d.ano;
      if (!datasPorMes[chave]) {
        datasPorMes[chave] = [];
      }
      datasPorMes[chave].push(d);
    });

    var html = "";

    // Renderiza cada mês
    for (var mes in datasPorMes) {
      if (datasPorMes.hasOwnProperty(mes)) {
        html += '<div class="entrega-mes-grupo">';
        html += '<h4 class="entrega-mes-titulo">' + mes + "</h4>";
        html += '<div class="entrega-datas-lista">';

        datasPorMes[mes].forEach(function (d) {
          var selecionada =
            state.dataSelecionada &&
            state.dataSelecionada.dataISO === d.dataISO;

          // Monta as classes do card
          var classes = ["entrega-data-card"];
          if (selecionada) classes.push("selecionada");
          if (d.bloqueada) classes.push("bloqueada");

          // Se bloqueada, não adiciona onclick
          var onclickAttr = d.bloqueada
            ? ""
            : `onclick="WidgetEntrega.selecionarData('${d.dataISO}')"`;

          html += `
            <div class="${classes.join(" ")}" 
                 data-iso="${d.dataISO}" 
                 ${onclickAttr}
                 ${d.bloqueada ? 'title="Feriado - Data indisponível"' : ""}>
              <div class="entrega-data-dia">${d.dia}</div>
              <div class="entrega-data-semana">${d.nomeDia.split("-")[0]}</div>
              ${
                d.bloqueada
                  ? '<div class="entrega-data-badge">Feriado</div>'
                  : ""
              }
            </div>
          `;
        });

        html += "</div>";
        html += "</div>";
      }
    }

    container.innerHTML = html;

    // Atualiza informação do resumo
    atualizarResumoEntrega();
  }

  /**
   * Seleciona uma data de entrega
   * @param {string} dataISO - Data no formato ISO (YYYY-MM-DD)
   */
  function selecionarData(dataISO) {
    // Encontra a data na lista
    var dataEncontrada = state.datasDisponiveis.find(function (d) {
      return d.dataISO === dataISO;
    });

    if (!dataEncontrada) return;

    state.dataSelecionada = dataEncontrada;

    // Atualiza visual
    var cards = document.querySelectorAll(".entrega-data-card");
    cards.forEach(function (card) {
      card.classList.remove("selecionada");
      if (card.getAttribute("data-iso") === dataISO) {
        card.classList.add("selecionada");
      }
    });

    // Atualiza resumo
    atualizarResumoEntrega();

    WidgetUI.log(
      "Data selecionada: " + dataEncontrada.dataFormatada,
      "success"
    );
  }

  /**
   * Atualiza o resumo da data selecionada
   */
  function atualizarResumoEntrega() {
    var resumoEl = document.getElementById("entrega-data-selecionada");
    var btnConfirmar = document.getElementById("btn-confirmar-entrega");

    if (state.dataSelecionada) {
      if (resumoEl) {
        resumoEl.innerHTML = `
          <div class="entrega-resumo-data">
            <span class="entrega-resumo-dia">${state.dataSelecionada.dia}</span>
            <div class="entrega-resumo-info">
              <span class="entrega-resumo-semana">${state.dataSelecionada.nomeDia}</span>
              <span class="entrega-resumo-mes">${state.dataSelecionada.nomeMes} de ${state.dataSelecionada.ano}</span>
            </div>
          </div>
        `;
        resumoEl.classList.add("ativa");
      }
      if (btnConfirmar) {
        btnConfirmar.disabled = false;
      }
    } else {
      if (resumoEl) {
        resumoEl.innerHTML =
          '<span class="texto-placeholder">Selecione uma data acima</span>';
        resumoEl.classList.remove("ativa");
      }
      if (btnConfirmar) {
        btnConfirmar.disabled = true;
      }
    }
  }

  /**
   * Confirma a seleção de entrega e fecha o modal
   */
  function confirmarEntrega() {
    if (!state.dataSelecionada) {
      WidgetUI.log("Nenhuma data selecionada", "error");
      return;
    }

    // Captura observações de entrega
    var observacoesEl = document.getElementById("observacoes-entrega");
    var observacoesEntrega = observacoesEl ? observacoesEl.value : "";

    WidgetUI.log(
      "Entrega confirmada para: " + state.dataSelecionada.dataFormatada,
      "success"
    );

    // Fecha o modal
    WidgetUI.fecharModal("modal-entrega");

    // Continua para finalizar o pedido
    WidgetApp.finalizarPedidoComEntrega(
      state.dataSelecionada,
      observacoesEntrega
    );
  }

  /**
   * Retorna a data selecionada
   * @returns {Object|null} Dados da data selecionada
   */
  function getDataSelecionada() {
    return state.dataSelecionada;
  }

  /**
   * Renderiza o preview de datas na aba de configuração
   * Mostra as primeiras 5 datas disponíveis para o vendedor ter visibilidade
   */
  function renderizarPreviewDatas() {
    var container = document.getElementById("entrega-preview-lista");
    if (!container) return;

    // Gera as datas disponíveis
    var datas = gerarDatasDisponiveis();

    // Filtra apenas datas não bloqueadas para o preview
    var datasDisponiveis = datas.filter(function (d) {
      return !d.bloqueada;
    });
    var datasBloqueadas = datas.filter(function (d) {
      return d.bloqueada;
    });

    if (datas.length === 0) {
      container.innerHTML = `
        <div class="entrega-vazio" style="padding: 16px; flex-direction: row; gap: 12px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span style="font-size: 0.85rem; color: var(--color-text-muted);">
            Nenhuma data de entrega disponível para este cliente
          </span>
        </div>
      `;
      return;
    }

    // Mostra as primeiras 6 datas (incluindo bloqueadas para o vendedor ver)
    var datasPreview = datas.slice(0, 6);
    var html = "";

    datasPreview.forEach(function (d) {
      var classeExtra = d.bloqueada ? "bloqueada" : "";
      html += `
        <div class="entrega-preview-card ${classeExtra}" ${
        d.bloqueada ? 'title="Feriado - Indisponível"' : ""
      }>
          <span class="dia-numero">${d.dia}/${(d.mes + 1)
        .toString()
        .padStart(2, "0")}</span>
          <span class="dia-semana">${d.nomeDia.split("-")[0]}</span>
          ${
            d.bloqueada
              ? '<span class="preview-badge-feriado">Feriado</span>'
              : ""
          }
        </div>
      `;
    });

    // Se houver mais datas, mostra indicador
    var datasRestantes = datas.length - 6;
    if (datasRestantes > 0) {
      html += `
        <div class="entrega-preview-mais">
          +${datasRestantes} datas
        </div>
      `;
    }

    container.innerHTML = html;
  }

  /**
   * Reseta o estado do módulo
   */
  function reset() {
    state.dataSelecionada = null;
    state.datasDisponiveis = [];

    // Limpa campo de observações
    var observacoesEl = document.getElementById("observacoes-entrega");
    if (observacoesEl) {
      observacoesEl.value = "";
    }
  }

  // API Pública do Módulo
  return {
    setJanelaEntrega: setJanelaEntrega,
    setListaFeriados: setListaFeriados,
    abrirModalEntrega: abrirModalEntrega,
    selecionarData: selecionarData,
    confirmarEntrega: confirmarEntrega,
    getDataSelecionada: getDataSelecionada,
    renderizarPreviewDatas: renderizarPreviewDatas,
    reset: reset,
  };
})();
