# Uso de IA neste projeto

A IA (Claude, da Anthropic) foi usada como assistente. Abaixo estão os pontos onde ela ajudou e o que cada um exigiu de revisão. **Eu preciso conseguir explicar qualquer parte deste código.**

> ✏️ **COMPLETE antes de enviar:** as seções marcadas com [PREENCHER] precisam ser escritas por você, com o que de fato aconteceu. Não deixe nada que você não fez ou não entendeu.

## Dias 1 a 6 (base, banco, lotes, lances, auditoria e front inicial)

[PREENCHER] Para cada dia, anote: o que a IA gerou, o que você testou, o que você mudou ou corrigiu e o que você aprendeu. Exemplos de pontos que costumam ser perguntados na entrevista:

- Por que o lance usa uma transação com `SELECT ... FOR UPDATE` no lote e nas carteiras (ordem por id para evitar deadlock).
- Como o hash encadeado detecta alteração, remoção do meio, inserção e remoção do último lance, e qual é o limite assumido.
- Por que o dinheiro é guardado em centavos inteiros.
- Como o job de liquidação é idempotente.

## Dia 7 e acabamento (assistido por IA)

- **Identidade visual e front-end (Aurelia):** a IA reescreveu o CSS e as telas (cabeçalho, página inicial, cards, sala do lote) a partir da referência visual que eu enviei. Eu revisei o resultado no navegador e pedi ajustes.
- **Sala do lote:** a IA adicionou o histórico de lances (via `GET /audit/:id`), o selo "você está ganhando / foi superado" (via `GET /me/bids`) e o polling de 2 s, que estavam faltando em relação ao enunciado.
- **Cancelamento com estorno:** a IA ajustou a rota `POST /lots/:id/cancel` para devolver o valor comprometido do líder dentro da transação.
- **Scripts:** `scripts/clear-lots.js` (limpar lotes e recalcular saldos) e `scripts/seed-demo.js` (lotes de demonstração com lances).
- **Docker Compose e Dockerfiles.**
- **README:** seções de Docker, limitações, comportamentos inesperados e estorno.

[PREENCHER] O que você testou depois (ex.: rodou o cancelamento com lance e conferiu o saldo do líder; subiu o Docker; testou no celular) e o que você ajustou.

## O que NÃO foi feito com IA

[PREENCHER] Se alguma parte você fez sozinha, diga aqui.
