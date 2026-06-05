# Parser híbrido de extratos PDF (local-first + IA como fallback)

## Objetivo
Eliminar o timeout de 150s da edge function e reduzir custo de IA processando o PDF **localmente no navegador** sempre que possível. A IA só é chamada quando o parser local não reconhece o layout ou não extrai transações suficientes.

## Estratégia em 3 camadas

```text
PDF -> [1] Extrai texto local (pdfjs-dist)
        |
        v
       [2] Parser por layout (Bradesco, Itau, etc.) - regex/heurística
        |
        +-- ok (>=1 transação + saldos coerentes) --> usa direto, custo IA = 0
        |
        +-- falhou ou layout desconhecido
                |
                v
              [3] Fallback IA - manda só o TEXTO extraido (nao mais base64 do PDF)
                  para a edge function existente, em chunks por pagina/dia
```

## Mudanças

### 1. Extração local de texto (novo `src/lib/pdfText.ts`)
- Usa `pdfjs-dist` (já comum em apps Vite) para ler o PDF no browser.
- Retorna `{ pages: string[][] }` preservando linhas e ordem.
- Roda 100% no cliente — zero custo, zero timeout.

### 2. Parsers por layout (novo `src/lib/bankParsers/`)
- `bradesco.ts` — reconhece o cabeçalho `Data | Histórico | Docto. | Crédito | Débito | Saldo` do extrato anexado.
  - Propaga a última data vista quando a célula está vazia (regra observada no PDF do usuário).
  - Junta linha 1 (tipo, ex. "PIX QR CODE ESTATIC") + linha 2 (`REM:` crédito / `DES:` débito + contraparte).
  - Ignora linhas `Total`, `Saldo Anterior` e `RENTAB.INVEST`/aplicação automática (marca como `transferencia` opcionalmente).
- `index.ts` — função `detectLayout(text)` que escolhe o parser certo por assinatura (`"Bradesco Celular"`, `"Banco do Brasil"`, etc.). Começa com Bradesco; arquitetura aberta para Itaú/Santander/Nubank depois.
- Retorna o mesmo formato `ParsedOfxTx[]` que o resto do código já consome.

### 3. Fluxo no `conciliacao.tsx`
Substituir o bloco atual de "PDF -> edge function" por:

```text
1. Extrair texto local com pdfText
2. Tentar parser local (detectLayout)
   - sucesso -> usa transactions, mostra toast "Extrato lido localmente (Bradesco)"
3. Se vazio ou layout nao reconhecido:
   - chama edge function passando { text, fileName } (NAO o PDF inteiro em base64)
   - toast "Layout nao reconhecido, usando IA..."
```

### 4. Ajuste leve na edge `parse-bank-statement-pdf`
- Aceitar `{ text }` como input alternativo a `{ fileBase64 }`.
- Quando vier `text`, pular o envio de PDF e mandar só o texto (muito mais barato e rápido).
- Manter compatibilidade com chamadas antigas.
- Continuar usando `gpt-4o-mini`.

## Resultado esperado
- **Bradesco (o caso do usuario)**: 100% local, sem IA, instantâneo. Extrato de maio com ~500 lançamentos processado em <2s.
- **Layouts desconhecidos**: IA recebe texto (~10x menor que PDF base64) e responde dentro do limite.
- **Sem mudanças** na UI de conciliação nem no schema do banco.

## Detalhes técnicos
- Dependência nova: `pdfjs-dist` (~400KB, lazy-loaded só ao abrir o uploader).
- Worker do pdfjs configurado via `?url` do Vite para nao precisar de arquivo público.
- Parser Bradesco testado mentalmente contra o PDF de maio: identifica 23 páginas, saldo inicial 3.276,92 e total Crédito 22.096,13 / Débito 21.769,99 (confere com a linha de Total da pagina 20).
- Sem mudança em RLS, tabelas, ou triggers.

## Não inclui
- Parsers de outros bancos (entram depois conforme arquivos chegarem).
- OCR de extratos escaneados (continua exigindo OFX, como já avisa hoje).
