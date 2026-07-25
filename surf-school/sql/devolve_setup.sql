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
-- devolve_grupos: junta várias lojas (tenants) do mesmo dono sob um único login.
-- Cada loja continua com o seu próprio catálogo, stock, link público e preço —
-- o grupo só serve para o dono poder trocar de loja sem ter de sair da conta.
CREATE TABLE IF NOT EXISTS devolve_grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devolve_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sector TEXT DEFAULT '',              -- livre — só sugere catálogo inicial
  plano TEXT DEFAULT '',                -- valor mensal combinado (texto livre, ex: "25€/mês") — em branco até o Devolve HQ aprovar e definir o preço
  whatsapp_numero TEXT DEFAULT '',
  slug TEXT UNIQUE,                    -- identifica o link público de reservas: /loja/<slug>
  activo BOOLEAN DEFAULT true,         -- suspensão manual (o Devolve pode forçar bloqueio a qualquer momento)
  aprovado BOOLEAN DEFAULT true,       -- pedidos vindos do signup público nascem com false — só o Devolve HQ aprova
  proximo_pagamento DATE DEFAULT (CURRENT_DATE + INTERVAL '1 month'), -- passado este dia sem "marcar pagamento", a conta bloqueia-se sozinha
  grupo_id UUID REFERENCES devolve_grupos(id) ON DELETE SET NULL, -- lojas do mesmo dono partilham grupo_id; preço/catálogo continuam independentes
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Migração para bases de dados já existentes (idempotente — seguro correr outra vez)
ALTER TABLE devolve_tenants ADD COLUMN IF NOT EXISTS aprovado BOOLEAN DEFAULT true;
ALTER TABLE devolve_tenants ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE devolve_tenants ALTER COLUMN plano SET DEFAULT '';
UPDATE devolve_tenants SET plano = '' WHERE plano = 'trial'; -- "trial" era um valor automático fictício, nunca reflectiu um preço real combinado
ALTER TABLE devolve_tenants ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES devolve_grupos(id) ON DELETE SET NULL;

-- devolve_users: liga cada utilizador autenticado a um negócio (tenant)
CREATE TABLE IF NOT EXISTS devolve_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES devolve_tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',   -- owner | staff | super_admin
  nome TEXT DEFAULT '',
  grupo_id UUID REFERENCES devolve_grupos(id) ON DELETE SET NULL -- definido quando o dono pede a 2ª loja; dá-lhe acesso a todas as lojas do grupo
);
ALTER TABLE devolve_users ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES devolve_grupos(id) ON DELETE SET NULL;

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

CREATE OR REPLACE FUNCTION devolve_my_grupo() RETURNS UUID
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT grupo_id FROM devolve_users WHERE id = auth.uid() LIMIT 1
  $$;

-- devolve_meus_tenants: todas as lojas a que este utilizador tem acesso — a sua
-- própria (devolve_my_tenant) mais as restantes do mesmo grupo, se tiver uma.
-- Para a maioria dos utilizadores (sem grupo) devolve só a sua loja, como antes.
CREATE OR REPLACE FUNCTION devolve_meus_tenants() RETURNS SETOF UUID
  LANGUAGE SQL SECURITY DEFINER STABLE AS $$
    SELECT id FROM devolve_tenants WHERE grupo_id IS NOT NULL AND grupo_id = devolve_my_grupo()
    UNION
    SELECT devolve_my_tenant() WHERE devolve_my_tenant() IS NOT NULL
  $$;

-- devolve_public_tenant_info: usada pela página pública de reservas (sem login).
-- Só devolve dados de negócios aprovados e activos — se a loja ficar pendente
-- ou for suspensa, o link público dela deixa de funcionar automaticamente.
CREATE OR REPLACE FUNCTION devolve_public_tenant_info(p_slug TEXT)
RETURNS TABLE(id UUID, nome TEXT, nome_negocio TEXT, sector TEXT, horario_fecho TEXT)
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT t.id, t.nome, COALESCE(c.nome_negocio, t.nome), t.sector, COALESCE(c.horario_fecho, '18:00')
  FROM devolve_tenants t
  LEFT JOIN devolve_config c ON c.tenant_id = t.id
  WHERE t.slug = p_slug AND t.aprovado = true AND t.activo = true
$$;
GRANT EXECUTE ON FUNCTION devolve_public_tenant_info(TEXT) TO anon, authenticated;

-- devolve_criar_negocio: cria a loja inteira (tenant + utilizador + config + catálogo)
-- numa única transacção, em vez de várias escritas separadas do lado do cliente.
-- Corre com privilégios elevados (SECURITY DEFINER) — não depende da RLS de cada
-- tabela nem de o cliente reenviar a sessão correctamente em cada passo. Se algo
-- falhar a meio, a função inteira é desfeita (nada fica criado pela metade).
CREATE OR REPLACE FUNCTION devolve_criar_negocio(
  p_nome_negocio TEXT,
  p_sector TEXT,
  p_whatsapp TEXT,
  p_nome_resp TEXT,
  p_catalogo JSONB  -- [{nome,icone,campos_extra,itens:[{nome,preco,caucao_sugerida,quantidade_inicial,prefixo}]}]
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_tenant_id UUID;
  v_cat JSONB;
  v_cat_id UUID;
  v_item JSONB;
  v_item_id UUID;
  v_slug TEXT;
  v_n INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado — inicia sessão antes de criar o negócio';
  END IF;
  IF EXISTS (SELECT 1 FROM devolve_users WHERE id = v_uid) THEN
    RAISE EXCEPTION 'Esta conta já está associada a um negócio';
  END IF;

  v_slug := lower(regexp_replace(p_nome_negocio, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4);

  INSERT INTO devolve_tenants (nome, sector, whatsapp_numero, plano, aprovado, slug)
  VALUES (p_nome_negocio, p_sector, p_whatsapp, '', false, v_slug)
  RETURNING id INTO v_tenant_id;

  INSERT INTO devolve_users (id, tenant_id, role, nome) VALUES (v_uid, v_tenant_id, 'owner', p_nome_resp);

  INSERT INTO devolve_config (tenant_id, nome_negocio, whatsapp_numero, horario_fecho, notif_whatsapp_auto, notif_atraso_horas, idioma)
  VALUES (v_tenant_id, p_nome_negocio, p_whatsapp, '18:00', true, 1, 'pt');

  FOR v_cat IN SELECT * FROM jsonb_array_elements(p_catalogo)
  LOOP
    INSERT INTO devolve_categories (tenant_id, nome, icone, campos_extra, ordem)
    VALUES (v_tenant_id, v_cat->>'nome', COALESCE(v_cat->>'icone','📦'), COALESCE(v_cat->'campos_extra','[]'::jsonb), 0)
    RETURNING id INTO v_cat_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cat->'itens','[]'::jsonb))
    LOOP
      INSERT INTO devolve_items (tenant_id, category_id, nome, preco, caucao_sugerida, foto, activo)
      VALUES (v_tenant_id, v_cat_id, v_item->>'nome', COALESCE((v_item->>'preco')::numeric,0), COALESCE((v_item->>'caucao_sugerida')::numeric,0), '', true)
      RETURNING id INTO v_item_id;

      FOR v_n IN 1..COALESCE((v_item->>'quantidade_inicial')::int,0)
      LOOP
        INSERT INTO devolve_units (tenant_id, item_id, codigo, atributos, estado)
        VALUES (v_tenant_id, v_item_id, COALESCE(v_item->>'prefixo','ART')||'-'||lpad(v_n::text,3,'0'), '{}'::jsonb, 'disponivel');
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_tenant_id;
END;
$$;
GRANT EXECUTE ON FUNCTION devolve_criar_negocio(TEXT,TEXT,TEXT,TEXT,JSONB) TO authenticated;

-- devolve_criar_loja_grupo: um dono já autenticado pede MAIS uma loja com o mesmo
-- login (em vez de criar uma conta nova do zero). Cria o grupo na primeira vez
-- (ligando também a loja original do dono a esse grupo) e a loja nova nasce
-- pendente (aprovado=false) — o Devolve HQ aprova-a e combina o preço tal como
-- uma loja normal. Catálogo/stock/preço continuam 100% independentes por loja.
CREATE OR REPLACE FUNCTION devolve_criar_loja_grupo(
  p_nome_negocio TEXT,
  p_sector TEXT,
  p_whatsapp TEXT,
  p_catalogo JSONB,
  p_nome_grupo TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_grupo_id UUID;
  v_tenant_id UUID;
  v_cat JSONB;
  v_cat_id UUID;
  v_item JSONB;
  v_item_id UUID;
  v_slug TEXT;
  v_n INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM devolve_users WHERE id = v_uid AND role = 'owner') THEN
    RAISE EXCEPTION 'Só o dono de um negócio pode pedir uma loja adicional';
  END IF;

  SELECT grupo_id INTO v_grupo_id FROM devolve_users WHERE id = v_uid;
  IF v_grupo_id IS NULL THEN
    INSERT INTO devolve_grupos (nome) VALUES (COALESCE(NULLIF(p_nome_grupo,''), p_nome_negocio))
    RETURNING id INTO v_grupo_id;
    UPDATE devolve_users SET grupo_id = v_grupo_id WHERE id = v_uid;
    UPDATE devolve_tenants SET grupo_id = v_grupo_id
      WHERE id = (SELECT tenant_id FROM devolve_users WHERE id = v_uid);
  END IF;

  v_slug := lower(regexp_replace(p_nome_negocio, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4);

  INSERT INTO devolve_tenants (nome, sector, whatsapp_numero, plano, aprovado, slug, grupo_id)
  VALUES (p_nome_negocio, p_sector, p_whatsapp, '', false, v_slug, v_grupo_id)
  RETURNING id INTO v_tenant_id;

  INSERT INTO devolve_config (tenant_id, nome_negocio, whatsapp_numero, horario_fecho, notif_whatsapp_auto, notif_atraso_horas, idioma)
  VALUES (v_tenant_id, p_nome_negocio, p_whatsapp, '18:00', true, 1, 'pt');

  FOR v_cat IN SELECT * FROM jsonb_array_elements(p_catalogo)
  LOOP
    INSERT INTO devolve_categories (tenant_id, nome, icone, campos_extra, ordem)
    VALUES (v_tenant_id, v_cat->>'nome', COALESCE(v_cat->>'icone','📦'), COALESCE(v_cat->'campos_extra','[]'::jsonb), 0)
    RETURNING id INTO v_cat_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_cat->'itens','[]'::jsonb))
    LOOP
      INSERT INTO devolve_items (tenant_id, category_id, nome, preco, caucao_sugerida, foto, activo)
      VALUES (v_tenant_id, v_cat_id, v_item->>'nome', COALESCE((v_item->>'preco')::numeric,0), COALESCE((v_item->>'caucao_sugerida')::numeric,0), '', true)
      RETURNING id INTO v_item_id;

      FOR v_n IN 1..COALESCE((v_item->>'quantidade_inicial')::int,0)
      LOOP
        INSERT INTO devolve_units (tenant_id, item_id, codigo, atributos, estado)
        VALUES (v_tenant_id, v_item_id, COALESCE(v_item->>'prefixo','ART')||'-'||lpad(v_n::text,3,'0'), '{}'::jsonb, 'disponivel');
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_tenant_id;
END;
$$;
GRANT EXECUTE ON FUNCTION devolve_criar_loja_grupo(TEXT,TEXT,TEXT,JSONB,TEXT) TO authenticated;

-- Privilégio de base nas tabelas (RLS por si só não chega — sem isto dá
-- "permission denied for table" mesmo com as políticas todas certas).
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON devolve_tenants, devolve_users, devolve_categories, devolve_items, devolve_units, devolve_rentals, devolve_config, devolve_grupos TO anon, authenticated;

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
ALTER TABLE devolve_grupos ENABLE ROW LEVEL SECURITY;

-- devolve_tenants: qualquer utilizador autenticado pode criar o seu (onboarding);
-- só vê/edita as lojas a que tem acesso (a própria, mais as do mesmo grupo — ver
-- devolve_meus_tenants()) depois de ligado via devolve_users
CREATE POLICY "devolve_tenants_insert" ON devolve_tenants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "devolve_tenants_select" ON devolve_tenants;
CREATE POLICY "devolve_tenants_select" ON devolve_tenants
  FOR SELECT USING (devolve_is_sa() OR id IN (SELECT devolve_meus_tenants()));

DROP POLICY IF EXISTS "devolve_tenants_update" ON devolve_tenants;
CREATE POLICY "devolve_tenants_update" ON devolve_tenants
  FOR UPDATE USING (devolve_is_sa() OR id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR id IN (SELECT devolve_meus_tenants()));

-- só o super-admin pode apagar negócios (rejeitar pedidos / limpar contas de teste)
CREATE POLICY "devolve_tenants_delete" ON devolve_tenants
  FOR DELETE USING (devolve_is_sa());

-- devolve_users: cada utilizador cria/vê o seu próprio perfil; super_admin vê todos
CREATE POLICY "devolve_users_insert" ON devolve_users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "devolve_users_select" ON devolve_users
  FOR SELECT USING (id = auth.uid() OR devolve_is_sa());

CREATE POLICY "devolve_users_update" ON devolve_users
  FOR UPDATE USING (id = auth.uid() OR devolve_is_sa());

-- devolve_grupos: o dono só vê o seu próprio grupo; super_admin vê todos
CREATE POLICY "devolve_grupos_select" ON devolve_grupos
  FOR SELECT USING (devolve_is_sa() OR id = devolve_my_grupo());

-- devolve_categories / devolve_items / devolve_rentals / devolve_config:
-- isolamento por tenant_id — inclui todas as lojas do grupo do utilizador,
-- não só a que tem em devolve_users.tenant_id — super_admin vê tudo
DROP POLICY IF EXISTS "devolve_categories_all" ON devolve_categories;
CREATE POLICY "devolve_categories_all" ON devolve_categories
  FOR ALL USING (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()));

DROP POLICY IF EXISTS "devolve_items_all" ON devolve_items;
CREATE POLICY "devolve_items_all" ON devolve_items
  FOR ALL USING (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()));

DROP POLICY IF EXISTS "devolve_units_all" ON devolve_units;
CREATE POLICY "devolve_units_all" ON devolve_units
  FOR ALL USING (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()));

DROP POLICY IF EXISTS "devolve_rentals_all" ON devolve_rentals;
CREATE POLICY "devolve_rentals_all" ON devolve_rentals
  FOR ALL USING (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()));

DROP POLICY IF EXISTS "devolve_config_all" ON devolve_config;
CREATE POLICY "devolve_config_all" ON devolve_config
  FOR ALL USING (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()))
  WITH CHECK (devolve_is_sa() OR tenant_id IN (SELECT devolve_meus_tenants()));

-- Página pública de reservas (cliente final, sem login) — acesso extra e limitado,
-- só a catálogo e só de negócios aprovados+activos. Some sozinho se a loja for
-- suspensa ou ficar pendente, porque a condição deixa de se verificar.
CREATE POLICY "devolve_categories_public_select" ON devolve_categories
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM devolve_tenants t WHERE t.id = devolve_categories.tenant_id AND t.aprovado = true AND t.activo = true)
  );

CREATE POLICY "devolve_items_public_select" ON devolve_items
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM devolve_tenants t WHERE t.id = devolve_items.tenant_id AND t.aprovado = true AND t.activo = true)
  );

CREATE POLICY "devolve_units_public_select" ON devolve_units
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM devolve_tenants t WHERE t.id = devolve_units.tenant_id AND t.aprovado = true AND t.activo = true)
  );

-- o cliente final só pode CRIAR pedidos (estado='pendente') — nunca ver, editar
-- ou apagar alugueres; confirmar/recusar continua a ser só do staff da loja.
CREATE POLICY "devolve_rentals_public_insert" ON devolve_rentals
  FOR INSERT TO anon WITH CHECK (
    estado = 'pendente'
    AND EXISTS (SELECT 1 FROM devolve_tenants t WHERE t.id = devolve_rentals.tenant_id AND t.aprovado = true AND t.activo = true)
  );

-- -------------------------------------------------------------
-- 4. SUPER-ADMIN (Ivo — Devolve HQ)
-- -------------------------------------------------------------
-- Depois de criares a tua conta normal via /devolve (signup), promove-a:
--
--   UPDATE devolve_users SET role = 'super_admin' WHERE id = '<TEU-UUID>';
--
-- Um super_admin não precisa de tenant_id — devolve_is_sa() ignora-o.
-- No painel Devolve HQ vês todos os tenants, todas as rentals.
