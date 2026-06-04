# Reestruturação jurídica do gerador de propostas

Mantém 100% do design, logo, bilíngue, numeração, assinaturas e fluxo de aceite. Altera apenas a estrutura jurídica do conteúdo gerado.

## Princípio

A IA passa a gerar **apenas o conteúdo da Seção III — Escopo dos Serviços** (itens A/B/C com descrição, entregáveis, prazo, valor). Todas as demais 10 cláusulas vêm de um **template fixo em PT** montado no servidor, com placeholders preenchidos a partir dos dados do devis/cliente (nome, CNPJ, endereço, totais, datas, foro).

O resultado final é um único `proposal_structure` em Markdown contendo as 11 seções na ordem exigida — exatamente o campo já renderizado hoje no preview, no PDF, no e-mail e na página de aceite. Nada nessas superfícies precisa mudar.

## Estrutura fixa (template servidor)

Ordem obrigatória e imutável:

```text
I.   Identificação das Partes        (template + dados do cliente/contratado)
II.  Objeto do Contrato              (template + resumo curto da IA)
III. Escopo dos Serviços             (100% IA — itens A/B/C…)
IV.  Honorários                      (template + total_amount / down_payment)
V.   Forma de Pagamento              (template fixo: 50%+50%, PIX/transf., IPCA 12m)
VI.  Obrigações do Contratado        (template fixo)
VII. Obrigações do Contratante       (template fixo)
VIII.Limitação de Escopo             (template fixo)
IX.  Rescisão                        (template fixo)
X.   Foro                            (template fixo — Fortaleza/CE)
XI.  Assinaturas                     (marcador final; assinaturas reais no PDF)
```

## Mudanças por arquivo

### 1. `supabase/functions/generate-devis-proposal/index.ts`
- Reduzir o prompt para pedir à IA **só**: `title`, `scope_description` (resumo do objeto, 2–4 frases) e `scope_items[]` (A/B/C com title, description, deliverables, stakeholders, success_metrics, duration, amount). Manter regras de valores e proibições de placeholders/bilíngue.
- Após o tool_call, **montar `proposal_structure` no servidor** concatenando o template das 11 seções em PT, injetando:
  - Dados do contratado fixos (Lundgaard Jensen, CNPJ, endereço).
  - `client_name` recebido do payload.
  - Os `scope_items` renderizados na Seção III no formato Markdown atual (`**A) Título — BRL X**` + labels).
  - `total_amount`, entrada 50%, saldo 50% na Seção IV.
- Remover seções V–VII antigas; substituir pelas 11 novas.
- Retornar `proposal.proposal_structure` já com as 11 seções (a IA não escreve mais essa string diretamente).

### 2. `supabase/functions/translate-devis/index.ts`
- Sem mudanças estruturais: continua traduzindo `proposal_structure` inteiro. Acrescentar ao glossário a tradução estável dos títulos das novas seções (Forma de Pagamento, Obrigações do Contratado/Contratante, Limitação de Escopo, Rescisão, Foro, Assinaturas) para FR/EN/ES, garantindo que a coluna secundária do PDF exiba os mesmos 11 títulos.

### 3. Validação de emissão
- Em `src/components/devis/SendDevisDialog.tsx` (e no `handleExportPdf` em `src/routes/_authenticated/comercial_.devis.$id.tsx`): antes de enviar/exportar, validar que `proposal_structure` contém os 11 marcadores (`I.` … `XI.`). Se faltar qualquer um, bloquear com toast "Proposta incompleta — regere a proposta" e impedir o envio/exportação.

### 4. Sem mudanças
- `DevisPdfTemplate.tsx`, `proposta.aceite.$token.tsx`, `email-templates/devis-proposal`, migrações de banco, numeração, fluxo de aceite, layout, logo, marca d'água, assinaturas.

## Resultado

- Toda proposta gerada (nova ou regerada) terá as 11 cláusulas, na mesma ordem, com texto jurídico padronizado em PT (e traduzido para FR/EN/ES quando o cliente for estrangeiro).
- Preview da página de aceite, PDF baixado, PDF anexado ao e-mail e a página `/proposta/aceite/:token` exibirão exatamente o mesmo `proposal_structure` — consistência garantida por construção.
- Nenhuma proposta pode ser enviada/exportada sem todas as cláusulas (validação no front).
