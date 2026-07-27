# Odds Desajustadas

Ferramenta para detetar **arbitragem (surebets)** e **value bets** entre casas de apostas, usando
a [The Odds API](https://the-odds-api.com) como fonte de dados (agregador legítimo, sem scraping).

URL: `/odds`

## Como funciona

- `odds-app/index.html` — dashboard (filtros por desporto/região/thresholds, listas de oportunidades)
- `functions/api/odds-scan.js` — Cloudflare Pages Function que chama a The Odds API server-side
  (a chave nunca é exposta ao browser), calcula:
  - **Arbitragem**: soma de `1/melhor_odd` por resultado, entre casas diferentes; se < 1, há lucro garantido
  - **Value bet**: compara a odd de cada casa com a probabilidade "justa" de consenso
    (média das probabilidades sem margem de todas as casas do evento)
- `functions/api/odds-sports.js` — lista os desportos/ligas disponíveis para o dropdown

## Configuração necessária (Cloudflare Pages → Settings → Environment variables)

| Variável | Obrigatória | Descrição |
|---|---|---|
| `ODDS_API_KEY` | Sim | Chave de https://the-odds-api.com (free tier: 500 pedidos/mês) |
| `TELEGRAM_BOT_TOKEN` | Não | Token do bot Telegram, só necessário para alertas automáticos |
| `TELEGRAM_CHAT_ID` | Não | Chat ID para onde enviar os alertas |

## Alertas automáticos (opcional)

O endpoint `/api/odds-scan?notify=1&...` envia um alerta Telegram sempre que é chamado e existem
oportunidades acima dos thresholds. Este projeto **não tem cron interno** — para alertas periódicos,
aponta um serviço de cron externo gratuito (ex: [cron-job.org](https://cron-job.org)) a este URL,
com a frequência desejada, por exemplo:

```
https://auditoria-25b.pages.dev/api/odds-scan?sport=upcoming&regions=eu&minEdge=3&minArb=0.5&notify=1
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
