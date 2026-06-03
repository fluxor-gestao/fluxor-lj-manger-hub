# Plano: ativar envio via Resend (Opção A) com remetente propostasLJ@fluxorbi.com

## Passos

1. **Reconectar o connector Resend** para sincronizar a nova API key (popup aparece para você).
2. **Adicionar secret `RESEND_FROM_EMAIL`** = `Lundgaard Jensen <propostasLJ@fluxorbi.com>`.
3. **Ajustar `src/components/devis/SendDevisDialog.tsx`**:
   - Substituir o loop que chama `/lovable/email/transactional/send` por **uma única chamada** `supabase.functions.invoke("send-devis-proposal", { body: { devis_id, to, subject, message_text, pdf_base64, pdf_filename, accept_url, language } })`.
   - Remover upload do PDF para Storage + `createSignedUrl` (PDF vai como anexo base64 direto).
   - Remover update manual de `devis.status` (a edge function já atualiza).
4. **Deploy** da edge function `send-devis-proposal` (já existe, sem mudanças).
5. Você envia uma proposta de teste; validamos entrega na inbox (Gmail/Outlook) e cabeçalho SPF/DKIM/DMARC.

## Não-objetivos
- Sem alterações em auth emails (continua via Lovable Emails).
- Sem alterações na edge function `send-devis-proposal` (já está pronta).
- Bucket `devis-pdfs` permanece para histórico/download manual.
