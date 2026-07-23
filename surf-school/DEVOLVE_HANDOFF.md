# Devolve — Handoff para recomeço num repositório próprio

Este documento existe para que, quando o Devolve passar para um repositório
GitHub dedicado (separado do `Auditoria-`), nada do que já foi construído e
aprendido se perca. Serve de ponto de partida para essa migração.

## O que é o Devolve

SaaS multi-negócio de gestão de aluguer e reservas — bicicletas, ferramentas,
festas, praia, escolas de surf, ou qualquer coisa que se aluga/reserva por
horas ou dias. Cada negócio cliente ("tenant") tem o seu próprio catálogo,
painel de gestão, e um link público para os clientes finais reservarem
sozinhos.

Nome actual: **Devolve** — centralizado numa única constante `APP_NAME` no
código (ver `devolve.html`), pronto a mudar para algo mais universal que
cubra "equipamentos e serviços" sem tocar em dezenas de sítios.

Modelo de negócio: cada negócio paga uma mensalidade (valor a combinar por
negócio, gerido manualmente); contas novas nascem "pendentes" e só o
super-admin (Devolve HQ) aprova, definindo o preço antes de activar.

## Ficheiros a levar para o repositório novo

- `surf-school/devolve.html` — versão de produção, ligada a Supabase.
- `surf-school/devolve-demo.html` — demo local (localStorage, sem backend),
  útil para testar/mostrar fluxos sem precisar de infraestrutura.
- `surf-school/sql/devolve_setup.sql` — schema completo (tabelas, RLS,
  funções) pronto a correr num projecto Supabase novo e vazio.
- Este ficheiro (`DEVOLVE_HANDOFF.md`).

## Projecto Supabase — já criado, próprio e independente

- **URL**: `https://yclgwqiieejsyhdoojeb.supabase.co`
- Dedicado só ao Devolve — **não** partilha `auth.users` nem tabelas com o
  projecto usado pelas outras ferramentas (depósitos, etc.). Isto foi
  decidido depois de confusão real durante os testes: contas de teste
  colidiam com contas de outras ferramentas no mesmo projecto Supabase.
- O SQL completo (`devolve_setup.sql`) já foi corrido lá — tabelas, RLS e
  funções já existem.
- **Falta**: criar a primeira conta via `/devolve` (signup normal) e
  promovê-la a `super_admin`:
  ```sql
  UPDATE devolve_users SET role = 'super_admin'
  WHERE id = (SELECT id FROM auth.users WHERE email = '<teu-email>');
  ```
- As chaves (`SUPABASE_URL`/`SUPABASE_KEY`) já estão no topo do
  `devolve.html` — se migrar para outro projecto Supabase de novo, só é
  preciso trocar essas duas constantes.

## Decisões de arquitectura importantes (não repetir os mesmos erros)

1. **Criação de negócio é uma função só, não vários inserts separados.**
   `devolve_criar_negocio(...)` (SECURITY DEFINER, em `devolve_setup.sql`)
   cria tenant + utilizador + config + catálogo inteiro numa transacção
   atómica. A versão antiga fazia 6+ escritas separadas do lado do
   cliente, dependendo da sessão estar disponível em cada uma — isto
   causou horas de bugs intermitentes ("new row violates row-level
   security policy") difíceis de reproduzir. **Não voltar a esse padrão.**
2. **Contas novas nascem `aprovado=false`.** Só o super-admin aprova via
   Devolve HQ (define preço combinado antes de activar). Evita que um
   cliente com várias lojas crie contas extra sozinho sem pagar.
3. **Link público por loja** (`/loja/:slug`) — gerado automaticamente,
   só funciona para tenants `aprovado=true AND activo=true` (verificado
   pela função `devolve_public_tenant_info`, SECURITY DEFINER). Deixa de
   funcionar sozinho se a loja for suspensa ou ficar pendente.
4. **Duração por artigo, não por carrinho inteiro.** Cada linha do
   carrinho (`{item_id, unit_ids, unidade, duracao}`) tem a sua própria
   duração — permite alugar uma prancha por 3 dias e uma aula por 2 horas
   na mesma reserva. Ao confirmar, agrupa por duração e gera um registo
   por grupo (mesmo cliente, um WhatsApp/email só com tudo).
5. **WhatsApp + email em paralelo, sempre.** Todas as notificações (novo
   pedido de conta, confirmação de reserva, lembrete de atraso) abrem
   `wa.me` e `mailto:` ao mesmo tempo. Ambos exigem que alguém carregue em
   "Enviar" — não há envio silencioso automático sem um backend próprio
   (Twilio/WhatsApp Business API/Resend, etc. — considerar se escalar).
6. **RLS + GRANT são coisas diferentes.** Criar as políticas RLS não
   chega — é preciso `GRANT` explícito às roles `anon`/`authenticated`
   nas tabelas, senão dá "permission denied" mesmo com as políticas
   certas. Já está no `devolve_setup.sql`, não esquecer em migrações
   futuras.
7. **Bloqueio automático por falta de pagamento** — `proximo_pagamento`
   em `devolve_tenants`; passado esse dia sem "marcar pagamento", a conta
   bloqueia-se sozinha (verificado a cada render/login, sem cron). Pagar
   em dia soma a partir da data actual de validade (nunca perde dias
   pagos); pagar em atraso soma a partir de hoje; dá para pagar vários
   meses de uma vez com pré-visualização da data resultante.

## Por fazer / roadmap conhecido

- [ ] Testar o fluxo completo ponta-a-ponta no projecto Supabase novo
      (criar loja → aprovar → link público → reserva de cliente →
      confirmar → devolver).
- [ ] Portar o catálogo tipo "montra" (`renderClientStore` da demo) para
      produção, se ainda não estiver — a demo tem uma versão mais antiga
      (duração global, não por artigo) que também merece actualização.
- [ ] Considerar domínio próprio (ex: `devolve.pt`) antes de publicidade.
- [ ] Páginas legais (termos, privacidade) — recolhe dados pessoais de
      clientes finais (nome, telefone, email).
- [ ] Pagamento automático (Stripe) quando houver mais de ~10 negócios —
      hoje é 100% manual (marcar pago no Devolve HQ).
- [ ] Notificações por backend real (email automático silencioso, sem
      precisar de alguém carregar em "Enviar") se o volume justificar.

## Repositório novo — quando avançar

Quando quiser criar o repositório dedicado:
1. Criar o repo no GitHub (`ivocasimiro1/devolve` ou nome à escolha).
2. Copiar os 3 ficheiros listados acima para a raiz (ou uma pasta `app/`).
3. Configurar Cloudflare Pages a apontar para esse repo/branch `main`.
4. Nada muda no lado do Supabase — o projecto `yclgwqiieejsyhdoojeb` já
   está pronto e independente, só continua a ser usado.
