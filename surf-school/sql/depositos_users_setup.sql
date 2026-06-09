-- =============================================================
-- CONTROLO DE DEPÓSITOS — Criar todas as lojas Despomar
-- Executar no Supabase Dashboard → SQL Editor
-- Password inicial: 12345678 (cada loja altera no 1.º login)
-- =============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_id UUID;
  v_h  TEXT := crypt('12345678', gen_salt('bf'));
BEGIN

  -- ── 58 CAPARICA ──────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','caparica@58surf.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('caparica@58surf.com',v_id,jsonb_build_object('sub',v_id::text,'email','caparica@58surf.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'58-caparica','staff','58 Caparica');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('58-caparica','58 Surf','caparica@58surf.com','gerente.caparica@58surf.com','["58 Caparica"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── 58 ERICEIRA ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ericeira@58surf.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('ericeira@58surf.com',v_id,jsonb_build_object('sub',v_id::text,'email','ericeira@58surf.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'58-ericeira','staff','58 Ericeira');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('58-ericeira','58 Surf','ericeira@58surf.com','gerente.ericeira@58surf.com','["58 Ericeira"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── 58 MATOSINHOS ─────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','matosinhos@58surf.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('matosinhos@58surf.com',v_id,jsonb_build_object('sub',v_id::text,'email','matosinhos@58surf.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'58-matosinhos','staff','58 Matosinhos');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('58-matosinhos','58 Surf','matosinhos@58surf.com','gerente.matosinhos@58surf.com','["58 Matosinhos"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── 58 PENICHE ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','peniche@58surf.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('peniche@58surf.com',v_id,jsonb_build_object('sub',v_id::text,'email','peniche@58surf.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'58-peniche','staff','58 Peniche');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('58-peniche','58 Surf','peniche@58surf.com','gerente.peniche@58surf.com','["58 Peniche"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── BB COLOMBO ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','colombo@billabong.com.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('colombo@billabong.com.pt',v_id,jsonb_build_object('sub',v_id::text,'email','colombo@billabong.com.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'bb-colombo','staff','BB Colombo');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('bb-colombo','Billabong','colombo@billabong.com.pt','gerente.colombo@billabong.com.pt','["BB Colombo"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── BB ERICEIRA ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ericeira@billabong.com.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('ericeira@billabong.com.pt',v_id,jsonb_build_object('sub',v_id::text,'email','ericeira@billabong.com.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'bb-ericeira','staff','BB Ericeira');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('bb-ericeira','Billabong','ericeira@billabong.com.pt','gerente.ericeira@billabong.com.pt','["BB Ericeira"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── BB FREEPORT ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','outlet@billabong.com.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('outlet@billabong.com.pt',v_id,jsonb_build_object('sub',v_id::text,'email','outlet@billabong.com.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'bb-freeport','staff','BB Freeport');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('bb-freeport','Billabong','outlet@billabong.com.pt','gerente.outlet@billabong.com.pt','["BB Freeport"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── BB LAGOS ──────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','lagos@billabong.com.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('lagos@billabong.com.pt',v_id,jsonb_build_object('sub',v_id::text,'email','lagos@billabong.com.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'bb-lagos','staff','BB Lagos');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('bb-lagos','Billabong','lagos@billabong.com.pt','gerente.lagos@billabong.com.pt','["BB Lagos"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ECI GAIA ──────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','eci.gaia@despomar.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('eci.gaia@despomar.com',v_id,jsonb_build_object('sub',v_id::text,'email','eci.gaia@despomar.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'eci-gaia','staff','ECI Gaia');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('eci-gaia','Despomar','eci.gaia@despomar.com','gerente.eci.gaia@despomar.com','["ECI Gaia"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ECI LISBOA ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','eci.lisboa@despomar.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('eci.lisboa@despomar.com',v_id,jsonb_build_object('sub',v_id::text,'email','eci.lisboa@despomar.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'eci-lisboa','staff','ECI Lisboa');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('eci-lisboa','Despomar','eci.lisboa@despomar.com','gerente.eci.lisboa@despomar.com','["ECI Lisboa"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS ALFRAGIDE ─────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','alegro@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('alegro@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','alegro@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-alfragide','staff','ESS Alfragide');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-alfragide','Ericeira Surf & Skate','alegro@ericeirasurfskate.pt','gerente.alegro@ericeirasurfskate.pt','["ESS Alfragide"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS ALMADA ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','almada@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('almada@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','almada@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-almada','staff','ESS Almada');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-almada','Ericeira Surf & Skate','almada@ericeirasurfskate.pt','gerente.almada@ericeirasurfskate.pt','["ESS Almada"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS ALMANCIL ──────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','almancil@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('almancil@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','almancil@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-almancil','staff','ESS Almancil');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-almancil','Ericeira Surf & Skate','almancil@ericeirasurfskate.pt','gerente.almancil@ericeirasurfskate.pt','["ESS Almancil"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS BRAGA ─────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','braga@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('braga@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','braga@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-braga','staff','ESS Braga');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-braga','Ericeira Surf & Skate','braga@ericeirasurfskate.pt','gerente.braga@ericeirasurfskate.pt','["ESS Braga"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS CASCAISHOPPING ────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','cascaishopping@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('cascaishopping@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','cascaishopping@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-cascais','staff','ESS CascaiShopping');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-cascais','Ericeira Surf & Skate','cascaishopping@ericeirasurfskate.pt','gerente.cascais@ericeirasurfskate.pt','["ESS CascaiShopping"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS COIMBRA ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','coimbra@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('coimbra@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','coimbra@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-coimbra','staff','ESS Coimbra');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-coimbra','Ericeira Surf & Skate','coimbra@ericeirasurfskate.pt','gerente.coimbra@ericeirasurfskate.pt','["ESS Coimbra"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS COLOMBO ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','colombo@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('colombo@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','colombo@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-colombo','staff','ESS Colombo');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-colombo','Ericeira Surf & Skate','colombo@ericeirasurfskate.pt','gerente.colombo@ericeirasurfskate.pt','["ESS Colombo"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS ERICEIRA ──────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ericeira@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('ericeira@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','ericeira@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-ericeira','staff','ESS Ericeira');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-ericeira','Ericeira Surf & Skate','ericeira@ericeirasurfskate.pt','gerente.ericeira@ericeirasurfskate.pt','["ESS Ericeira"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS ÉVORA ─────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','evora@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('evora@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','evora@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-evora','staff','ESS Évora');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-evora','Ericeira Surf & Skate','evora@ericeirasurfskate.pt','gerente.evora@ericeirasurfskate.pt','["ESS Évora"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS FARO ──────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','faro@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('faro@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','faro@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-faro','staff','ESS Faro');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-faro','Ericeira Surf & Skate','faro@ericeirasurfskate.pt','gerente.faro@ericeirasurfskate.pt','["ESS Faro"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS FREEPORT ──────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','alcochete@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('alcochete@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','alcochete@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-freeport','staff','ESS Freeport');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-freeport','Ericeira Surf & Skate','alcochete@ericeirasurfskate.pt','gerente.alcochete@ericeirasurfskate.pt','["ESS Freeport"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS GUIA ──────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','guia@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('guia@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','guia@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-guia','staff','ESS Guia');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-guia','Ericeira Surf & Skate','guia@ericeirasurfskate.pt','gerente.guia@ericeirasurfskate.pt','["ESS Guia"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS IKEA PORTO ────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','matosinhos@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('matosinhos@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','matosinhos@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-ikeaporto','staff','ESS Ikea Porto');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-ikeaporto','Ericeira Surf & Skate','matosinhos@ericeirasurfskate.pt','gerente.matosinhos@ericeirasurfskate.pt','["ESS Ikea Porto"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS LAGOS ─────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','lagos@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('lagos@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','lagos@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-lagos','staff','ESS Lagos');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-lagos','Ericeira Surf & Skate','lagos@ericeirasurfskate.pt','gerente.lagos@ericeirasurfskate.pt','["ESS Lagos"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS LEIRIA ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','leiria@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('leiria@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','leiria@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-leiria','staff','ESS Leiria');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-leiria','Ericeira Surf & Skate','leiria@ericeirasurfskate.pt','gerente.leiria@ericeirasurfskate.pt','["ESS Leiria"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS MADEIRA ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','madeira@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('madeira@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','madeira@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-madeira','staff','ESS Madeira');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-madeira','Ericeira Surf & Skate','madeira@ericeirasurfskate.pt','gerente.madeira@ericeirasurfskate.pt','["ESS Madeira"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS NORTESHOPPING ─────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','norteshopping@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('norteshopping@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','norteshopping@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-norteshopping','staff','ESS NorteShopping');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-norteshopping','Ericeira Surf & Skate','norteshopping@ericeirasurfskate.pt','gerente.norteshopping@ericeirasurfskate.pt','["ESS NorteShopping"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS OEIRAS ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','oeiras@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('oeiras@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','oeiras@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-oeiras','staff','ESS Oeiras');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-oeiras','Ericeira Surf & Skate','oeiras@ericeirasurfskate.pt','gerente.oeiras@ericeirasurfskate.pt','["ESS Oeiras"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS SETÚBAL ───────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','setubal@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('setubal@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','setubal@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-setubal','staff','ESS Setúbal');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-setubal','Ericeira Surf & Skate','setubal@ericeirasurfskate.pt','gerente.setubal@ericeirasurfskate.pt','["ESS Setúbal"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS SINTRA ────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','sintra@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('sintra@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','sintra@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-sintra','staff','ESS Sintra');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-sintra','Ericeira Surf & Skate','sintra@ericeirasurfskate.pt','gerente.sintra@ericeirasurfskate.pt','["ESS Sintra"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS STA. CATARINA ─────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','stacatarina@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('stacatarina@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','stacatarina@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-stacatarina','staff','ESS Sta. Catarina');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-stacatarina','Ericeira Surf & Skate','stacatarina@ericeirasurfskate.pt','gerente.stacatarina@ericeirasurfskate.pt','["ESS Sta. Catarina"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS VASCO DA GAMA ─────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','vascodagama@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('vascodagama@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','vascodagama@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-vascodagama','staff','ESS Vasco da Gama');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-vascodagama','Ericeira Surf & Skate','vascodagama@ericeirasurfskate.pt','gerente.vascodagama@ericeirasurfskate.pt','["ESS Vasco da Gama"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── ESS V. CONDE ──────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','vconde@ericeirasurfskate.pt',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('vconde@ericeirasurfskate.pt',v_id,jsonb_build_object('sub',v_id::text,'email','vconde@ericeirasurfskate.pt'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ess-vconde','staff','ESS V. Conde');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ess-vconde','Ericeira Surf & Skate','vconde@ericeirasurfskate.pt','gerente.vconde@ericeirasurfskate.pt','["ESS V. Conde"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── OCASIÃO ───────────────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','lojinha@despomar.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('lojinha@despomar.com',v_id,jsonb_build_object('sub',v_id::text,'email','lojinha@despomar.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'ocasiao','staff','Ocasião');
    INSERT INTO dep_config(store_id,emp,email,email_cc,lojas) VALUES('ocasiao','Despomar','lojinha@despomar.com','anica@despomar.com','["Ocasião"]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

  -- ── IVO — SUPER ADMIN ─────────────────────────────────────
  BEGIN
    v_id := gen_random_uuid();
    INSERT INTO auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data,is_super_admin,confirmation_token,recovery_token,email_change_token_new,email_change)
    VALUES('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ivo@despomar.com',v_h,NOW(),NOW(),NOW(),'{"provider":"email","providers":["email"]}','{}',false,'','','','');
    INSERT INTO auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    VALUES('ivo@despomar.com',v_id,jsonb_build_object('sub',v_id::text,'email','ivo@despomar.com'),'email',NOW(),NOW(),NOW());
    INSERT INTO dep_users(id,store_id,role,nome) VALUES(v_id,'super','super_admin','Ivo Casimiro');
    INSERT INTO dep_config(store_id,emp,email,lojas) VALUES('super','Despomar','ivo@despomar.com','[]') ON CONFLICT(store_id) DO NOTHING;
  EXCEPTION WHEN unique_violation THEN NULL; END;

END $$;

-- =============================================================
-- VERIFICAÇÃO — corre depois para confirmar
-- =============================================================
-- SELECT u.email, d.store_id, d.role, d.nome
-- FROM auth.users u JOIN dep_users d ON u.id = d.id
-- ORDER BY d.store_id;
