# Uso de IA

> Rascunho: ajuste com as suas palavras e mantenha atualizado a cada dia.

Ferramenta: Claude (Anthropic), usado como guia passo a passo, com um passo de cada vez. Cada trecho foi executado e testado antes de seguir para o próximo.

## Dia 1: base e deploy

- **A IA gerou:** a estrutura de pastas, o servidor Express com a rota `/health`, a conexão com o PostgreSQL (pacote `pg`), o front em React + Vite que chama a API e o passo a passo do deploy (Render e Vercel).
- **Eu fiz:** criei o repositório e as contas (GitHub, Neon, Render, Vercel), configurei as variáveis de ambiente, publiquei o back e o front, testei os endereços públicos e corrigi os erros que apareceram no caminho (pasta errada no terminal, variável faltando no Render).

## Dia 2: banco e cadastro

- **A IA gerou:** o `schema.sql` (tabelas `users`, `lots`, `bids`, `receipts` e `ledger`, com valores em centavos), o script de migração e a rota `POST /auth/register` (validação com zod, senha com bcrypt, código público por HMAC).
- **Eu fiz:** rodei a migração no Neon e testei o cadastro.
- **Revisão de código:** na revisão geral foram encontrados e corrigidos dois problemas: um `});` faltando que fechava a rota de cadastro e um `.env.example` que tinha a senha real do banco. A senha deve ser trocada no Neon e o arquivo agora só traz nomes de variáveis.
