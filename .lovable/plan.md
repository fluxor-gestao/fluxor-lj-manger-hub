## Objetivo
Definir o remetente das propostas como `Lundgaard Jensen <propostasLJ@fluxorbi.com>`.

## Situação atual
A edge function `send-devis-proposal` já lê a variável de ambiente `RESEND_FROM_EMAIL` (linha 91 de `supabase/functions/send-devis-proposal/index.ts`) e usa esse valor no campo `from` do envio via Resend. Hoje cai no fallback `Lundgaard Jensen <onboarding@resend.dev>` porque a secret não está cadastrada.

## Passos
1. Adicionar a secret `RESEND_FROM_EMAIL` no projeto com o valor `Lundgaard Jensen <propostasLJ@fluxorbi.com>` (via tool de secrets, requer aprovação).
2. Confirmar com o usuário e fazer um envio de teste de uma proposta para validar que o remetente aparece corretamente na caixa do destinatário.

## Observações
- Nenhuma alteração de código é necessária — a função já consome a variável.
- O domínio `fluxorbi.com` precisa estar verificado no Resend (já reconfigurado conforme combinado).
- Não mexer no `RESEND_API_KEY` (já atualizado via reconexão do connector).
