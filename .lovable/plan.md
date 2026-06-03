# Plano: novo remetente de propostas

## Objetivo
Substituir o domínio com typo (`notify.ljmanger.fluxorbi.com`) por um subdomínio dedicado e correto para envio das propostas: **`propostas.ljmanager.fluxorbi.com`**, com remetente visível **`propostas@ljmanager.fluxorbi.com`**.

## Passos

1. **Provisionar o novo domínio de e-mail** (`propostas.ljmanager.fluxorbi.com`)
   - Disparo o setup do domínio dedicado para propostas.
   - Você recebe os registros NS para adicionar no DNS do `fluxorbi.com`.
   - Aguarda verificação (até 72h, normalmente minutos).

2. **Após verificação do DNS**
   - Configurar o remetente visível como `Lundgaard Jensen <propostas@ljmanager.fluxorbi.com>` na rota de envio de propostas.
   - O domínio antigo (`notify.ljmanger.fluxorbi.com`) permanece como fallback para auth emails até decidirmos migrá-lo também.

3. **Teste opcional (a seu critério, depois)**
   - Quando quiser, envio uma proposta de teste real para validar entrega ponta-a-ponta. Por ora, só ajuste de domínio conforme você pediu.

## Resultado
- Cliente vê: `propostas@ljmanager.fluxorbi.com` (domínio correto, branded, segregado de auth).
- Reputação de envio das propostas isolada do tráfego de auth.
- Sem alteração no fluxo de aceite/recusa, PDF anexo ou template.

## O que você precisa fazer
- Aprovar este plano → mudo para build mode.
- Quando eu te passar os NS records, adicioná-los no provedor DNS do `fluxorbi.com`.