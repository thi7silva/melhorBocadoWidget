# 📦 Especificação: Edição e Visualização de Pedidos

**Projeto:** Melhor Bocado - Widget de Pedidos  
**Data:** 13/01/2026  
**Versão:** 1.0  
**Status:** Em Planejamento

---

## 📋 Sumário

1. [Visão Geral](#1-visão-geral)
2. [Modos de Operação do Widget](#2-modos-de-operação-do-widget)
3. [Fluxo do Usuário](#3-fluxo-do-usuário)
4. [APIs Necessárias](#4-apis-necessárias)
5. [Parâmetros de URL](#5-parâmetros-de-url)
6. [Interface - Tela de Listagem](#6-interface---tela-de-listagem)
7. [Interface - Modo Edição](#7-interface---modo-edição)
8. [Interface - Modo Visualização](#8-interface---modo-visualização)
9. [Regras de Negócio](#9-regras-de-negócio)
10. [Checklist de Implementação](#10-checklist-de-implementação)

---

## 1. Visão Geral

### 1.1 Objetivo

Expandir o widget de pedidos para permitir:

- **Listar** pedidos recentes de um cliente (últimos 3 meses)
- **Editar** pedidos que ainda podem ser alterados
- **Visualizar** pedidos fechados/finalizados (somente leitura)
- **Cancelar** pedidos quando permitido

### 1.2 Princípios

- Reutilizar ao máximo a interface existente
- Lógica de permissões centralizada no backend (API retorna flags)
- Interface clara sobre o modo atual (criação vs edição vs visualização)
- Acesso direto via URL para integração com outros módulos do Zoho

---

## 2. Modos de Operação do Widget

O widget passará a operar em 4 modos distintos:

| Modo             | Descrição                                    | Acesso                    |
| ---------------- | -------------------------------------------- | ------------------------- |
| **Criação**      | Fluxo atual - cria novo pedido               | Padrão ao abrir o widget  |
| **Listagem**     | Mostra pedidos recentes do cliente           | Após selecionar cliente   |
| **Edição**       | Edita um pedido existente (campos liberados) | Clique em "Editar" ou URL |
| **Visualização** | Exibe resumo do pedido (somente leitura)     | Clique em "Ver" ou URL    |

---

## 3. Fluxo do Usuário

### 3.1 Fluxo Completo (Diagrama)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ┌──────────────┐                                                 │
│    │ Abrir Widget │                                                 │
│    └──────┬───────┘                                                 │
│           │                                                         │
│           ▼                                                         │
│    ┌──────────────────────────────────┐                             │
│    │ Verificar parâmetros de URL      │                             │
│    │ (pedidoId, clienteId, modo)      │                             │
│    └──────┬───────────────────────────┘                             │
│           │                                                         │
│     ┌─────┴─────┬─────────────────┬─────────────────┐               │
│     ▼           ▼                 ▼                 ▼               │
│  [Nenhum]   [clienteId]     [pedidoId +       [pedidoId +           │
│     │           │            modo=editar]      modo=visualizar]     │
│     │           │                 │                 │               │
│     ▼           ▼                 ▼                 ▼               │
│ ┌────────┐  ┌──────────┐    ┌──────────┐    ┌──────────────┐        │
│ │ Buscar │  │ Carregar │    │ MODO     │    │ MODO         │        │
│ │Cliente │  │ Listagem │    │ EDIÇÃO   │    │ VISUALIZAÇÃO │        │
│ └───┬────┘  │ Pedidos  │    └──────────┘    └──────────────┘        │
│     │       └────┬─────┘                                            │
│     ▼            │                                                  │
│ ┌────────────┐   │                                                  │
│ │ Selecionar │   │                                                  │
│ │ Cliente    │   │                                                  │
│ └─────┬──────┘   │                                                  │
│       │          │                                                  │
│       ▼          ▼                                                  │
│  ┌─────────────────────────────────────────┐                        │
│  │         TELA DE LISTAGEM                │                        │
│  │                                         │                        │
│  │   [➕ Novo Pedido]                      │                        │
│  │                                         │                        │
│  │   📋 Pedidos Recentes:                  │                        │
│  │   ┌───────────────────────────────┐     │                        │
│  │   │ Pedido #123 | R$ 2.450        │     │                        │
│  │   │ [👁️ Ver] [✏️ Editar] [❌]     │     │                        │
│  │   └───────────────────────────────┘     │                        │
│  └───────────────┬─────────────────────────┘                        │
│                  │                                                  │
│       ┌──────────┼──────────┐                                       │
│       ▼          ▼          ▼                                       │
│   [+ Novo]   [Editar]    [Ver]                                      │
│       │          │          │                                       │
│       ▼          ▼          ▼                                       │
│  ┌────────┐ ┌────────┐ ┌────────────┐                               │
│  │ MODO   │ │ MODO   │ │ MODO       │                               │
│  │CRIAÇÃO │ │EDIÇÃO  │ │VISUALIZAÇÃO│                               │
│  │(atual) │ │        │ │(resumo)    │                               │
│  └────────┘ └────────┘ └────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Descrição dos Fluxos

#### Fluxo A: Novo Pedido (Comportamento Atual)

1. Usuário busca e seleciona cliente
2. **[NOVO]** Widget mostra tela de listagem com pedidos recentes
3. Usuário clica em "Novo Pedido"
4. Segue fluxo atual (config → produtos → entrega → finalizar)

#### Fluxo B: Editar Pedido

1. Usuário seleciona cliente
2. Widget mostra tela de listagem
3. Usuário clica em "Editar" em um pedido
4. Widget carrega dados do pedido via API
5. Interface mostra banner "Editando Pedido #XYZ"
6. Usuário faz alterações
7. Clica em "Salvar Alterações"
8. Widget chama API de atualização

#### Fluxo C: Visualizar Pedido

1. Usuário seleciona cliente
2. Widget mostra tela de listagem
3. Usuário clica em "Ver" em um pedido
4. Widget carrega dados do pedido via API
5. Widget exibe tela de resumo (somente leitura)

#### Fluxo D: Acesso Direto via URL

1. Widget é aberto com parâmetros na URL
2. Widget detecta `pedidoId` e `modo`
3. Carrega pedido e exibe no modo apropriado (edição ou visualização)

---

## 4. APIs Necessárias

### 4.1 Resumo das APIs

| API                    | Método | Descrição                         | Prioridade |
| ---------------------- | ------ | --------------------------------- | ---------- |
| `listarPedidosCliente` | GET    | Lista pedidos do cliente          | Alta       |
| `consultaPedido`       | GET    | Retorna dados completos do pedido | Alta       |
| `atualizarPedido`      | POST   | Atualiza pedido existente         | Alta       |
| `cancelarPedido`       | POST   | Cancela um pedido                 | Média      |

---

### 4.2 API: listarPedidosCliente

**Endpoint:** `listarPedidosCliente`  
**Método:** GET  
**Descrição:** Retorna os pedidos do cliente dos últimos 3 meses

#### Parâmetros de Entrada

| Parâmetro   | Tipo   | Obrigatório | Descrição                               |
| ----------- | ------ | ----------- | --------------------------------------- |
| `clienteId` | string | Sim         | ID do cliente (campo `id` dos detalhes) |

#### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Pedidos encontrados",
  "total": 5,
  "data": [
    {
      "pedidoId": "12345",
      "numeroPedido": "MB-2026-0123",
      "dataCriacao": "2026-01-10",
      "dataEntrega": "2026-01-15",
      "status": "Pendente",
      "statusCor": "#FFA500",
      "totalFinal": 2450.0,
      "quantidadeItens": 8,

      "podeEditar": true,
      "podeCancelar": true,
      "motivoBloqueio": null
    },
    {
      "pedidoId": "12340",
      "numeroPedido": "MB-2026-0118",
      "dataCriacao": "2026-01-05",
      "dataEntrega": "2026-01-08",
      "status": "Entregue",
      "statusCor": "#28A745",
      "totalFinal": 890.0,
      "quantidadeItens": 3,

      "podeEditar": false,
      "podeCancelar": false,
      "motivoBloqueio": "Pedido já entregue"
    }
  ]
}
```

#### Campos da Resposta

| Campo             | Tipo        | Descrição                                 |
| ----------------- | ----------- | ----------------------------------------- |
| `pedidoId`        | string      | ID único do pedido (para chamadas de API) |
| `numeroPedido`    | string      | Número formatado para exibição            |
| `dataCriacao`     | string      | Data de criação (YYYY-MM-DD)              |
| `dataEntrega`     | string      | Data de entrega (YYYY-MM-DD)              |
| `status`          | string      | Status do pedido para exibição            |
| `statusCor`       | string      | Cor hexadecimal do status (para UI)       |
| `totalFinal`      | number      | Valor total do pedido                     |
| `quantidadeItens` | number      | Quantidade de itens no pedido             |
| `podeEditar`      | boolean     | Se o pedido pode ser editado              |
| `podeCancelar`    | boolean     | Se o pedido pode ser cancelado            |
| `motivoBloqueio`  | string/null | Motivo pelo qual não pode editar/cancelar |

#### Resposta Sem Pedidos

```json
{
  "success": true,
  "message": "Nenhum pedido encontrado",
  "total": 0,
  "data": []
}
```

---

### 4.3 API: consultaPedido

**Endpoint:** `consultaPedido`  
**Método:** GET  
**Descrição:** Retorna todos os dados de um pedido específico

#### Parâmetros de Entrada

| Parâmetro  | Tipo   | Obrigatório | Descrição    |
| ---------- | ------ | ----------- | ------------ |
| `pedidoId` | string | Sim         | ID do pedido |

#### Resposta de Sucesso

```json
{
  "success": true,
  "data": {
    "pedidoId": "12345",
    "numeroPedido": "MB-2026-0123",
    "status": "Pendente",
    "statusCor": "#FFA500",
    "dataCriacao": "2026-01-10T14:30:00",
    "dataUltimaAlteracao": "2026-01-12T09:15:00",
    "usuarioUltimaAlteracao": "João Silva",

    "podeEditar": true,
    "podeCancelar": true,

    "cliente": {
      "id": "999",
      "idCRM": "CRM-123",
      "razaoSocial": "Mercado ABC Ltda",
      "nomeFantasia": "Mercado ABC",
      "cnpjCpf": "12.345.678/0001-90",
      "codigoMB": "MB-001"
    },

    "vendedor": {
      "id": "55",
      "nome": "João Silva",
      "email": "joao@empresa.com"
    },

    "endereco": {
      "logradouro": "Rua das Flores, 123",
      "bairro": "Centro",
      "municipio": "São Paulo",
      "estado": "SP",
      "cep": "01234-567"
    },

    "entrega": {
      "dataISO": "2026-01-15",
      "dataFormatada": "15/01/2026",
      "diaSemana": "Quarta-feira",
      "observacoes": "Entregar pela manhã"
    },

    "configuracao": {
      "condicaoPagamentoId": "5",
      "condicaoPagamentoDisplay": "30/60/90 Dias",
      "tipoFrete": "cif",
      "natureza": "venda",
      "numeroPedidoCliente": "PC-2026-001",
      "observacoesGerais": "Cliente preferencial"
    },

    "itens": [
      {
        "produtoId": "P001",
        "produtoCodigo": "QMN500",
        "produtoNome": "Queijo Minas 500g",
        "imagemProduto": "https://...",
        "quantidade": 10,
        "unidade": "UN",

        "precoUnitario": 25.5,
        "precoBase": 22.0,
        "ipi": 1.5,
        "st": 2.0,

        "descontoPercentual": 5.0,
        "descontoValor": 1.1,
        "descontoTotal": 11.0,

        "subtotalBruto": 255.0,
        "subtotalLiquido": 244.0
      },
      {
        "produtoId": "P002",
        "produtoCodigo": "PRE1KG",
        "produtoNome": "Presunto Cozido 1kg",
        "imagemProduto": "https://...",
        "quantidade": 5,
        "unidade": "UN",

        "precoUnitario": 42.0,
        "precoBase": 38.0,
        "ipi": 2.0,
        "st": 2.0,

        "descontoPercentual": 0,
        "descontoValor": 0,
        "descontoTotal": 0,

        "subtotalBruto": 210.0,
        "subtotalLiquido": 210.0
      }
    ],

    "totais": {
      "quantidadeItens": 2,
      "subtotalTabela": 465.0,
      "descontoTotalValor": 11.0,
      "descontoTotalPercentual": 2.37,
      "totalFinal": 454.0
    }
  }
}
```

#### Mapeamento para Auto-Popular

| Campo da API                       | Destino no Widget                    |
| ---------------------------------- | ------------------------------------ |
| `cliente.*`                        | `state.clienteSelecionado`           |
| `configuracao.condicaoPagamentoId` | Select de condição de pagamento      |
| `configuracao.tipoFrete`           | Option card de frete                 |
| `configuracao.natureza`            | Option card de natureza              |
| `configuracao.numeroPedidoCliente` | Input #numero-pedido-cliente         |
| `configuracao.observacoesGerais`   | Textarea #observacoes                |
| `endereco.*`                       | Campos de endereço (somente leitura) |
| `entrega.*`                        | `WidgetEntrega.state`                |
| `itens[]`                          | `WidgetProdutos.carrinho`            |

---

### 4.4 API: atualizarPedido

**Endpoint:** `atualizarPedido`  
**Método:** POST  
**Descrição:** Atualiza um pedido existente

#### Payload de Entrada

```json
{
  "json": {
    "pedidoId": "12345",

    "configuracao": {
      "condicaoPagamentoId": "5",
      "tipoFrete": "cif",
      "natureza": "venda",
      "numeroPedidoCliente": "PC-2026-001",
      "observacoesGerais": "Cliente preferencial - ATUALIZADO"
    },

    "entrega": {
      "dataISO": "2026-01-16",
      "observacoes": "Mudou para quinta-feira"
    },

    "itens": [
      {
        "produtoId": "P001",
        "quantidade": 15,
        "descontoPercentual": 5.0,
        "subtotalLiquido": 366.0
      },
      {
        "produtoId": "P003",
        "quantidade": 8,
        "descontoPercentual": 0,
        "subtotalLiquido": 120.0
      }
    ],

    "totais": {
      "subtotalTabela": 510.0,
      "descontoTotalValor": 24.0,
      "totalFinal": 486.0
    },

    "meta": {
      "dataAlteracao": "2026-01-13T10:00:00",
      "usuarioAlteracao": "joao@empresa.com"
    }
  }
}
```

#### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Pedido atualizado com sucesso",
  "data": {
    "pedidoId": "12345",
    "numeroPedido": "MB-2026-0123",
    "dataAlteracao": "2026-01-13T10:00:00"
  }
}
```

#### Resposta de Erro

```json
{
  "success": false,
  "message": "Pedido não pode ser alterado",
  "error": "PEDIDO_BLOQUEADO",
  "details": "O pedido já foi faturado e não pode mais ser editado"
}
```

---

### 4.5 API: cancelarPedido

**Endpoint:** `cancelarPedido`  
**Método:** POST  
**Descrição:** Cancela um pedido

#### Payload de Entrada

```json
{
  "pedidoId": "12345",
  "motivo": "Cancelado a pedido do cliente"
}
```

#### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Pedido cancelado com sucesso",
  "data": {
    "pedidoId": "12345",
    "status": "Cancelado",
    "dataCancelamento": "2026-01-13T10:30:00"
  }
}
```

---

## 5. Parâmetros de URL

### 5.1 Parâmetros Suportados

| Parâmetro   | Tipo   | Valores                | Descrição                              |
| ----------- | ------ | ---------------------- | -------------------------------------- |
| `clienteId` | string | ID do cliente          | Pula busca, mostra listagem do cliente |
| `pedidoId`  | string | ID do pedido           | Carrega pedido específico              |
| `modo`      | string | `editar`, `visualizar` | Define o modo de operação              |

### 5.2 Exemplos de URLs

```
# Novo pedido (comportamento padrão)
widget.html

# Ir direto para listagem de pedidos de um cliente
widget.html?clienteId=999

# Editar um pedido específico
widget.html?pedidoId=12345&modo=editar

# Visualizar um pedido específico
widget.html?pedidoId=12345&modo=visualizar

# Se não passar modo, assume "visualizar" (mais seguro)
widget.html?pedidoId=12345
```

### 5.3 Lógica de Detecção

```javascript
function detectarModoOperacao() {
  return ZOHO.CREATOR.UTIL.getQueryParams().then(function (params) {
    // Prioridade 1: pedidoId (edição ou visualização)
    if (params.pedidoId) {
      return {
        modo: params.modo === "editar" ? "EDICAO" : "VISUALIZACAO",
        pedidoId: params.pedidoId,
      };
    }

    // Prioridade 2: clienteId (listagem)
    if (params.clienteId) {
      return {
        modo: "LISTAGEM",
        clienteId: params.clienteId,
      };
    }

    // Padrão: criação
    return { modo: "CRIACAO" };
  });
}
```

---

## 6. Interface - Tela de Listagem

### 6.1 Layout Desktop

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]                    Cliente: Mercado ABC                      │
│                            Vendedor: João Silva                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │              ➕ Criar Novo Pedido                        │  │  │
│  │  │              Iniciar um novo pedido para este cliente    │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ──────────────────────────────────────────────────────────    │  │
│  │                                                                │  │
│  │  📋 Pedidos Recentes (últimos 3 meses)                        │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  #MB-2026-0123                           🟡 Pendente     │  │  │
│  │  │  📅 Criado: 10/01/2026 | Entrega: 15/01/2026             │  │  │
│  │  │  💰 R$ 2.450,00  |  📦 8 itens                           │  │  │
│  │  │                                                          │  │  │
│  │  │  [👁️ Visualizar]  [✏️ Editar]  [❌ Cancelar]            │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐  │  │
│  │  │  #MB-2026-0118                           ✅ Entregue     │  │  │
│  │  │  📅 Criado: 05/01/2026 | Entrega: 08/01/2026             │  │  │
│  │  │  💰 R$ 890,00  |  📦 3 itens                             │  │  │
│  │  │                                                          │  │  │
│  │  │  [👁️ Visualizar]                                        │  │  │
│  │  │  ⚠️ Pedido já entregue - não pode ser alterado           │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  [🔙 Trocar Cliente]                                          │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Estados da Listagem

| Estado      | Comportamento                                           |
| ----------- | ------------------------------------------------------- |
| Carregando  | Mostra spinner e "Carregando pedidos..."                |
| Com pedidos | Mostra lista conforme layout acima                      |
| Sem pedidos | Mostra mensagem "Nenhum pedido encontrado" + botão novo |
| Erro        | Mostra mensagem de erro + botão tentar novamente        |

### 6.3 Cores dos Status

| Status       | Cor             | Hex       |
| ------------ | --------------- | --------- |
| Rascunho     | Cinza           | `#6C757D` |
| Pendente     | Amarelo/Laranja | `#FFA500` |
| Confirmado   | Azul            | `#007BFF` |
| Em Separação | Roxo            | `#6F42C1` |
| Faturado     | Verde Claro     | `#20C997` |
| Entregue     | Verde           | `#28A745` |
| Cancelado    | Vermelho        | `#DC3545` |

---

## 7. Interface - Modo Edição

### 7.1 Diferenças Visuais

O modo edição utiliza a mesma interface do modo criação, com as seguintes diferenças:

#### Banner de Edição (Topo)

```
┌──────────────────────────────────────────────────────────────────────┐
│  ⚠️  EDITANDO PEDIDO                                                 │
│  #MB-2026-0123 | Criado em 10/01/2026 | Status: 🟡 Pendente          │
│  Última alteração: 12/01/2026 às 09:15 por João Silva               │
└──────────────────────────────────────────────────────────────────────┘
```

#### Campos Bloqueados

Os seguintes campos devem estar **bloqueados** no modo edição:

- Seleção de cliente (já definido)
- Endereço de entrega (vem do cliente)

#### Botão do Footer

```
Modo Criação:  [📦 Gerar Pedido]
Modo Edição:   [💾 Salvar Alterações]
```

#### Header "Trocar Cliente"

```
Modo Criação:  [🔄 Trocar Cliente]  (funcional)
Modo Edição:   [🔒 Cliente] (desabilitado, mostra tooltip: "Não é possível trocar cliente em edição")
```

### 7.2 Estado Local

```javascript
state = {
  // ... estado existente ...

  modoEdicao: true,
  pedidoEmEdicao: {
    pedidoId: "12345",
    numeroPedido: "MB-2026-0123",
    dataCriacao: "2026-01-10",
    status: "Pendente",
  },
};
```

---

## 8. Interface - Modo Visualização

### 8.1 Layout da Tela de Resumo

Tela dedicada para exibição de pedido (somente leitura), sem campos editáveis.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]                                                      [X]     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      📦 DETALHES DO PEDIDO                     │  │
│  │                      #MB-2026-0123                             │  │
│  │                      ✅ Entregue                               │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  👤 CLIENTE             │  │  📅 DATAS                       │   │
│  │  ─────────────────────  │  │  ─────────────────────────────  │   │
│  │  Mercado ABC Ltda       │  │  Criado: 10/01/2026             │   │
│  │  CNPJ: 12.345.678/0001  │  │  Entrega: 15/01/2026 (Quarta)   │   │
│  │  Código MB: MB-001      │  │  Última alteração: 12/01/2026   │   │
│  └─────────────────────────┘  └─────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────────────┐   │
│  │  👔 VENDEDOR            │  │  🚚 ENTREGA                     │   │
│  │  ─────────────────────  │  │  ─────────────────────────────  │   │
│  │  João Silva             │  │  Rua das Flores, 123            │   │
│  │  joao@empresa.com       │  │  Centro - São Paulo/SP          │   │
│  │                         │  │  CEP: 01234-567                 │   │
│  └─────────────────────────┘  └─────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  🛒 ITENS DO PEDIDO                                           │  │
│  ├────────────────────────────┬───────┬───────────┬─────────────┤  │
│  │  Produto                   │ Qtd   │ Preço     │ Subtotal    │  │
│  ├────────────────────────────┼───────┼───────────┼─────────────┤  │
│  │  🧀 Queijo Minas 500g      │ 10 UN │ R$ 25,50  │ R$ 255,00   │  │
│  │     Desconto: 5% (-R$11)   │       │           │ R$ 244,00 ✓ │  │
│  ├────────────────────────────┼───────┼───────────┼─────────────┤  │
│  │  🥓 Presunto Cozido 1kg    │ 5 UN  │ R$ 42,00  │ R$ 210,00   │  │
│  ├────────────────────────────┴───────┴───────────┴─────────────┤  │
│  │                                                              │  │
│  │    Subtotal:           R$ 465,00                             │  │
│  │    Desconto:          -R$  11,00  (2,37%)                    │  │
│  │    ─────────────────────────────────────                     │  │
│  │    TOTAL:              R$ 454,00                             │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  💳 Pagamento: 30/60/90 Dias   │   🚛 Frete: CIF              │  │
│  │  📝 Natureza: Venda            │   📋 Pedido Cliente: PC-001  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  💬 Observações:                                              │  │
│  │  Entregar pela manhã. Cliente preferencial.                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │               [🔙 Voltar para Lista de Pedidos]                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 8.2 Características

- **Tela única** - não usa abas (config/produtos)
- **Somente leitura** - sem inputs editáveis
- **Compacta** - todas as informações em uma view
- **Responsiva** - adapta para mobile
- **Botão de voltar** - retorna para listagem ou fecha widget

---

## 9. Regras de Negócio

### 9.1 Permissões de Edição

Definir no backend (Deluge) quais status permitem edição:

| Status       | Pode Editar | Pode Cancelar | Observação                   |
| ------------ | ----------- | ------------- | ---------------------------- |
| Rascunho     | ✅ Sim      | ✅ Sim        | Total controle               |
| Pendente     | ✅ Sim      | ✅ Sim        | Antes de confirmar           |
| Confirmado   | ⚠️ Depende  | ✅ Sim        | Verificar regras específicas |
| Em Separação | ❌ Não      | ⚠️ Depende    | Processo iniciado            |
| Faturado     | ❌ Não      | ❌ Não        | Nota emitida                 |
| Entregue     | ❌ Não      | ❌ Não        | Concluído                    |
| Cancelado    | ❌ Não      | ❌ Não        | Já cancelado                 |

### 9.2 Campos Editáveis

| Campo                 | Editável   | Observação                             |
| --------------------- | ---------- | -------------------------------------- |
| Cliente               | ❌ Não     | Trocar cliente = novo pedido           |
| Produtos              | ✅ Sim     | Adicionar, remover, alterar quantidade |
| Descontos             | ✅ Sim     | Mesmas regras de limite                |
| Data de Entrega       | ✅ Sim     | Mesmas regras de janela                |
| Condição de Pagamento | ⚠️ Depende | Definir regra                          |
| Tipo de Frete         | ⚠️ Depende | Normalmente travado pelo cliente       |
| Natureza              | ✅ Sim     |                                        |
| Nº Pedido Cliente     | ✅ Sim     |                                        |
| Observações           | ✅ Sim     |                                        |

### 9.3 Validações na Atualização

O backend deve validar:

1. Pedido existe e pertence ao cliente
2. Pedido está em status que permite edição
3. Usuário tem permissão para editar
4. Data de entrega é válida
5. Produtos estão disponíveis
6. Descontos estão dentro do limite

---

## 10. Checklist de Implementação

### 10.1 Backend (Zoho Creator / Deluge)

- [ ] **API: listarPedidosCliente**

  - [ ] Criar função Deluge
  - [ ] Filtrar por cliente e data (últimos 3 meses)
  - [ ] Calcular flags de permissão (podeEditar, podeCancelar)
  - [ ] Retornar no formato especificado
  - [ ] Criar endpoint público
  - [ ] Testar via Postman/SDK

- [ ] **API: consultaPedido**

  - [ ] Criar função Deluge
  - [ ] Buscar pedido por ID
  - [ ] Buscar todos os itens do pedido
  - [ ] Montar objeto completo
  - [ ] Criar endpoint público
  - [ ] Testar via Postman/SDK

- [ ] **API: atualizarPedido**

  - [ ] Criar função Deluge
  - [ ] Validar permissões
  - [ ] Atualizar registro do pedido
  - [ ] Atualizar/Remover/Adicionar itens
  - [ ] Registrar log de alteração
  - [ ] Criar endpoint público
  - [ ] Testar via Postman/SDK

- [ ] **API: cancelarPedido**
  - [ ] Criar função Deluge
  - [ ] Validar permissões
  - [ ] Alterar status
  - [ ] Registrar motivo
  - [ ] Criar endpoint público
  - [ ] Testar via Postman/SDK

### 10.2 Frontend (Widget)

- [ ] **Configuração (config.js)**

  - [ ] Adicionar novos endpoints
  - [ ] Adicionar constantes para modos

- [ ] **API (api.js)**

  - [ ] Função `listarPedidosCliente(clienteId)`
  - [ ] Função `consultaPedido(pedidoId)`
  - [ ] Função `atualizarPedido(pedidoId, dados)`
  - [ ] Função `cancelarPedido(pedidoId, motivo)`

- [ ] **HTML (widget.html)**

  - [ ] Seção: Tela de Listagem de Pedidos
  - [ ] Seção: Banner de Modo Edição
  - [ ] Seção: Tela de Resumo (Visualização)
  - [ ] Modal: Confirmação de Cancelamento

- [ ] **CSS (widget.css)**

  - [ ] Estilos da listagem de pedidos
  - [ ] Estilos dos cards de pedido
  - [ ] Estilos do banner de edição
  - [ ] Estilos da tela de resumo
  - [ ] Estilos dos status (cores)

- [ ] **App Principal (app.js)**

  - [ ] Estado: `modoOperacao`, `pedidoEmEdicao`
  - [ ] Função: `detectarModoOperacao()`
  - [ ] Função: `carregarListagemPedidos(clienteId)`
  - [ ] Função: `carregarPedidoParaEdicao(pedidoId)`
  - [ ] Função: `salvarAlteracoesPedido()`
  - [ ] Função: `cancelarPedido(pedidoId)`
  - [ ] Modificar: `selecionarCliente()` para ir para listagem
  - [ ] Modificar: `finalizarPedidoComEntrega()` para modo edição

- [ ] **UI (ui.js)**

  - [ ] Função: `renderizarListagemPedidos(pedidos)`
  - [ ] Função: `mostrarTelaListagem()`
  - [ ] Função: `mostrarBannerEdicao(pedido)`
  - [ ] Função: `mostrarTelaResumo(pedido)`
  - [ ] Função: `atualizarBotaoFooter(modo)`

- [ ] **Produtos (produtos.js)**
  - [ ] Função: `carregarItensEdicao(itens)`
  - [ ] Função: `getCarrinhoParaAtualizacao()`

### 10.3 Testes

- [ ] Teste: Listagem carrega corretamente
- [ ] Teste: Pedido abre em modo edição
- [ ] Teste: Pedido abre em modo visualização
- [ ] Teste: Campos bloqueados funcionam
- [ ] Teste: Alterações são salvas
- [ ] Teste: Cancelamento funciona
- [ ] Teste: URL params funcionam
- [ ] Teste: Mobile responsivo

---

## Próximos Passos

1. **Você (Backend):** Criar as 4 APIs conforme especificações
2. **Eu (Frontend):** Aguardar APIs prontas para implementar
3. **Teste integrado:** Validar fluxo completo

---

**Documento criado em:** 13/01/2026  
**Atualizado em:** 13/01/2026
