# Changelog - Limpeza de Código do Widget de Pedidos

**Data:** 30/12/2024  
**Versão:** Limpeza para Produção

---

## Resumo das Alterações

Este documento detalha todas as alterações realizadas para preparar o widget para produção, removendo elementos de debug e documentando valores que precisam de atenção.

---

## 🗑️ Itens Removidos

### 1. Botões de Debug (widget.html)

**Removidos 3 botões de debug da interface:**

| Local                                  | Descrição                            | Motivo da Remoção                                              |
| -------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Etapa Cliente (canto inferior direito) | Botão `.btn-debug-corner`            | Era usado para abrir o painel de debug durante desenvolvimento |
| Header do Pedido                       | Botão `.btn-debug`                   | Funcionalidade apenas para desenvolvimento                     |
| Sidebar do Pedido                      | Botão "Debug API" com estilos inline | Chamava manualmente `carregarCondicoesPagamento()` para testes |

### 2. Console.logs de Debug (api.js)

**Removidos 2 console.logs que expunham informações:**

| Linha Original | Código Removido                        | Motivo                                  |
| -------------- | -------------------------------------- | --------------------------------------- |
| Linha 48       | `console.log("Publickey", publicKey);` | Expunha chave pública da API no console |
| Linha 87       | `console.log(config);`                 | Poluía o console em produção            |

---

## ⚙️ Configurações Ajustadas

### 1. DEBUG_ENABLED (config.js)

```javascript
// ANTES:
DEBUG_ENABLED: true,

// DEPOIS:
/**
 * Habilita o painel de debug no widget.
 * IMPORTANTE: Definir como FALSE em produção!
 * Para desenvolvimento local, altere para TRUE.
 */
DEBUG_ENABLED: false,
```

**Localização:** `app/js/config.js` - linha 39

---

## ⚠️ Valores que Precisam de Atenção

### 1. URLs do Logo (HARDCODED)

**Locais:** `widget.html` - linhas 34 e 119

```html
<img
  src="https://melhorbocado.com.br/wp-content/uploads/2023/12/logo.png"
  ...
/>
```

**Recomendação:** Considerar mover para `config.js`:

```javascript
// Sugestão para config.js
ASSETS: {
  LOGO_URL: "https://melhorbocado.com.br/wp-content/uploads/2023/12/logo.png";
}
```

### 2. Nome do Vendedor (AGORA DINÂMICO)

**Antes:** Estava hardcoded como "Joshua Lucas"  
**Depois:** Alterado para "-" (placeholder)

```html
<span class="vendedor-nome" id="vendedor-nome">-</span>
```

**Ação necessária:** Implementar lógica para preencher o nome do vendedor dinamicamente através da API do Zoho (ex: `ZOHO.CREATOR.UTIL.getUser()` ou parâmetros do widget).

### 3. Chaves de API (config.js)

As chaves públicas das APIs estão no arquivo `config.js`. Estas são PUBLIC_KEYs (não secretas), então está OK mantê-las no frontend:

```javascript
ENDPOINTS: {
  CONSULTA_CLIENTE: {
    PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX"
  },
  CONSULTA_PRODUTO: {
    PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX"
  },
  CRIAR_PEDIDO: {
    PUBLIC_KEY: "J39jfTQGHMzBYRSVaPfwbjatX"
  },
  CONSULTA_CONDICAO_PAGAMENTO: {
    PUBLIC_KEY: "HXP79EOmkeUTFneJVNHK2GqTv"
  }
}
```

---

## 📁 Arquivos Modificados

1. **app/widget.html**

   - Removidos 3 botões de debug
   - Removido nome do vendedor hardcoded

2. **app/js/api.js**

   - Removidos 2 console.logs de debug

3. **app/js/config.js**
   - Alterado `DEBUG_ENABLED` de `true` para `false`
   - Adicionada documentação sobre a configuração

---

## ✅ Elementos Mantidos (com justificativa)

### Painel de Debug (widget.html)

O elemento HTML do painel de debug foi **mantido** pois:

- É controlado pela configuração `DEBUG_ENABLED`
- Quando `DEBUG_ENABLED: false`, o painel não recebe logs
- Pode ser útil para troubleshooting em produção (ativando temporariamente)

```html
<!-- Debug Log (Oculto por padrão) -->
<div id="debug-panel" class="debug-panel hidden">...</div>
```

### Dados Mock (config.js)

Os dados mock também foram **mantidos** pois:

- Servem como fallback quando offline
- São úteis para testes sem acesso ao Zoho

---

## 🚀 Próximos Passos Recomendados

1. **Implementar preenchimento do vendedor**: Obter nome do usuário logado via API do Zoho
2. **Considerar externalizar URLs**: Mover URLs de assets para config.js
3. **Adicionar minificação**: Para produção, considerar minificar CSS/JS
4. **Revisar mock data**: Atualizar ou remover se não forem mais necessários
