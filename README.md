# Casa de Leilões

Teste técnico Full Stack Elite Dev da Verzel: plataforma de leilões online com dois papéis (leiloeiro e licitante).

## Links

- **Front-end:** https://teste-fullstack-verzel.vercel.app
- **API:** https://teste-fullstack-verzel.onrender.com

**Observação:** a API roda no plano gratuito do Render e pode ficar inativa quando não está sendo utilizada. Por isso, a primeira requisição pode levar cerca de 50 segundos para responder.

## Contas de teste

Criadas pelo seed (`npm run seed` dentro de `backend`). Senha de todas: `Leilao@2026`.

| Papel | E-mail | Saldo inicial |
|---|---|---|
| Leiloeiro | `leiloeiro@teste.com` | R$ 0,00 |
| Licitante | `licitante1@teste.com` | R$ 10.000,00 |
| Licitante | `licitante2@teste.com` | R$ 10.000,00 |

Também é possível criar contas novas pela tela de cadastro.

## Stack

- **Front-end:** React + Vite
- **Back-end:** Node.js + Express
- **Banco de dados:** PostgreSQL (Neon)
- **Deploy:** Vercel (front-end) e Render (back-end)

## Telas do front-end

| Rota | Quem acessa | O que faz |
|---|---|---|
| `/` | público | Vitrine: lotes ao vivo, agendados e encerrados |
| `/lotes/:id` | público | Detalhe do lote, contagem regressiva e lances (licitante) |
| `/login` | público | Entrar e cadastrar |
| `/carteira` | logado | Saldo, depósito (licitante) e extrato |
| `/meus-lances` | licitante | Situação de cada lance e lotes arrematados |
| `/meus-lotes` | leiloeiro | Meus lotes, resultado e cancelamento |
| `/meus-lotes/novo` | leiloeiro | Busca a obra no museu e cria o lote |
| `/comprovante/:token` | público | Comprovante de arremate |
| `/auditoria/:lotId` | público | Histórico de lances e verificação da cadeia de selos |

As imagens das obras passam pela API (`GET /lots/:id/image`), porque o museu bloqueia o carregamento direto pelo navegador.

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

## Saldo, lances e liquidação

- Valores sempre em **centavos inteiros** (100000 = R$ 1.000,00), sem decimais, para evitar erro de arredondamento.
- **Saldo disponível = total − comprometido.** Ao dar um lance, o valor fica *comprometido*. Quando alguém cobre o lance, o valor do líder anterior volta ao disponível.
- Cada lance roda em **uma transação** com `SELECT ... FOR UPDATE` no lote: dois lances simultâneos entram em fila e o segundo já enxerga o lance novo.
- **Anti-sniping:** lance nos últimos 2 minutos empurra o fim do lote em +2 minutos.
- **Liquidação:** um job roda a cada 5 segundos, fecha os lotes vencidos, debita o vencedor, credita o leiloeiro, grava o extrato e gera o comprovante. É idempotente (trava o lote e só liquida quem ainda está `live`/`scheduled`). Lote sem lances fecha sem vencedor.

## Auditoria à prova de adulteração (hash encadeado)

Cada lance guarda um selo calculado com SHA-256 (a mesma ideia de uma mini blockchain):

```
hash = SHA256( lot_id | seq | código_público_do_licitante | valor | created_at | prev_hash )
```

O primeiro lance usa 64 zeros como `prev_hash`. A rota pública `GET /audit/:lotId` recalcula a cadeia inteira e compara com o que está no banco. Ela responde `{ intact, brokenAt }` e indica o lance onde a conta deixou de bater.

| Adulteração | Como é detectada |
|---|---|
| Valor, data ou licitante de um lance alterado | o hash recalculado é diferente do gravado |
| Lance apagado do meio | buraco na sequência (`seq`) e vínculo `prev_hash` quebrado |
| Lance inserido depois | `bid_count` e `last_hash` do lote não conferem |
| Último lance apagado | `bid_count` e `last_hash` do lote não conferem |
| `last_hash` do lote ou `final_hash` do comprovante alterado | não bate com o fim da cadeia recalculada |

### Privacidade

O licitante aparece como **"Licitante #A3F9C1D2"**: o código são os 8 primeiros caracteres de `HMAC-SHA256(PUBLIC_CODE_SECRET, user_id)`. Nome e e-mail nunca aparecem na auditoria nem no comprovante.

### Rotas públicas (sem login)

- `GET /audit/:lotId`: histórico completo e resultado da verificação.
- `GET /receipts/:publicToken`: lote, valor final, código do vencedor, data e hash final.

Autenticadas: `GET /me/bids` e `GET /me/wins` (licitante) e `GET /my-lots` (leiloeiro).

### Limite assumido

O hash **detecta alterações parciais**, mas não impede um ataque total: quem tem acesso completo ao banco poderia, em teoria, refazer a cadeia inteira e ainda atualizar `last_hash` e o comprovante, tudo junto, e a auditoria ficaria "íntegra". Isso acontece porque o SHA-256 usado não tem chave secreta. Como melhoria, o hash final poderia ser publicado em um lugar externo ao banco (por exemplo, no próprio comprovante compartilhado com o vencedor, ou em um serviço de registro de terceiros), de modo que uma cópia fora do banco denunciaria a troca. Esse cenário está documentado no teste automatizado `LIMITE ASSUMIDO`.

### Teste de adulteração

Rode estes comandos no SQL Editor do Neon (ou `psql`). Use um lote com lances, trocando `N` pelo id do lote, e confira em `GET /audit/N` depois de cada passo. Antes, guarde uma cópia dos lances para poder desfazer:

```sql
CREATE TABLE bids_backup AS SELECT * FROM bids WHERE lot_id = N;
```

| Cenário | SQL | Resultado esperado | Como desfazer |
|---|---|---|---|
| Valor alterado | `UPDATE bids SET amount = 1 WHERE lot_id = N AND seq = 2;` | `intact: false`, `brokenAt: 2` | `UPDATE bids b SET amount = k.amount FROM bids_backup k WHERE b.id = k.id;` |
| Lance do meio apagado | `DELETE FROM bids WHERE lot_id = N AND seq = 2;` | `intact: false`, `brokenAt: 2` | `INSERT INTO bids SELECT * FROM bids_backup WHERE seq = 2;` |
| Último lance apagado | `DELETE FROM bids WHERE lot_id = N AND seq = (SELECT bid_count FROM lots WHERE id = N);` | `intact: false` (lances faltando no final) | `INSERT INTO bids SELECT * FROM bids_backup k WHERE NOT EXISTS (SELECT 1 FROM bids b WHERE b.id = k.id);` |
| Lance falso inserido | `INSERT INTO bids (lot_id, bidder_id, amount, seq, prev_hash, hash) SELECT lot_id, bidder_id, amount + 10000, seq + 1, hash, repeat('a', 64) FROM bids WHERE lot_id = N ORDER BY seq DESC LIMIT 1;` | `intact: false`, aponta o lance novo | `DELETE FROM bids WHERE lot_id = N AND seq > (SELECT bid_count FROM lots WHERE id = N);` |
| Comprovante alterado | `UPDATE receipts SET final_hash = repeat('a', 64) WHERE lot_id = N;` | `intact: false` | `UPDATE receipts SET final_hash = (SELECT last_hash FROM lots WHERE id = N) WHERE lot_id = N;` |

Ao terminar: `DROP TABLE bids_backup;`

## Como rodar os testes

```bash
cd backend
npm test
```

Roda os testes da auditoria (hash encadeado e detecção de adulteração), que não precisam de banco.

Teste ponta a ponta contra a API em execução (precisa de internet, banco com o seed rodado e a API no ar):

```bash
npm run e2e -- start            # cria um lote ao vivo e testa lances, saldo e auditoria
# encerre o lote: UPDATE lots SET ends_at = now() - interval '1 second' WHERE id = <id>;
npm run e2e -- check <id>       # testa liquidação, comprovante e extratos
```

Para apontar para outra API, defina `API_URL` (por exemplo, a do Render).

## Deploy

- **Front-end (Vercel):** pasta raiz `frontend`, variável `VITE_API_URL` com o endereço da API no Render (sem barra no final). O `vercel.json` já redireciona todas as rotas para o `index.html`.
- **Back-end (Render):** pasta raiz `backend`, comando de início `npm start`, variáveis `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_CODE_SECRET` e `FRONTEND_URL` (endereço da Vercel).
- **Banco (Neon):** rode `npm run migrate` e `npm run seed` uma vez apontando para o banco de produção.
