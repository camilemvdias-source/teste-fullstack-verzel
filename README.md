# Aurelia · Leilões de Arte

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
| `/` | público | Início: destaques, busca e lotes em leilão, agendados e encerrados |
| `/lotes/:id` | público | Sala do lote: lance atual, histórico de lances, contagem regressiva, selo "você está ganhando / foi superado" e lances (licitante). Atualiza a cada 2 s |
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
| `AUDIT_SECRET` | Chave (mín. 16 caracteres) do HMAC que sela a cadeia de lances. Obrigatória: a API não sobe sem ela. Nunca no banco nem no Git. Trocar a chave invalida a verificação dos lances já gravados |
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

Cada lance guarda um selo calculado com **HMAC-SHA256** (a mesma ideia de uma mini blockchain, mas com chave secreta):

```
hash = HMAC_SHA256( AUDIT_SECRET, lot_id | seq | código_público_do_licitante | valor | created_at | prev_hash )
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

A chave `AUDIT_SECRET` fica só no ambiente do servidor. Quem tem acesso **apenas ao banco** pode alterar dados, mas não consegue recalcular selos válidos, nem refazendo a cadeia inteira junto com `last_hash` e o comprovante (testado em `backend/tests/audit.test.js`). O verificador aceita somente HMAC, então o formato antigo (SHA-256 sem chave) não serve para forjar.

O que continua possível: quem obtiver a chave (acesso ao servidor ou às variáveis do Render) consegue forjar um histórico. A auditoria não é "inviolável". Para reduzir esse risco, seria preciso publicar o selo final fora do sistema (por exemplo, no comprovante do vencedor ou em um registro de terceiros).

**Dados já existentes (migração única):** lotes gravados com o formato antigo precisam ser refeitos com a chave, uma vez, logo após o deploy: `node scripts/reseal-audit.js` (simulação) e `node scripts/reseal-audit.js --confirm`. O script só refaz lotes cuja cadeia antiga esteja íntegra, ignora os já migrados e lista os inconsistentes sem apagar nada. Em bancos de demonstração, é possível alternativamente rodar `clear-lots.js --confirm` e `seed-demo.js`.

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

Roda os testes da auditoria (HMAC encadeado e detecção de adulteração, 19 testes), que não precisam de banco. A chave usada nos testes é definida no próprio arquivo de teste.

Teste ponta a ponta contra a API em execução (precisa de internet, banco com o seed rodado e a API no ar):

```bash
npm run e2e -- start            # cria um lote ao vivo e testa lances, saldo e auditoria
# encerre o lote: UPDATE lots SET ends_at = now() - interval '1 second' WHERE id = <id>;
npm run e2e -- check <id>       # testa liquidação, comprovante e extratos
```

Para apontar para outra API, defina `API_URL` (por exemplo, a do Render).

## Deploy

- **Front-end (Vercel):** pasta raiz `frontend`, variável `VITE_API_URL` com o endereço da API no Render (sem barra no final). O `vercel.json` já redireciona todas as rotas para o `index.html`.
- **Back-end (Render):** pasta raiz `backend`, comando de início `npm start`, variáveis `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_CODE_SECRET`, `AUDIT_SECRET` e `FRONTEND_URL` (endereço da Vercel).
- **Banco (Neon):** rode `npm run migrate` e `npm run seed` uma vez apontando para o banco de produção.

## Lotes de demonstração (seed com lances)

Depois de `npm run seed` (cria as 3 contas), rode com a API no ar:

```bash
cd backend
node scripts/seed-demo.js                                  # API local
API_URL=https://teste-fullstack-verzel.onrender.com node scripts/seed-demo.js   # API publicada
```

Cria 6 lotes de obras do Art Institute of Chicago: 4 ao vivo (3 já com lances dos dois licitantes, terminando em 4 a 7 dias) e 2 agendados. Para apagar tudo e recomeçar, use `node scripts/clear-lots.js --confirm`.

## Rodar com Docker

Precisa do Docker Desktop. Na raiz do projeto:

```bash
docker compose up --build
```

- Front-end: http://localhost:5173
- API: http://localhost:3000/health

O Compose sobe o PostgreSQL, a API e o front. O back-end aplica o schema e cria as contas de teste sozinho na subida. Para criar os lotes de demonstração, em outro terminal: `cd backend && node scripts/seed-demo.js` (precisa de Node 20 e `npm install`). Para zerar o banco do Docker: `docker compose down -v`.

## Cancelamento de lote

Seguindo o enunciado, o leiloeiro só pode cancelar um lote **que ainda não recebeu lances** e que ainda não encerrou. A checagem é feita na API, dentro da transação, com o lote travado por `FOR UPDATE`: se um lance entrar antes do cancelamento, o cancelamento é recusado (409) e, se o cancelamento vencer, o lance seguinte é recusado porque o lote está cancelado. O botão "Cancelar" só aparece quando isso é possível. Como o lote não tem lances, não há valor comprometido; por isso o cancelamento não mexe em saldos (o estorno automático citado como opcional no enunciado só teria o que devolver se houvesse lances). Lotes cancelados somem da vitrine, da auditoria pública e da lista de lances do licitante, e a liquidação não os processa.

## Tema claro e escuro

As cores são variáveis CSS. O botão no cabeçalho alterna entre claro e escuro, a escolha fica no `localStorage` e, se a pessoa nunca escolheu, vale a preferência do sistema.

## Comportamentos inesperados e limitações conhecidas

- **API gratuita "dormindo":** a API no Render pode levar cerca de 50 s para responder à primeira requisição.
- **Imagens das obras:** o museu bloqueia o carregamento direto pelo navegador, então a imagem passa pela nossa API (`GET /lots/:id/image`). Se a imagem não puder ser carregada, a tela mostra um aviso, mas o lote continua funcionando (os dados da obra são copiados para o nosso banco).
- **Prorrogação:** um lance nos últimos 2 minutos empurra o fim em +2 minutos, então o horário de término pode mudar enquanto a pessoa está na sala do lote.
- **Liquidação:** o job roda a cada 5 s. Entre o fim do lote e a liquidação, o licitante pode ver o estado "liquidando" por alguns segundos.
- **Cancelamento:** só é possível em lote sem lances (regra do enunciado); por isso não há estorno de saldo a fazer.
- **Auditoria:** detecta alterações no banco, inclusive o refazimento completo da cadeia sem a chave; não protege contra quem obtiver `AUDIT_SECRET` (veja "Limite assumido" acima).
- **Atualização:** o front usa polling (a cada 2 s na sala do lote, 10 s na vitrine), não WebSocket/SSE.
- **Fora do escopo (conforme o enunciado):** nota fiscal, revenda entre usuários, app nativo e recuperação de senha.

## Uso de IA

Veja o arquivo [AI_USAGE.md](./AI_USAGE.md), com onde a IA foi usada, o que foi revisado e o que foi ajustado.

## Limpar os lotes de teste

```bash
cd backend
node scripts/clear-lots.js            # simulação (não altera nada)
node scripts/clear-lots.js --confirm  # apaga lotes, lances, comprovantes e recalcula saldos
```
