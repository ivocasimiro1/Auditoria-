# Odds Desajustadas

Ferramenta para detetar **arbitragem (surebets)** e **value bets** entre casas de apostas, usando
a [The Odds API](https://the-odds-api.com) como fonte de dados (agregador legítimo, sem scraping).

Este projeto é **autónomo** — vive na pasta `odds-app/` deste repositório mas deploya-se como um
**projeto Cloudflare Pages separado** do `auditoria` (que serve as restantes ferramentas Despomar),
para não arriscar interferir com essa configuração. Fica com o seu próprio domínio
`*.pages.dev` (ou domínio próprio, se quiseres).

## Como funciona

- `index.html` — dashboard (filtros por desporto/região/thresholds, listas de oportunidades)
- `functions/api/odds-scan.js` — Cloudflare Pages Function que chama a The Odds API server-side
  (a chave nunca é exposta ao browser), calcula:
  - **Arbitragem**: soma de `1/melhor_odd` por resultado, entre casas diferentes; se < 1, há lucro garantido
  - **Value bet**: compara a odd de cada casa com a probabilidade "justa" de consenso
    (média das probabilidades sem margem de todas as casas do evento)
- `functions/api/odds-sports.js` — lista os desportos/ligas disponíveis para o dropdown
- **Previsões por modelo estatístico**: calculadas dentro do próprio `odds-scan.js`, a partir de
  dados históricos gratuitos do [football-data.co.uk](https://www.football-data.co.uk) (força de
  ataque/defesa de cada equipa por golos marcados/sofridos + distribuição de Poisson) —
  independente de qualquer casa de apostas. Cobre só Premier League, La Liga, Serie A, Bundesliga,
  Ligue 1 e Primeira Liga; jogos de equipas cujo nome não bate certo com os dados históricos
  simplesmente não aparecem nesta lista. É uma versão simplificada do motor Dixon-Coles usado no
  projeto EdgeBet deste repositório (sem correção de baixa pontuação nem decaimento temporal), para
  caber numa função Cloudflare sem bibliotecas de otimização.
- **Value bets do modelo próprio**: em vez de comparar as casas entre si (só funciona quando as
  casas discordam umas das outras), compara a odd de cada casa contra a nossa própria previsão
  estatística. Encontra valor que o método de consenso nunca veria — quando todas as casas
  concordam entre si, mas o nosso modelo discorda de todas ao mesmo tempo. Só cobre as mesmas
  ligas das Previsões.
- **Histórico de acertos** (opcional, precisa de KV — ver abaixo): cada oportunidade detetada fica
  registada; depois do jogo terminar, `functions/api/verificar-resultados.js` confirma o resultado
  real via The Odds API e marca se a aposta teria sido ganha. `functions/api/historico.js` resume
  isto numa taxa de acerto real por tipo (arbitragem/value/value do modelo) — não é a "Confiança"
  estimada antes do jogo, é o que realmente aconteceu.

## Criar o projeto Cloudflare Pages (uma vez)

1. **dash.cloudflare.com** → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. Escolhe o repositório `ivocasimiro1/Auditoria-`
3. Nas definições de build:
   - **Root directory (diretório raiz)**: `odds-app`
   - **Build command**: deixa vazio
   - **Build output directory**: deixa vazio (ou `/`, equivale à raiz de `odds-app`)
4. **Save and Deploy**
5. Depois do primeiro deploy, em **Settings → Environment variables**, configura as variáveis abaixo

Isto cria um projeto novo (ex: `odds-desajustadas.pages.dev`), completamente separado do `auditoria` —
qualquer alteração aqui não afeta `/depositos`, `/rotacao`, `/devolve`, etc.

## Configuração necessária (Cloudflare Pages → Settings → Environment variables)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ODDS_API_KEY` | Sim | Chave de https://the-odds-api.com (free tier: 500 pedidos/mês) |
| `TELEGRAM_BOT_TOKEN` | Não | Token do bot Telegram, só necessário para alertas automáticos |
| `TELEGRAM_CHAT_ID` | Não | Chat ID para onde enviar os alertas |

## Histórico de acertos (opcional — precisa de KV)

Para ativar a secção "Histórico de acertos" (taxa de acerto real, confirmada depois dos jogos
terminarem), é preciso criar e ligar um namespace KV:

1. **dash.cloudflare.com** → **Workers & Pages** → **KV** (no menu lateral) → **Create a namespace**
2. Dá-lhe um nome (ex: `odds-historico`) → **Add**
3. Volta ao projeto `odds-app` → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**
4. **Variable name**: `ODDS_KV` (tem de ser exatamente este nome) → escolhe o namespace criado no passo 2 → **Save**
5. Faz um novo deploy (Retry deployment no último, ou um commit novo) para a binding ficar ativa

Depois disto:
- Cada scan regista automaticamente as oportunidades detetadas (sem custo extra de créditos da API)
- Aponta um cron externo (o mesmo mecanismo dos alertas Telegram) a
  `https://<o-teu-projeto>.pages.dev/api/verificar-resultados` — sugestão: 1x/dia — para confirmar
  os resultados reais dos jogos já terminados
- A secção "Histórico de acertos" no dashboard mostra a taxa de acerto real assim que houver jogos
  já confirmados (normalmente uns dias depois de ativares isto)

Sem esta configuração, tudo o resto da app funciona na mesma — esta secção fica simplesmente
escondida.

## Alertas automáticos (opcional)

O endpoint `/api/odds-scan?notify=1&...` envia um alerta Telegram sempre que é chamado e existem
oportunidades acima dos thresholds. Este projeto **não tem cron interno** — para alertas periódicos,
aponta um serviço de cron externo gratuito (ex: [cron-job.org](https://cron-job.org)) a este URL
(substitui pelo domínio real do teu projeto Cloudflare Pages), com a frequência desejada, por exemplo:

```
https://<o-teu-projeto>.pages.dev/api/odds-scan?sport=upcoming&regions=eu&minEdge=3&minArb=0.5&notify=1
```

**Limitação conhecida**: sem armazenamento de estado (KV), cada chamada com `notify=1` reenvia todas
as oportunidades ainda ativas — não há deduplicação de alertas já enviados. Para reduzir ruído, usa
um intervalo de cron mais espaçado (ex: 30-60 min) ou aumenta os thresholds.

## Aviso legal / responsabilidade

- Arbitragem e value betting são estratégias legais na generalidade das jurisdições, mas a maioria
  das casas de apostas **deteta e limita ou bane contas** que apostem desta forma de forma consistente.
- Esta ferramenta é puramente analítica — não coloca apostas automaticamente, apenas mostra
  oportunidades detetadas nos dados fornecidos pela The Odds API.
- Confirma sempre as odds diretamente na casa de apostas antes de apostar — odds mudam rapidamente
  e podem já não estar disponíveis quando a análise é apresentada.
- Aposta apenas dentro do que a lei do teu país permite, e com responsabilidade.

## Limites do plano gratuito

O free tier da The Odds API tem 500 pedidos/mês. Cada carregamento do dashboard = 1 pedido a
`/api/odds-scan` (+ 1 a `/api/odds-sports` no primeiro carregamento). Para uso mais intensivo ou
alertas frequentes, é necessário um plano pago.
