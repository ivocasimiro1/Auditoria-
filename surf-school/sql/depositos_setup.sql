-- =============================================================
-- CONTROLO DE DEPÓSITOS — Despomar
-- Setup das tabelas Supabase
-- Executar no Supabase Dashboard → SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABELAS
-- -------------------------------------------------------------

-- dep_users: perfis de utilizadores autenticados
-- Cada utilizador (staff ou super_admin) tem uma entrada aqui
-- ligada ao seu UUID em auth.users
CREATE TABLE IF NOT EXISTS dep_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id TEXT NOT NULL,          -- ex: 'ess-faro', 'bb-lagos', 'super'
  role TEXT NOT NULL DEFAULT 'staff', -- 'staff' | 'super_admin'
  nome TEXT
);

-- dep_registos: registos de depósitos
-- Um registo = um depósito, com array de sessões de venda (JSONB)
CREATE TABLE IF NOT EXISTS dep_registos (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  loja TEXT NOT NULL,
  tipo TEXT DEFAULT '',
  sessoes JSONB DEFAULT '[]',
  data_deposito TEXT DEFAULT '',
  talao TEXT DEFAULT '',
  responsavel TEXT DEFAULT '',
  obs TEXT DEFAULT '',
  foto TEXT,                        -- base64 da foto do talão (pode ser grande)
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- dep_config: configuração por loja (empresa, emails, lojas, responsáveis)
-- Cada loja tem a sua configuração guardada aqui
CREATE TABLE IF NOT EXISTS dep_config (
  store_id TEXT PRIMARY KEY,
  emp TEXT DEFAULT 'Despomar',
  email TEXT DEFAULT '',
  email_cc TEXT DEFAULT '',
  email_cc2 TEXT DEFAULT '',
  nif TEXT DEFAULT '',
  lojas JSONB DEFAULT '[]',        -- array de nomes de lojas desta store
  resps JSONB DEFAULT '[]'         -- array de nomes de responsáveis
);

-- -------------------------------------------------------------
-- 2. FUNÇÕES HELPER (SECURITY DEFINER para evitar recursão RLS)
-- -------------------------------------------------------------

-- Retorna o store_id do utilizador autenticado
CREATE OR REPLACE FUNCTION dep_my_store() RETURNS TEXT
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT store_id FROM dep_users WHERE id = auth.uid() LIMIT 1
  $$;

-- Retorna true se o utilizador autenticado for super_admin
CREATE OR REPLACE FUNCTION dep_is_sa() RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT EXISTS(SELECT 1 FROM dep_users WHERE id = auth.uid() AND role = 'super_admin')
  $$;

-- -------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -------------------------------------------------------------

-- dep_users: cada utilizador só vê o próprio perfil (exceto super_admin)
ALTER TABLE dep_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dep_users_select" ON dep_users
  FOR SELECT USING (id = auth.uid() OR dep_is_sa());

CREATE POLICY "dep_users_insert" ON dep_users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "dep_users_update" ON dep_users
  FOR UPDATE USING (id = auth.uid() OR dep_is_sa());

-- dep_registos: staff vê só a sua loja, super_admin vê tudo
ALTER TABLE dep_registos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dep_registos_select" ON dep_registos
  FOR SELECT USING (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_registos_insert" ON dep_registos
  FOR INSERT WITH CHECK (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_registos_update" ON dep_registos
  FOR UPDATE USING (dep_is_sa() OR store_id = dep_my_store())
  WITH CHECK (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_registos_delete" ON dep_registos
  FOR DELETE USING (dep_is_sa() OR store_id = dep_my_store());

-- dep_config: staff vê/edita só a sua loja, super_admin vê tudo
ALTER TABLE dep_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dep_config_select" ON dep_config
  FOR SELECT USING (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_config_insert" ON dep_config
  FOR INSERT WITH CHECK (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_config_update" ON dep_config
  FOR UPDATE USING (dep_is_sa() OR store_id = dep_my_store())
  WITH CHECK (dep_is_sa() OR store_id = dep_my_store());

CREATE POLICY "dep_config_delete" ON dep_config
  FOR DELETE USING (dep_is_sa() OR store_id = dep_my_store());

-- -------------------------------------------------------------
-- 4. CRIAR UTILIZADORES
-- -------------------------------------------------------------
-- Passos no Supabase Dashboard:
--
-- A) Ir a Authentication → Users → "Invite user" ou "Add user"
-- B) Criar utilizador com email e password
-- C) Copiar o UUID do utilizador criado (coluna "UID")
-- D) Executar o INSERT abaixo com os UUIDs corretos:
--
--    INSERT INTO dep_users (id, store_id, role, nome) VALUES
--      ('<UUID-loja-faro>',   'ess-faro',   'staff',       'Nome Responsável Faro'),
--      ('<UUID-loja-lagos>',  'bb-lagos',   'staff',       'Nome Responsável Lagos'),
--      ('<UUID-ivo>',         'super',      'super_admin',  'Ivo Casimiro');
--
-- NOTAS:
--   • store_id do super_admin deve ser 'super' (ou qualquer valor — não é usado para filtrar)
--   • store_id do staff deve corresponder ao store_id em dep_registos e dep_config
--   • O super_admin (dep_is_sa() = true) vê TODOS os registos de TODAS as lojas
--   • Staff vê apenas os registos onde store_id = o seu dep_users.store_id
--
-- EXEMPLO REAL Despomar:
--    INSERT INTO dep_users (id, store_id, role, nome) VALUES
--      ('<UUID-ESS-FARO>',    'ess-faro',        'staff',       'Responsável ESS Faro'),
--      ('<UUID-BB-LAGOS>',    'bb-lagos',        'staff',       'Responsável BB Lagos'),
--      ('<UUID-IVO>',         'super',           'super_admin', 'Ivo Casimiro');
