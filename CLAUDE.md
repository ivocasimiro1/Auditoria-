# Plataforma Despomar — Documentação do Projeto

## REGRAS CRÍTICAS PARA QUALQUER SESSÃO NOVA

**Este repo é o `ivocasimiro1/Auditoria-` — ferramentas internas do Grupo Despomar.**

Este repo já foi "catch-all" de vários produtos diferentes. Todos os que amadureceram
foram separados para repos próprios. **Antes de assumir que algo existe aqui, confirma
no código** — este ficheiro já esteve desactualizado em relação ao repo real mais do
que uma vez.

### O que NÃO fazer
- **Nunca criar `surf-school/_redirects`** — o único `_redirects` válido é o da raiz do repo
- **Nunca modificar o `_redirects` da raiz** sem adicionar as novas rotas no fim, mantendo todas as existentes
- **Nunca tocar** em ficheiros existentes ao criar uma ferramenta nova — só adicionar ficheiros novos
- **NÃO há ficheiros de depósitos aqui** — migrados para `ivocasimiro1/depositos-despomar`
- **NÃO há site de reservas de escolas de surf aqui** (o antigo `admin.html`, `super-admin.html`, `proposta.html`, `onboarding.html`, etc.) — migrado para `ivocasimiro1/surf-escola`
- **NÃO há sistema de alugueres 58 Surf aqui** (`rental-58surf.html`) — foi removido, tornou-se projecto à parte
- **NÃO há CromoSwap aqui** — existiu em `public/` (plataforma de troca de cromos Panini, nada a ver com Despomar), foi apagado por decisão do Ivo em Jul 2026 por não estar a ser usado

### Como adicionar uma ferramenta nova
1. Criar `surf-school/nome-ferramenta.html` (ficheiro novo)
2. Adicionar rota no **fim** do `_redirects` da raiz: `/rota /surf-school/nome-ferramenta.html 301`
3. Não tocar em mais nada

### Sistemas activos neste repo (não partir)
| URL | Ficheiro | Sistema |
|---|---|---|
| `/rotacao`, `/redistribuicao` | `surf-school/redistribuicao-stock.html` | Redistribuição de stock ✅ |
| `/devolve`, `/loja/:slug` | `surf-school/devolve.html` | Devolve — SaaS de gestão de aluguer multi-negócio ✅ — ver `surf-school/DEVOLVE_HANDOFF.md`; migração para `ivocasimiro1/Devolve` em curso |

### Sistemas noutros repos (NÃO estão aqui)
| URL / Sistema | Repo |
|---|---|
| `/depositos`, `/manual-depositos` | `ivocasimiro1/depositos-despomar` → `depositos-despomar.pages.dev` |
| Bot Telegram (ranking/status lojas) | `ivocasimiro1/depositos-despomar` → `functions/api/tg-webhook.js` |
| Site de reservas de escolas de surf (público + admin + super-admin) | `ivocasimiro1/surf-escola` |
| Devolve (versão em migração) | `ivocasimiro1/Devolve` — confirmar com o Ivo qual repo é a fonte de verdade antes de editar `surf-school/devolve.html` aqui |

---

## O que é isto
Ferramentas internas do Grupo Despomar, geridas por Ivo Casimiro (ivo@despomar.com / ivocasimiro@gmail.com).

## URLs de produção
**https://auditoria-25b.pages.dev**
- `/rotacao`, `/redistribuicao` → Ferramenta de redistribuição de stock
- `/devolve`, `/loja/:slug` → Devolve (gestão de aluguer/reservas)
- `/depositos`, `/manual-depositos`, `/manual` → redirecionam (301) para `depositos-despomar.pages.dev`

## Infraestrutura
- **Hosting**: Cloudflare Pages (deploy automático do branch `main`)
- **Build output directory**: por confirmar no dashboard Cloudflare Pages (Settings → Builds & deployments) — não está documentado em lado nenhum do repo, e é preciso saber isto antes de mexer em estrutura de pastas
- **Notificações**: WhatsApp (wa.me links)

## Ficheiros principais
```
surf-school/
  redistribuicao-stock.html  ← Redistribuição de stock entre lojas
  devolve.html                ← Devolve, versão em produção (Supabase próprio e dedicado)
  devolve-demo.html           ← Devolve, demo local (localStorage, sem backend)
  DEVOLVE_HANDOFF.md          ← Arquitectura completa + plano de migração do Devolve
  sql/                        ← Schemas SQL (depositos_setup, depositos_users_setup, devolve_setup)
  teste-login.html            ← Diagnóstico de login, sem rota própria (acesso por caminho directo)
_redirects                    ← Clean URLs para Cloudflare Pages
```

## Devolve
Ver `surf-school/DEVOLVE_HANDOFF.md` para arquitectura completa, schema Supabase
(projecto dedicado, `yclgwqiieejsyhdoojeb.supabase.co` — não partilha `auth.users`
nem tabelas com outras ferramentas), e o estado da migração para `ivocasimiro1/Devolve`.

## Notas técnicas importantes
- `window.open(waUrl, '_blank')` DEVE ser chamado antes de qualquer `await` para não ser bloqueado pelo browser
- Supabase `anon` key NÃO deve ser a `sb_publishable_*` (tem restrições de domínio) — usar sempre a JWT legacy key
- `color-scheme: dark` no `:root` necessário para dropdowns nativos em dark mode
- Branch de produção: `main` (Cloudflare faz deploy automático)
- Após cada push, aguardar ~2 min e fazer Ctrl+Shift+R para ver alterações
