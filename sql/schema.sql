-- ============================================================
-- DashPro Business — Schema SQL completo
-- Compatível com Supabase (PostgreSQL 15+)
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(20),
    cnpj        VARCHAR(20),
    address     TEXT,
    logo_url    TEXT,
    plan        VARCHAR(50) DEFAULT 'trial',
    status      VARCHAR(50) DEFAULT 'trial',
    trial_ends_at TIMESTAMPTZ,
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'employee',
    is_active       BOOLEAN DEFAULT TRUE,
    avatar_url      VARCHAR(500),
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) UNIQUE NOT NULL,
    description     TEXT,
    price_monthly   NUMERIC(10,2) NOT NULL,
    price_yearly    NUMERIC(10,2),
    max_users       INTEGER DEFAULT 5,
    max_clients     INTEGER DEFAULT 100,
    max_products    INTEGER DEFAULT 100,
    has_whatsapp    BOOLEAN DEFAULT FALSE,
    has_reports     BOOLEAN DEFAULT TRUE,
    has_api         BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    features        JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status          VARCHAR(50) DEFAULT 'trial',
    billing_cycle   VARCHAR(20) DEFAULT 'monthly',
    price           NUMERIC(10,2) NOT NULL,
    starts_at       TIMESTAMPTZ DEFAULT NOW(),
    ends_at         TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount          NUMERIC(10,2) NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    method          VARCHAR(50),
    gateway         VARCHAR(50),
    gateway_id      VARCHAR(255),
    paid_at         TIMESTAMPTZ,
    due_date        TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(30),
    email           VARCHAR(255),
    cpf_cnpj        VARCHAR(20),
    status          VARCHAR(50) DEFAULT 'ativo',
    notes           TEXT,
    last_contact    TIMESTAMPTZ,
    next_contact    TIMESTAMPTZ,
    responsible     VARCHAR(255),
    address         TEXT,
    city            VARCHAR(100),
    state           VARCHAR(50),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    sku             VARCHAR(100),
    description     TEXT,
    category        VARCHAR(100),
    unit            VARCHAR(20) DEFAULT 'un',
    min_stock       NUMERIC(10,3) DEFAULT 0,
    cost_price      NUMERIC(10,2) DEFAULT 0,
    sale_price      NUMERIC(10,2) NOT NULL,
    current_stock   NUMERIC(10,3) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    image_url       TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_sale_price_positive CHECK (sale_price >= 0),
    CONSTRAINT chk_stock_not_negative CHECK (current_stock >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_company ON products(company_id, sku) WHERE sku IS NOT NULL;

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    order_number    VARCHAR(50) NOT NULL,
    status          VARCHAR(50) DEFAULT 'aberto',
    payment_method  VARCHAR(50),
    subtotal        NUMERIC(10,2) DEFAULT 0,
    discount        NUMERIC(10,2) DEFAULT 0,
    total           NUMERIC(10,2) DEFAULT 0,
    notes           TEXT,
    delivered_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    cancel_reason   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_company ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_number_company ON orders(company_id, order_number);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    NUMERIC(10,3) NOT NULL,
    unit_price  NUMERIC(10,2) NOT NULL,
    discount    NUMERIC(10,2) DEFAULT 0,
    total       NUMERIC(10,2) NOT NULL,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- ============================================================
-- STOCK MOVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    type            VARCHAR(20) NOT NULL,  -- entrada, saida, ajuste, perda, devolucao
    quantity        NUMERIC(10,3) NOT NULL,
    quantity_before NUMERIC(10,3) NOT NULL,
    quantity_after  NUMERIC(10,3) NOT NULL,
    unit_cost       NUMERIC(10,2),
    reason          TEXT,
    reference       VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_movement_type CHECK (type IN ('entrada','saida','ajuste','perda','devolucao'))
);

CREATE INDEX IF NOT EXISTS idx_movements_company ON stock_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_movements_created ON stock_movements(created_at DESC);

-- ============================================================
-- WHATSAPP SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id          UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    api_url             VARCHAR(500),
    api_key             VARCHAR(500),
    instance            VARCHAR(255),
    phone_number        VARCHAR(30),
    group_id            VARCHAR(255),
    is_active           BOOLEAN DEFAULT FALSE,
    send_daily_report   BOOLEAN DEFAULT FALSE,
    send_low_stock_alert BOOLEAN DEFAULT TRUE,
    send_order_delivered BOOLEAN DEFAULT TRUE,
    daily_report_time   VARCHAR(5) DEFAULT '08:00',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    entity      VARCHAR(100),
    entity_id   VARCHAR(255),
    details     JSONB,
    ip_address  VARCHAR(50),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_company ON logs(company_id);
CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs(created_at DESC);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['companies','users','plans','subscriptions','payments','clients','products','orders','whatsapp_settings']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%s_updated_at ON %s;
            CREATE TRIGGER trg_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        ', t, t, t, t);
    END LOOP;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Política: acesso total para service_role (backend usa service key)
CREATE POLICY "Service role bypass" ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON clients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON stock_movements FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON whatsapp_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS INICIAIS — Planos
-- ============================================================
INSERT INTO plans (name, slug, price_monthly, max_users, max_clients, max_products, has_whatsapp, has_reports, has_api, features) VALUES
    ('Free',         'free',         0,      2,    20,   20,   FALSE, TRUE,  FALSE, '["Dashboard básico","2 usuários","20 clientes"]'),
    ('Starter',      'starter',      49.90,  5,    200,  200,  TRUE,  TRUE,  FALSE, '["Tudo do Free","WhatsApp","5 usuários","200 clientes"]'),
    ('Professional', 'professional', 99.90,  15,   1000, 1000, TRUE,  TRUE,  TRUE,  '["Tudo do Starter","API","15 usuários","1000 clientes","Relatórios avançados"]'),
    ('Enterprise',   'enterprise',   249.90, 9999, 9999, 9999, TRUE,  TRUE,  TRUE,  '["Tudo ilimitado","Suporte prioritário","SLA garantido"]')
ON CONFLICT (slug) DO NOTHING;
