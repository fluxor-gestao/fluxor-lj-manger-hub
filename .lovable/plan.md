# Plano: Opção A — envio de propostas via Resend

## Resumo
A edge function `send-devis-proposal` já existe e está pronta. Falta: (1) conectar Resend, (2) configurar domínio verificado no Resend, (3) trocar a chamada do `SendDevisDialog` para usar a edge function em vez de `/lovable/email/transactional/send`.

## Passos

### 1. Conectar Resend (connector)
- Usar o connector oficial do Resend (`standard_connectors--connect` com `resend`).
- Isso disponibiliza `RESEND_API_KEY` como secret automaticamente no runtime das edge functions.
- Você fará login/seleção da conta Resend no popup.

### 2. Configurar domínio no Resend
Você precisa fazer **no painel do Resend** (https://resend.com/domains):

1. **Add Domain** → `propostas.ljmanager.fluxorbi.com` (subdomínio dedicado, isolado do tráfego de auth do Lovable).
2. Resend mostra registros DNS: **SPF (TXT)**, **DKIM (TXT, 3 registros CNAME ou TXT)**, **MX** (opcional, para bounces), **DMARC (TXT, opcional mas recomendado)**.
3. Adicionar esses registros no DNS do `fluxorbi.com` (Cloudflare/Registro.br/onde estiver hospedado).
   - **Importante**: usar subdomínio `propostas.` evita conflito com a delegação NS do Lovable em `notify.ljmanger.fluxorbi.com`.
4. Aguardar verificação (minutos a poucas horas).
5. Configurar **DMARC** em `_dmarc.ljmanager.fluxorbi.com` com `v=DMARC1; p=none; rua=mailto:dmarc@ljmanager.fluxorbi.com` (relatório só, sem bloqueio).

### 3. Adicionar secret `RESEND_FROM_EMAIL`
- Valor: `Lundgaard Jensen <propostas@propostas.ljmanager.fluxorbi.com>`
- A edge function já lê essa variável (`Deno.env.get("RESEND_FROM_EMAIL")`).

### 4. Ajustar `SendDevisDialog.tsx`
Trocar o loop que chama `/lovable/email/transactional/send` por **uma única chamada** à edge function `send-devis-proposal` via `supabase.functions.invoke`:

```ts
const { data, error } = await supabase.functions.invoke("send-devis-proposal", {
  body: {
    devis_id: devis.id,
    to: recipients,           // array — Resend aceita múltiplos destinatários
    subject,
    message_text: message,
    pdf_base64: base64,
    pdf_filename: filename,
    accept_url: acceptUrl,
    language,
  },
});
if (error) throw error;
```

- Remover o bloco de upload para Storage + `createSignedUrl` (não é mais necessário — o PDF vai como **anexo direto** no e-mail, melhor entregabilidade e UX).
- Remover o `for (recipient of recipients)` — uma única chamada envia para todos.
- Manter a lógica de update do status `enviada_ao_cliente` que já está dentro da edge function (remove duplicação do client).

### 5. Deploy + teste
- Deploy da edge function (já existe, só precisa redeploy se houver mudança).
- Enviar uma proposta de teste para Gmail + Outlook e validar:
  - chega na **inbox** (não SPAM);
  - cabeçalho mostra `propostas@propostas.ljmanager.fluxorbi.com`;
  - DKIM/SPF/DMARC = PASS (ver "show original" no Gmail).

## Detalhes técnicos

- **Por que anexo direto > signed URL**: anexos PDF em transacionais aumentam confiança e não exigem hop extra (storage). Resend suporta anexos base64 nativamente.
- **Edge function já trata**: HTML responsivo i18n (pt/fr/en/es), CTA aceitar/recusar, atualização de `devis.status` no banco.
- **`to` aceita qualquer destinatário válido** (Gmail, Outlook, corporativo) — única restrição é o domínio **remetente** (precisa estar verificado no Resend).
- **Bucket `devis-pdfs`**: deixa de ser usado neste fluxo; mantemos por enquanto (pode servir para download manual / histórico).

## O que você precisa fazer
1. Aprovar o plano → mudo para build mode.
2. Aceitar o popup de conexão do connector Resend.
3. Adicionar registros DNS do Resend no `fluxorbi.com` quando eu te passar.
4. Confirmar `RESEND_FROM_EMAIL` (ou sugerir outro endereço visível).

## Não-objetivos
- Não mexer no fluxo de auth emails (continua via Lovable Emails / domínio antigo).
- Não migrar outros templates transacionais — só `devis-proposal`.
- Não remover `bucket devis-pdfs` nem código de geração de PDF (continua sendo gerado client-side e enviado como anexo).
