# Integração de Widgets com Custom APIs do Zoho Creator

Este documento detalha como configurar e realizar chamadas a Custom APIs (Funções publicadas como API REST) dentro de um Widget do Zoho Creator, contornando problemas comuns de CORS e serialização do SDK.

## 1. Pré-requisitos e Configuração de Segurança (CSP)

Para que o Widget possa se comunicar com APIs externas (mesmo sendo do próprio Zoho), é necessário configurar a **Content Security Policy (CSP)** no arquivo `app/plugin-manifest.json`.

**Arquivo:** `app/plugin-manifest.json`

```json
{
  "service": "CREATOR",
  "cspDomains": {
    "connect-src": [
      "https://www.zohoapis.com",
      "https://*.zohoapis.com",
      "https://creator.zoho.com",
      "https://*.zoho.com"
    ]
  },
  "config": []
}
```

_Reinicie o comando `zet run` após alterar este arquivo._

## 2. Método de Chamada (SDK)

O método recomendado para fazer chamadas sem esbarrar em bloqueios de CORS do navegador é utilizar o "túnel" do SDK.

Utilize **`ZOHO.CREATOR.DATA.invokeCustomApi`** (Namespace DATA, não API da V2, pois é mais estável para este fim).

## 3. Configuração dos Parâmetros

Existem "pegadinhas" importantes na configuração, especialmente para APIs que utilizam **Public Key** e parâmetros GET (query string).

### Estrutura da Configuração

```javascript
var config = {
  api_name: "nomeDaSuaFuncaoAPI", // Link Name da função no Zoho
  http_method: "GET", // GET, POST, etc.
  public_key: "SuaChavePublicaAqui...", // Obrigatório na raiz para autenticação
  query_params: "param1=valor1&param2=valor2", // DICA DE OURO: Use String!
};
```

### ⚠️ Dica de Ouro: `query_params` como String

Em algumas versões do SDK, passar `query_params` como um objeto (ex: `{ filter: "valor" }`) causa um erro de serialização, onde o SDK envia `[object Object]` na URL.

**Solução:** Monte a query string manualmente e passe como texto.

**Errado (pode falhar):**

```javascript
query_params: {
  filter: "MARIA";
} // Pode virar "?[object Object]"
```

**Correto (funciona):**

```javascript
query_params: "filter=MARIA";
```

## 4. Exemplo Completo de Implementação

Abaixo, um exemplo de função para buscar clientes de uma API Custom.

```javascript
function carregarClientesViaAPI() {
  // 1. Configuração
  var config = {
    api_name: "consultaCliente",
    http_method: "GET",
    public_key: "J39jfTQGHMzBYRSVaPfwbjatX", // Sua Public Key real
    query_params: "filter=MARIA", // Passando filtro na query string manual
  };

  // 2. Verificação do SDK
  if (!ZOHO || !ZOHO.CREATOR || !ZOHO.CREATOR.DATA) {
    console.error("SDK não carregado.");
    return;
  }

  // 3. Chamada
  ZOHO.CREATOR.DATA.invokeCustomApi(config)
    .then(function (response) {
      console.log("Resposta bruta:", response);

      // 4. Tratamento Robusto do Retorno
      // O SDK pode retornar o body direto, ou um objeto { code: 3000, data: ... }
      // A API pode retornar { success: true, data: [...] } ou array direto.

      var dadosRetorno = response.data || response.result || response;

      // Parse forçado se vier como string
      if (typeof dadosRetorno === "string") {
        try {
          dadosRetorno = JSON.parse(dadosRetorno);
        } catch (e) {}
      }

      // Normalização para Array
      var listaFinal = [];

      if (Array.isArray(dadosRetorno)) {
        listaFinal = dadosRetorno;
      } else if (dadosRetorno.data && Array.isArray(dadosRetorno.data)) {
        listaFinal = dadosRetorno.data;
      } else if (dadosRetorno.success && dadosRetorno.message) {
        console.log("Sucesso, mas sem lista de dados:", dadosRetorno.message);
      }

      // Uso dos Dados
      console.log("Clientes encontrados:", listaFinal.length);
      listaFinal.forEach((c) => console.log(c.nomeFantasia || c.razaoSocial));
    })
    .catch(function (erro) {
      console.error("Erro na API:", erro);
    });
}
```

## 5. Resumo de Erros Comuns

| Erro                                     | Causa Provável                                                    | Solução                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **CORS / Network Error / 401**           | `plugin-manifest.json` ausente ou incorreto.                      | Adicione os domínios `*.zohoapis.com` ao manifesto e reinicie o ZET.        |
| **Code 1060: Invalid request parameter** | O SDK transformou o objeto `query_params` em `"[object Object]"`. | Passe `query_params` como uma **String** manual.                            |
| **"publickey used twice"**               | Você passou `publickey` na URL e na config raiz.                  | Deixe a `public_key` apenas na propriedade `public_key` do objeto `config`. |
| **ZOHO is not defined**                  | Script do `widgetsdk-min.js` não carregou ou ordem errada.        | Verifique o `<script src="...">` no HTML.                                   |
