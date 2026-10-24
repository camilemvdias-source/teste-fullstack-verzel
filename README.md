# Casa de Leilões

Teste técnico Full Stack Elite Dev da Verzel: plataforma de leilões online com dois papéis (leiloeiro e licitante).

## Links

- Front (deploy): https://teste-fullstack-verzel.vercel.app
- API (deploy): https://teste-fullstack-verzel.onrender.com

Obs.: a API roda no plano gratuito do Render e "dorme" sem uso. A primeira requisição pode levar cerca de 50 segundos.

## Contas de teste

(a preencher quando o seed estiver pronto)

## Stack

- Front: React + Vite
- Back: Node.js + Express
- Banco: PostgreSQL (Neon)
- Deploy: Vercel (front) e Render (back)

## Como rodar localmente

Pré-requisitos: Node.js 20 ou mais novo, Git e um banco PostgreSQL (por exemplo, um projeto gratuito no Neon).

1. Clone o repositório e entre na pasta do projeto.
2. Back-end:
   ```bash
   cd backend
   npm install
   cp .env.example .env   # no Windows: copy .env.example .env
   # preencha o .env (veja a tabela abaixo)
   npm run migrate        # cria as tabelas no banco
   npm run dev            # http://localhost:3000/health
   ```
3. Front-end (em outro terminal):
   ```bash
   cd frontend
   npm install
   cp .env.example .env   # VITE_API_URL=http://localhost:3000
   npm run dev            # http://localhost:5173
   ```

## Variáveis de ambiente

Back-end (`backend/.env`, modelo em `backend/.env.example`):

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | string de conexão do PostgreSQL |
| `PORT` | porta da API (padrão 3000) |
| `JWT_SECRET` | segredo para assinar os tokens de login |
| `PUBLIC_CODE_SECRET` | segredo do código público anônimo dos licitantes |
| `FRONTEND_URL` | endereço do front liberado no CORS (opcional; vazio libera tudo) |

Front-end (`frontend/.env`, modelo em `frontend/.env.example`):

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | endereço da API |

## Uso de IA

Veja o arquivo [AI_USAGE.md](AI_USAGE.md).
