-- =============================================================
-- DEVOLVE — Gestão de aluguer para qualquer negócio
-- Setup das tabelas Supabase
-- Executar no Supabase Dashboard → SQL Editor
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- 1. TABELAS
-- -------------------------------------------------------------

-- devolve_tenants: um negócio cliente do Devolve
CREATE TABLE IF NOT EXISTS devolve_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sector TEXT DEFAULT '',              -- livre — só sugere catálogo inicial
  plano TEXT DEFAULT 'trial',          -- trial | basico | pro
  whatsapp_numero TEXT DEFAULT '',
  activo BOOLEAN DEFAULT true,         -- false = conta suspensa (ex: falta de pagamento) — bloqueia painel e loja
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- devolve_users: liga cada utilizador autenticado a um negócio (tenant)
CREATE TABLE IF NOT EXISTS devolve_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',   -- owner | staff | super_admin
  nome TEXT DEFAULT ''
);

-- devolve_categories: categorias de artigos, definidas por cada negócio
CREATE TABLE IF NOT EXISTS devolve_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  icone TEXT DEFAULT '📦',
  campos_extra JSONB DEFAULT '[]',      -- [{chave,tipo,opcoes[]}]
  ordem INT DEFAULT 0
);

-- devolve_items: tipos de artigo dentro de cada categoria (ex: "BTT aro 29")
CREATE TABLE IF NOT EXISTS devolve_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES devolve_categories(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco NUMERIC DEFAULT 0,          -- preço de aluguer por dia
  caucao_sugerida NUMERIC DEFAULT 0,-- caução recomendada por unidade (artigos caros)
  foto TEXT DEFAULT '',             -- base64 da foto do artigo (mesmo padrão do dep_registos.foto)
  activo BOOLEAN DEFAULT true
);

-- devolve_units: unidades físicas individuais de cada artigo, com código próprio
-- (ex: BTT-001, BTT-002) — permite saber exactamente qual unidade está com qual cliente
CREATE TABLE IF NOT EXISTS devolve_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES devolve_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  atributos JSONB DEFAULT '{}',
  estado TEXT NOT NULL DEFAULT 'disponivel'   -- disponivel | alugada | manutencao
);

-- devolve_rentals: cada empréstimo — coração do sistema
CREATE TABLE IF NOT EXISTS devolve_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_telefone TEXT DEFAULT '',
  cliente_email TEXT DEFAULT '',
  cliente_doc TEXT DEFAULT '',
  itens JSONB DEFAULT '[]',             -- [{item_id,nome,quantidade,atributos}]
  inicio TIMESTAMPTZ DEFAULT NOW(),
  unidade_duracao TEXT DEFAULT 'dias',  -- horas | dias
  duracao INT DEFAULT 1,
  devolucao_prevista TIMESTAMPTZ,
  devolucao_real TIMESTAMPTZ,
  estado TEXT DEFAULT 'activo',         -- activo | devolvido | atraso
  caucao NUMERIC DEFAULT 0,
  preco_total NUMERIC DEFAULT 0,
  notas TEXT DEFAULT '',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- devolve_config: configuração por negócio
CREATE TABLE IF NOT EXISTS devolve_config (
  tenant_id UUID PRIMARY KEY REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  nome_negocio TEXT DEFAULT '',
  morada TEXT DEFAULT '',
  email TEXT DEFAULT '',
  whatsapp_numero TEXT DEFAULT '',
  horario_fecho TEXT DEFAULT '18:00',
  notif_whatsapp_auto BOOLEAN DEFAULT true,
  notif_atraso_horas INT DEFAULT 1,
  idioma TEXT DEFAULT 'pt'
);

-- -------------------------------------------------------------
-- 2. FUNÇÕES HELPER (SECURITY DEFINER para evitar recursão RLS)
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION devolve_my_tenant() RETURNS UUID
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT tenant_id FROM devolve_users WHERE id = auth.uid() LIMIT 1
  $$;

CREATE OR REPLACE FUNCTION devolve_is_sa() RETURNS BOOLEAN
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT EXISTS(SELECT 1 FROM devolve_users WHERE id = auth.uid() AND role = 'super_admin')
  $$;

-- -------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -------------------------------------------------------------

ALTER TABLE devolve_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolve_config ENABLE ROW LEVEL SECURITY;

-- devolve_tenants: qualquer utilizador autenticado pode criar o seu (onboarding);
-- só vê/edita o próprio depois de ligado via devolve_users
CREATE POLICY "devolve_tenants_insert" ON devolve_tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "devolve_tenants_select" ON devolve_tenants
  FOR SELECT USING (devolve_is_sa() OR id = devolve_my_tenant());

CREATE POLICY "devolve_tenants_update" ON devolve_tenants
  FOR UPDATE USING (devolve_is_sa() OR id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR id = devolve_my_tenant());

-- devolve_users: cada utilizador cria/vê o seu próprio perfil; super_admin vê todos
CREATE POLICY "devolve_users_insert" ON devolve_users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "devolve_users_select" ON devolve_users
  FOR SELECT USING (id = auth.uid() OR devolve_is_sa());

CREATE POLICY "devolve_users_update" ON devolve_users
  FOR UPDATE USING (id = auth.uid() OR devolve_is_sa());

-- devolve_categories / devolve_items / devolve_rentals / devolve_config:
-- isolamento por tenant_id, super_admin vê tudo
CREATE POLICY "devolve_categories_all" ON devolve_categories
  FOR ALL USING (devolve_is_sa() OR tenant_id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR tenant_id = devolve_my_tenant());

CREATE POLICY "devolve_items_all" ON devolve_items
  FOR ALL USING (devolve_is_sa() OR tenant_id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR tenant_id = devolve_my_tenant());

CREATE POLICY "devolve_units_all" ON devolve_units
  FOR ALL USING (devolve_is_sa() OR tenant_id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR tenant_id = devolve_my_tenant());

CREATE POLICY "devolve_rentals_all" ON devolve_rentals
  FOR ALL USING (devolve_is_sa() OR tenant_id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR tenant_id = devolve_my_tenant());

CREATE POLICY "devolve_config_all" ON devolve_config
  FOR ALL USING (devolve_is_sa() OR tenant_id = devolve_my_tenant())
  WITH CHECK (devolve_is_sa() OR tenant_id = devolve_my_tenant());

-- -------------------------------------------------------------
-- 4. SUPER-ADMIN (Ivo — Devolve HQ)
-- -------------------------------------------------------------
-- Depois de criares a tua conta normal via /devolve (signup), promove-a:
--
--   UPDATE devolve_users SET role = 'super_admin' WHERE id = '<TEU-UUID>';
--
-- Um super_admin não precisa de tenant_id — devolve_is_sa() ignora-o.
-- No painel Devolve HQ vês todos os tenants, todas as rentals.
