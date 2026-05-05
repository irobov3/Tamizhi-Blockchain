-- Tamizhi Block Explorer Schema

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
    height      BIGINT PRIMARY KEY,
    hash        VARCHAR(64) NOT NULL,
    time        TIMESTAMPTZ NOT NULL,
    proposer    VARCHAR(52),
    tx_count    INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_blocks_time ON blocks(time DESC);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    hash        VARCHAR(64) PRIMARY KEY,
    height      BIGINT NOT NULL REFERENCES blocks(height),
    index       INT NOT NULL,
    sender      VARCHAR(52),
    msg_types   TEXT[],
    code        INT DEFAULT 0,
    gas_used    BIGINT,
    gas_wanted  BIGINT,
    fee_amount  BIGINT,
    fee_denom   VARCHAR(20),
    memo        TEXT,
    time        TIMESTAMPTZ NOT NULL,
    raw_log     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_height ON transactions(height);
CREATE INDEX IF NOT EXISTS idx_tx_sender ON transactions(sender);
CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(time DESC);

-- Reward events
CREATE TABLE IF NOT EXISTS reward_events (
    id          BIGSERIAL PRIMARY KEY,
    tx_hash     VARCHAR(64) REFERENCES transactions(hash),
    height      BIGINT NOT NULL,
    employee_id VARCHAR(100),
    rule_id     VARCHAR(100),
    amount      BIGINT,
    denom       VARCHAR(20),
    time        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rewards_employee ON reward_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_rewards_rule ON reward_events(rule_id);

-- Node events
CREATE TABLE IF NOT EXISTS node_events (
    id          BIGSERIAL PRIMARY KEY,
    tx_hash     VARCHAR(64),
    height      BIGINT NOT NULL,
    node_id     VARCHAR(100),
    owner       VARCHAR(52),
    event_type  VARCHAR(50),  -- 'registered', 'jailed', 'slashed', 'deregistered'
    swarm_id    VARCHAR(100),
    time        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_node_events_node ON node_events(node_id);

-- Access log entries (mirrored from chain)
CREATE TABLE IF NOT EXISTS access_log_entries (
    id          BIGINT PRIMARY KEY,
    tx_hash     VARCHAR(64),
    height      BIGINT NOT NULL,
    employee_id VARCHAR(100),
    file_name   VARCHAR(500),
    file_hash   VARCHAR(200),
    action      VARCHAR(50),
    time        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_accesslog_employee ON access_log_entries(employee_id);

-- Literature works
CREATE TABLE IF NOT EXISTS literature_works (
    work_id     VARCHAR(100) PRIMARY KEY,
    tx_hash     VARCHAR(64),
    height      BIGINT NOT NULL,
    title       VARCHAR(500),
    author      VARCHAR(100),
    work_type   VARCHAR(50),
    language    VARCHAR(50),
    content_hash VARCHAR(200),
    verified    BOOLEAN DEFAULT FALSE,
    time        TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_works_author ON literature_works(author);

-- Indexer state (checkpoint)
CREATE TABLE IF NOT EXISTS indexer_state (
    key         VARCHAR(50) PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO indexer_state(key, value) VALUES ('last_indexed_height', '0')
    ON CONFLICT (key) DO NOTHING;
