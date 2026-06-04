# Plataforma Despomar — Documentação do Projeto

## O que é isto
Dois sistemas distintos no mesmo repositório/Supabase, geridos por Ivo Casimiro (ivo@despomar.com / ivocasimiro@gmail.com):

1. **SaaS Escolas de Surf** — Multi-tenant para escolas de surf (reservas de aulas)
2. **58 Surf Alugueres** — Sistema de gestão de alugueres de pranchas e fatos para a cadeia 58 Surf (Grupo Despomar)

## URLs de produção
**https://auditoria-25b.pages.dev**
- `/surf` ou `/reservar` → Site de reservas público (aulas de surf)
- `/admin` → Painel do dono da escola de surf
- `/super-admin` → Painel do Ivo (super-admin escolas)
- `/proposta` → Proposta comercial para atrair escolas
- `/alugueres` ou `/58surf` → Painel de gestão de alugueres 58 Surf

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
