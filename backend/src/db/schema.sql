CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('auctioneer', 'bidder')),
  balance_total BIGINT NOT NULL DEFAULT 0 CHECK (balance_total >= 0),
  balance_committed BIGINT NOT NULL DEFAULT 0 CHECK (balance_committed >= 0),
  public_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (balance_committed <= balance_total)
);

CREATE TABLE IF NOT EXISTS lots (
  id SERIAL PRIMARY KEY,
  auctioneer_id INTEGER NOT NULL REFERENCES users(id),
  external_id TEXT,
  title TEXT NOT NULL,
  image_url TEXT,
  attributes JSONB NOT NULL DEFAULT '{}',
  starting_bid BIGINT NOT NULL CHECK (starting_bid > 0),
  min_increment BIGINT NOT NULL CHECK (min_increment > 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  current_bid BIGINT,
  current_leader_id INTEGER REFERENCES users(id),
  winner_id INTEGER REFERENCES users(id),
  final_price BIGINT,
  last_hash TEXT,
  bid_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (starts_at < ends_at)
);

CREATE TABLE IF NOT EXISTS bids (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER NOT NULL REFERENCES lots(id),
  bidder_id INTEGER NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seq INTEGER NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  UNIQUE (lot_id, seq)
);

CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER NOT NULL UNIQUE REFERENCES lots(id),
  winner_id INTEGER NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  final_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL
    CHECK (type IN ('deposit', 'settlement_debit', 'settlement_credit')),
  amount BIGINT NOT NULL,
  lot_id INTEGER REFERENCES lots(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cópia local das imagens das obras (o lote guarda a URL do museu em image_url).
-- Com ela, vitrine, sala, auditoria e comprovante não dependem da API do museu.
CREATE TABLE IF NOT EXISTS artwork_images (
  image_url TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_lot ON bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_lots_status_end ON lots(status, ends_at);