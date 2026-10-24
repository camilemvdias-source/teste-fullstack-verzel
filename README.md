# Casa de Leilões

Teste técnico Full Stack Elite Dev da Verzel: plataforma de leilões online com dois papéis (leiloeiro e licitante).

## Links

- **Front-end:** https://teste-fullstack-verzel.vercel.app
- **API:** https://teste-fullstack-verzel.onrender.com

**Observação:** a API roda no plano gratuito do Render e pode ficar inativa quando não está sendo utilizada. Por isso, a primeira requisição pode levar cerca de 50 segundos para responder.

## Contas de teste

As contas de teste serão adicionadas quando estiverem configuradas.

## Stack

- **Front-end:** React + Vite
- **Back-end:** Node.js + Express
- **Banco de dados:** PostgreSQL (Neon)
- **Deploy:** Vercel (front-end) e Render (back-end)

## Como rodar localmente

### Pré-requisitos

- Node.js 20 ou superior
- Git
- Um banco PostgreSQL, como um projeto no Neon

### 1. Back-end

Na raiz do projeto, abra o terminal e execute:

```bash
cd backend
npm install
```

Crie o arquivo `.env` a partir do `.env.example`. No PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Configure as variáveis de ambiente no arquivo `.env` e execute:

```bash
npm run migrate
npm run dev
```

A API ficará disponível em `http://localhost:3000`.

### 2. Front-end

Abra outro terminal na raiz do projeto e execute:

```bash
cd frontend
npm install
```

Crie o arquivo `.env` a partir do `.env.example`. No PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure `VITE_API_URL` com o endereço da API, por exemplo:

```env
VITE_API_URL=http://localhost:3000
```

Inicie o front-end:

```bash
npm run dev
```

O endereço local normalmente será `http://localhost:5173`.

## Variáveis de ambiente

### Back-end — `backend/.env`

Consulte `backend/.env.example`.

| Variável | Finalidade |
|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL |
| `PORT` | Porta da API (padrão: 3000) |
| `JWT_SECRET` | Segredo usado para assinar tokens de autenticação |
| `PUBLIC_CODE_SECRET` | Segredo usado para gerar códigos públicos dos licitantes |
| `FRONTEND_URL` | Endereço do front-end autorizado pelo CORS |

### Front-end — `frontend/.env`

Consulte `frontend/.env.example`.

| Variável | Finalidade |
|---|---|
| `VITE_API_URL` | Endereço da API |

## Uso de IA

Consulte o arquivo [AI_USAGE.md](AI_USAGE.md).