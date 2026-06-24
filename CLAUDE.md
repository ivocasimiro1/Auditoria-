# Plataforma Despomar — Documentação do Projeto

## REGRAS CRÍTICAS PARA QUALQUER SESSÃO NOVA

**Este repo é o `ivocasimiro1/Auditoria-` — ferramentas internas do Grupo Despomar.**

### O que NÃO fazer
- **Nunca criar `surf-school/_redirects`** — o único `_redirects` válido é o da raiz do repo
- **Nunca modificar o `_redirects` da raiz** sem adicionar as novas rotas no fim, mantendo todas as existentes
- **Nunca tocar** em ficheiros existentes ao criar uma ferramenta nova — só adicionar ficheiros novos
- **NÃO há ficheiros de depósitos aqui** — `depositos.html`, `manual-depositos.html` e `tg-webhook.js` foram migrados para o repo `ivocasimiro1/depositos-despomar`

### Como adicionar uma ferramenta nova
1. Criar `surf-school/nome-ferramenta.html` (ficheiro novo)
2. Adicionar rota no **fim** do `_redirects` da raiz: `/rota /surf-school/nome-ferramenta.html 301`
3. Não tocar em mais nada

### Sistemas activos neste repo (não partir)
| URL | Ficheiro | Sistema |
|---|---|---|
| `/rotacao` | `surf-school/redistribuicao-stock.html` | Redistribuição de stock ✅ |

### Sistemas noutros repos (NÃO estão aqui)
| URL | Repo | Sistema |
|---|---|---|
| `/depositos` | `ivocasimiro1/depositos-despomar` → `depositos-despomar.pages.dev` | Controlo de depósitos ✅ |
| `/manual-depositos` | `ivocasimiro1/depositos-despomar` | Manual dos depósitos ✅ |
| Bot Telegram | `ivocasimiro1/depositos-despomar` → `functions/api/tg-webhook.js` | Ranking/status lojas ✅ |

---

## O que é isto
Ferramentas internas do Grupo Despomar, geridas por Ivo Casimiro (ivo@despomar.com / ivocasimiro@gmail.com).

O **SaaS Escolas de Surf** (reservas de aulas) vai ser separado para um repo próprio quando lançar comercialmente — por agora o código existe aqui mas não está em uso activo.

## URLs de produção
**https://auditoria-25b.pages.dev**
- `/depositos` → Sistema de controlo de depósitos (principal)
- `/rotacao` → Ferramenta de redistribuição de stock
- `/surf` ou `/reservar` → Site de reservas público (aulas de surf) — em standby
- `/admin` → Painel do dono da escola de surf — em standby
- `/super-admin` → Painel do Ivo (super-admin escolas) — em standby

## Infraestrutura
- **Hosting**: Cloudflare Pages (deploy automático do branch `main`)
- **Base de dados**: Supabase (PostgreSQL + Realtime)
  - URL: `https://ubeqidccuvsjhjphybxz.supabase.co`
  - Anon key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZXFpZGNjdXZzamhqcGh5Ynh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzNDI0NTYsImV4cCI6MjA5NTkxODQ1Nn0.wyCBBMSuRfxrz935XifGa3Chgv64o4-ACvP5rCj7t1U`
- **Email backup**: FormSubmit.co → ivocasimiro@gmail.com
- **Notificações**: WhatsApp (wa.me links)

## Ficheiros principais
```
surf-school/
  index.html          ← Site de reservas público (multi-idioma)
  admin.html          ← Painel do dono da escola de surf
  super-admin.html    ← Painel do Ivo (todas as escolas)
  proposta.html       ← Página de proposta comercial
  rental-58surf.html  ← Painel de alugueres 58 Surf (Despomar)
_redirects            ← Clean URLs para Cloudflare Pages
```

## Base de dados — Tabela `bookings`
Colunas principais:
- `id` UUID (gerado automaticamente)
- `school_id` TEXT (ex: 'escola-teste')
- `lesson_type` TEXT (ex: 'Iniciante')
- `booking_date` DATE
- `booking_time` TEXT (ex: '08:00')
- `num_people` INTEGER
- `client_name`, `client_phone`, `client_email`, `client_country` TEXT
- `client_weight` INTEGER, `client_height` INTEGER, `client_gender` TEXT
- `wetsuit_size` TEXT
- `equipment_list` JSONB (array com dados de cada pessoa)
- `language` TEXT (pt, en, fr, de, es, nl, pt-br)
- `status` TEXT (pending, confirmed, completed, cancelled)
- `total_price` NUMERIC
- `notes` TEXT
- `created_at` TIMESTAMP

Políticas RLS activas (sem restrição de role — acesso público):
- `allow_insert`: FOR INSERT WITH CHECK (true)
- `allow_select`: FOR SELECT USING (true)
- `allow_update`: FOR UPDATE USING/WITH CHECK (true)
- `allow_delete`: FOR DELETE USING (true)

## Escolas activas (SCHOOLS config em admin.html e super-admin.html)
```javascript
{ id: 'escola-teste', name: 'Escola Surf Teste', wa_number: '351962800400',
  slots: ['08:00','10:30','14:00','16:30'], max_per_slot: 6,
  meeting_point: 'Praia de Arrifana, junto ao acesso principal...' }
```
Para adicionar uma escola real: duplicar este objecto com novo `id`, nome, número WA e ponto de encontro.

## Idiomas suportados
PT (Português), EN (English), FR (Français), DE (Deutsch), ES (Español), NL (Nederlands), PT-BR (Brasileiro)

Detecção automática de idioma pelo país do cliente:
- UK/USA/Canada/Ireland → EN
- France/Belgium/Switzerland → FR
- Germany/Austria → DE
- Spain → ES
- Netherlands → NL
- Brasil → PT-BR
- Todos os outros → PT

## Modelo de negócio / Comissões
- **Comissão actual de arranque**: 3% por aula concluída
- **Target futuro**: 4-5% quando houver 4-10 escolas
- **Long-term**: 5-8% quando consolidado (10+ escolas)
- Sem custos fixos — só paga quem vende
- Comissão configurável por escola no painel super-admin (localStorage)
- Guardada em `localStorage` key: `surfbook_comm_rates`

## Fluxo de reserva (site público)
1. Cliente escolhe modalidade (Iniciante €35/p, Intermédio €35/p, Privada €65, Bodyboard €30/p)
2. Escolhe data no calendário
3. Escolhe horário (disponibilidade real do Supabase)
4. Preenche dados + equipamento por pessoa
5. Clica "Confirmar via WhatsApp" →
   - Abre WA com mensagem pré-preenchida
   - Guarda no Supabase
   - Envia email backup para ivocasimiro@gmail.com
   - Mostra ecrã de confirmação ✅ ou ❌ com erro

## Fluxo do admin da escola
- Login com password (hash guardado no Supabase, tabela `admin_users` ou localStorage)
- Ver reservas por dia / filtrar por estado
- Confirmar/cancelar/remarcar com envio WA automático ao cliente
- Nova marcação manual (com equipamento e verificação de disponibilidade)
- Calendário de ocupação por horário
- Análise histórica (Chart.js) por mês/ano

## Fluxo do super-admin (Ivo)
- Ver todas as escolas
- Ver todas as reservas de todas as escolas
- Ajustar comissão por escola
- Análise global (revenue, bookings, por escola, por nacionalidade)

## Roadmap / Funcionalidades futuras — Escolas de Surf
- [ ] Quando marcar "Concluído" → enviar WA com pedido de review (Google/TripAdvisor)
- [ ] Sistema de login real para admins (Supabase Auth) em vez de password simples
- [ ] Cada escola com URL próprio (ex: /arrifana, /nazare)
- [ ] Notificações push para o admin quando chega nova reserva
- [ ] Integração de pagamento online (Stripe)
- [ ] App móvel para o admin (PWA)
- [ ] Bloquear dias/horários indisponíveis no calendário
- [ ] Sistema de vouchers/descontos
- [ ] Emails automáticos de lembrança (D-1 antes da aula)

---

## Sistema 58 Surf Alugueres (Grupo Despomar)

### Ficheiro
`surf-school/rental-58surf.html` → `/alugueres` ou `/58surf`

### Lojas activas
```javascript
const STORES = [
  { id: '58surf-peniche',    name: '58 Peniche',    location: 'Peniche'           },
  { id: '58surf-ericeira',   name: '58 Ericeira',   location: 'Ericeira'          },
  { id: '58surf-matosinhos', name: '58 Matosinhos', location: 'Matosinhos'        },
  { id: '58surf-caparica',   name: '58 Caparica',   location: 'Costa da Caparica' },
  { id: '58surf-obidos',     name: '58 Óbidos',     location: 'Óbidos (em breve)' },
];
```
Para adicionar loja: acrescentar entrada ao array `STORES` em `rental-58surf.html`.

### Base de dados — Tabela `surf_rentals`
Colunas principais:
- `id` UUID
- `store_id` TEXT (ex: '58surf-peniche')
- `client_name`, `client_phone`, `client_email`, `client_id_doc` TEXT
- `items` JSONB — array `[{catalog_id, name, size, qty}]`
- `rental_start` TIMESTAMPTZ
- `rental_days` INTEGER (1, 2, 3 ou 7)
- `expected_return` TIMESTAMPTZ (rental_start + dias, às 18:00)
- `actual_return` TIMESTAMPTZ (preenchido na devolução)
- `status` TEXT: `active` | `returned` | `overdue`
- `notes` TEXT

RLS: política `allow_all` FOR ALL USING (true).

### Catálogo de items (CATALOG em rental-58surf.html)
Actualizar o array `CATALOG` conforme os tipos de aluguer reais das lojas.
Campos por item: `id`, `name`, `icon`, `sizes[]`.
Sem preços — sistema de tracking apenas (entrega e recepção).

### Fluxo de aluguer
1. Staff faz login (Supabase Auth) → selecciona loja
2. Novo Aluguer: dados cliente + material + duração (1/2/3/7 dias)
3. Sistema calcula `expected_return` = dia+N às 18:00
4. Cards activos mostram timer em tempo real
5. Se passa da `expected_return` → alerta automático (banner vermelho + tab "Em Atraso")
6. Devolução: 1 clique → marca `returned` ou `overdue` + regista hora real

### Dashboard analytics
- Gráfico alugueres últimos 30 dias
- Items mais alugados (ranking)
- Distribuição por duração
- Actividade por dia da semana

### Roadmap 58 Surf
- [ ] Adicionar logo oficial 58surf.com (substituir logo textual em `.login-brand`)
- [ ] Notificação WhatsApp ao cliente no início do aluguer
- [ ] Alerta WA/email ao staff quando aluguer entra em atraso
- [ ] Relatório diário por loja (email automático)
- [ ] Painel super-admin Despomar (ver todas as lojas em simultâneo)
- [ ] Configurar tipos de aluguer reais (catálogo actualizado pelo Ivo)

## Como adicionar uma escola nova
1. Em `admin.html` e `super-admin.html`, adicionar ao array `SCHOOLS`:
```javascript
{
  id: 'escola-nazare',
  name: 'Surf Nazaré',
  wa_number: '351XXXXXXXXX',
  meeting_point: 'Praia da Nazaré, junto ao salva-vidas',
  max_per_slot: 6,
  slots: ['08:00','10:30','14:00','16:30'],
  defaultCommission: 0.03,
}
```
2. O admin da escola filtra por `school_id = 'escola-nazare'`
3. O site público usa `school_id:'escola-teste'` — quando tiver múltiplas escolas, o URL/subdomínio determina qual escola

## Notas técnicas importantes
- `window.open(waUrl, '_blank')` DEVE ser chamado antes de qualquer `await` para não ser bloqueado pelo browser
- Supabase `anon` key NÃO deve ser a `sb_publishable_*` (tem restrições de domínio) — usar sempre a JWT legacy key
- `color-scheme: dark` no `:root` necessário para dropdowns nativos em dark mode
- Branch de produção: `main` (Cloudflare faz deploy automático)
- Após cada push, aguardar ~2 min e fazer Ctrl+Shift+R para ver alterações

---

## Sistema Depósitos (depositos.html)

### Ficheiro
`surf-school/depositos.html` → `/depositos`

Manual: `surf-school/manual-depositos.html` → `/manual-depositos`

### Arquitectura geral
Aplicação SPA single-file com Supabase Auth. Duas roles:
- **Loja** (`role != 'super_admin'`): vê apenas os seus próprios registos
- **Super-Admin** (`isSA=true`, `role='super_admin'`): vê todos os registos de todas as lojas

### Base de dados — Tabelas
**`dep_registos`** — registos de depósitos:
- `id` UUID, `store_id` TEXT, `loja` TEXT (nome display)
- `tipo` TEXT (MB Way, Multibanco, Numerário, etc.)
- `sessoes` JSONB — array `[{dataVendas, sessao, valor}]`
- `dataDeposito` DATE, `talao` TEXT (comprovativo/referência)
- `criado_em` TIMESTAMPTZ
- RLS: `allow_all` FOR ALL USING (true)

**`dep_config`** — configurações por loja:
- `store_id` TEXT (PK ou unique), `emp` TEXT, `email` TEXT
- `email_cc` TEXT, `email_cc2` TEXT, `nif` TEXT
- `cambio_dia` TEXT, `prosegur_day` TEXT, `lomis_day` TEXT
- `mes_inicio` TEXT, `lojas` JSONB (array nomes), `resps` JSONB
- SA tem `store_id='super'`
- RLS: `allow_all` FOR ALL USING (true)

### Auth
- Supabase Auth (`SB.auth.signInWithPassword`)
- `sbUser` = auth user object, `sbProfile` = dep_config row da loja
- `isSA` = `sbProfile.role === 'super_admin'`
- SA config tem `store_id='super'`

### Config save — REGRA CRÍTICA
**NÃO usar `{onConflict:'store_id'}` no upsert** — falha se `store_id` não tiver unique constraint.
Usar sempre SELECT → UPDATE/INSERT:
```javascript
const{data:ex}=await SB.from('dep_config').select('store_id').eq('store_id',sid).maybeSingle();
const{error}=ex
  ?await SB.from('dep_config').update(body).eq('store_id',sid)
  :await SB.from('dep_config').insert(body);
```

### Email — fluxo e regras

**Loja envia para contabilidade (Ivo/Despomar):**
- `To:` = `cfg.email` da loja (email contabilidade, campo "Email" nas Settings da loja)
- `CC:` = `cfg.emailCC` (gerente + outros, campo CC nas Settings) + `window._saDefaultCC` (supervisores Despomar)
- Corpo HTML preview + plain text para mailto
- Assunto: `Depósitos – [Loja] – [Mês] – até DD/MM/YYYY`

**SA envia alerta de depósitos em atraso (`_saAlertEmail`):**
- Função: `window._saAlertEmail(sid)` — chamada ao clicar Email na card da loja no painel SA
- `To:` = `cfg2b.email_cc` (gerente da loja) — fallback para `cfg2b.email` se não configurado
- `CC:` = `cfg2b.email` (contabilidade da loja) + `window._saDefaultCC` (supervisores Despomar)
- Assunto: `Depósitos em atraso - [Loja] - [Mês]`
- Corpo plain text com acentos, inclui apenas o que está em atraso:
  1. **Saltos de depósito** — registos mais antigos pendentes enquanto há mais recentes depositados (topo, em destaque)
  2. **Sessões por depositar** — records sem `dataDeposito`, listados por tipo com data+sessão
  3. **Dias sem registo** — dias sem qualquer sessão no sistema, filtrados por `_missCutoff` (respeita calendário Prosegur/Lomis/Câmbio)
  4. **Sem comprovativo** — depositos realizados sem talão registado
- `_missCutoff`: calculado igual ao painel SA — para lojas com schedule semanal, é o dia da última passagem da transportadora; sem schedule, hoje-2 dias
- Assunto dinâmico: inclui "Irregularidades" se houver problemas, "Verificado" se tudo OK
- Assinatura: `Gestão Financeira | Grupo Despomar` (sem nome pessoal)

**`window._saDefaultCC`** — CC automático global:
- Carregado do `dep_config.email_cc2` da row `store_id='super'` (SA config)
- Configurável nas Settings do SA (campo "CC automático — todas as lojas")
- Adicionado automaticamente a TODOS os emails enviados pelas lojas
- Default inicial: `ivo@despomar.com`

**Múltiplas contas SA:**
- Conta original: `dep_users` row com `role='super_admin'`
- Contas adicionais: `dep_config` rows com `store_id='sauser-<email>'`
- Login fallback: se não encontra em `dep_users`, procura em `dep_config` por email
- Criar via Settings SA → card "Super-Admins" → "+ Adicionar"
- Email de confirmação redireciona para `/depositos` (não `/surf`)

**Campos `dep_config` usados no email:**
- `email` = contabilidade da loja (To nos emails da loja; CC nos emails SA)
- `email_cc` = gerente da loja (CC nos emails da loja; To nos emails SA)
- `email_cc2` = CC adicional (usado pelo SA para guardar `_saDefaultCC`)
- `prosegur_day`, `lomis_day`, `cambio_dia` = dia da semana (0=Dom) da recolha — determina `_missCutoff`

**Assunto sempre inclui:** `Depósitos – [Loja] – [Mês] – até DD/MM/YYYY`

**`seExp('email')`**: Não existe `id="opt-email"` no HTML — usar null-guard:
```javascript
const _optEl=document.getElementById('opt-'+f);if(_optEl)_optEl.classList.add('sel');
```

**`expEmail()`**: Checks `ep-to`, `ep-sub`, `ep-body.dataset.body`. Body >3800 chars → copia para clipboard + abre mailto sem body.

### Estados de depósito (`calcEstado`)
- `ok` — verde — depositado dentro do prazo
- `warn` — amarelo — aviso (ex: perto do prazo)
- `err` — vermelho — em atraso
- `prog` — cinza — agendado/programado

### Mobile
- `overscroll-behavior:none` no html/body para evitar iOS bounce
- `-webkit-text-size-adjust:100%` para evitar rescaling
- `.bnav` é `position:fixed` — body tem `padding-top` correspondente
- Páginas usam `display:none/block` (não fixed) — scroll normal

### Variáveis globais chave
- `regs` — array de todos os registos (local + Supabase)
- `cfg` — objecto de configuração activo
- `isSA` — boolean super-admin
- `sbProfile` — dep_config row do utilizador logado
- `sbUser` — Supabase auth user
- `expFmt` — 'email' ou 'print'
- `exportCfg` — config da loja seleccionada (carregada async pelo SA; null = usar cfg próprio)

### Funções chave
- `updEmailPrev()` — async, gera preview do email, chama `seExp('email')`
- `seExp(f)` — alterna entre email/print; null-guard no `opt-${f}`
- `getFiltExp()` — filtra regs por loja+mês para export
- `sbSaveCfgSB()` — guarda cfg no Supabase (SELECT→UPDATE/INSERT)
- `scBtn()` — botão "Guardar Configurações" com feedback visual
- `calcEstado(r, rcfg)` — calcula estado do depósito
- `totalValor(r)` — soma valores de todas as sessões de um registo
- `getRefDate(r)` — data de referência do registo (primeira sessão)

### Manual (`manual-depositos.html`)
Capítulos: 1-Intro, 2-Login, 3-Novo Depósito, 4-Dashboard, 5-Lista, 6-Mapa, 7-Email, 8-Config, 9-Dicas, 10-SA
Cada capítulo deve ter mockups visuais ricos com dados reais de exemplo (ESS Guia, etc.)
Capítulos pendentes de completar: 3, 5, 6, 7, 10
