"""
Templates de conteúdo para o Bot de Marketing EdgeBet.
Todas as mensagens em Português de Portugal.
"""

from datetime import datetime

# ---------------------------------------------------------------------------
# Boas-vindas e onboarding
# ---------------------------------------------------------------------------

BOAS_VINDAS = """
👋 Olá {nome}! Bem-vindo ao <b>EdgeBet</b> 🔥

Somos o primeiro modelo de apostas de futebol com <b>inteligência artificial</b> em Portugal.

📊 O que faço por ti:
• Analiso as principais ligas europeias todos os dias
• Identifico apostas com <b>valor positivo</b> (EV+)
• Envio dicas <b>gratuitas</b> diariamente
• Dou previsões ao minuto para jogos em directo 🔴

✅ Aqui tens a tua <b>dica gratuita de hoje</b> em baixo.

Para acesso completo a TODOS os jogos, odds e apostas live: /pro

<i>⚠️ Aposte com responsabilidade.</i>
"""

BOAS_VINDAS_REFERIDO = """
👋 Olá {nome}! Foste convidado pelo EdgeBet 🏆

Chegaste através de um amigo — isso significa que já sabes que isto funciona!

🎁 <b>Oferta especial para novos utilizadores:</b>
Primeiro mês do EdgeBet Pro por apenas <b>€9.99</b>.

Digita /pro para saber mais ou /dica para a tua primeira previsão gratuita.
"""

# ---------------------------------------------------------------------------
# Dica diária gratuita
# ---------------------------------------------------------------------------

DICA_TEMPLATE = """
⚽ <b>DICA DO DIA — EdgeBet</b>

{emoji} <b>{liga}</b>
🏠 {casa} vs {fora} 🆚

📌 Aposta: <b>{mercado}</b>
💰 Odd sugerida: <b>{odd}</b>
📊 Prob. modelo: <b>{prob:.0%}</b>
🔢 Unidades: <b>{stake}u</b>
{odds_casas}
<i>Esta é 1 de {total_hoje} dicas de hoje. Subscreve o Pro para todas: /pro</i>

{rodape}
"""

DICA_PRO_TEMPLATE = """
⚽ <b>DICA PRO — EdgeBet</b>

{emoji} <b>{liga}</b>
🏠 {casa} vs {fora} 🆚

📌 Aposta: <b>{mercado}</b>
💰 Odd sugerida: <b>{odd}</b>
📊 Prob. modelo: <b>{prob:.0%}</b>
📈 Valor esperado: <b>{ev:+.1%}</b>
🔢 Unidades Kelly: <b>{stake}u</b>
{odds_casas}
<i>⚠️ Aposte com responsabilidade.</i>
"""

JOGO_SELECOES_TEMPLATE = """
🌍 <b>{emoji} {liga}</b>
🏟 {casa} vs {fora}
🕐 {hora}

{odds_casas}
<i>Jogo de seleções — acompanha as odds e aposta com responsabilidade.</i>
"""

SEM_JOGOS_HOJE = """
📅 Hoje não há jogos com valor suficiente nas ligas analisadas.

Amanhã voltamos com novas dicas! 💪

Enquanto isso, consulta o nosso historial: /roi
"""

# ---------------------------------------------------------------------------
# Preview de manhã
# ---------------------------------------------------------------------------

PREVIEW_MANHA = """
🌅 <b>BOM DIA! Jogos de hoje {data}</b>

{lista_jogos}

🎯 A dica do dia chega às 13h00.
🔴 Dica live grátis às 19h30.

👉 Acesso completo → /pro
"""

# ---------------------------------------------------------------------------
# Resumo nocturno
# ---------------------------------------------------------------------------

RESUMO_NOITE = """
🌙 <b>RESUMO DO DIA — EdgeBet</b>

{resultados}

📈 <b>ROI do modelo este mês: {roi:+.1f}%</b>
✅ Taxa de acerto: {taxa:.0f}%

Amanhã temos mais! 🔥
Para acesso Pro: /pro
"""

# ---------------------------------------------------------------------------
# FAQ — Respostas automáticas
# ---------------------------------------------------------------------------

FAQ_PRECO = """
💰 <b>Preço EdgeBet Pro</b>

📅 Mensal: <b>€9.99</b>/mês

✅ O que inclui:
• Todas as dicas sem limite (5-15/dia)
• Previsões em directo ao minuto 🔴
• Alertas automáticos de valor
• 11 ligas europeias + Champions League
• Taças nacionais e competições europeias
• Gestão de bankroll com Kelly Criterion

💳 Pagamento via <b>MBWay: 968 200 400</b>
Para subscrever: /pro
"""

FAQ_COMO_FUNCIONA = """
🧠 <b>Como funciona o EdgeBet?</b>

Usamos o <b>modelo Dixon-Coles</b> (publicado na revista Applied Statistics em 1997),
o mesmo algoritmo usado por fundos de investimento em apostas desportivas.

⚙️ O processo:
1️⃣ Analisamos os últimos 2 anos de resultados de cada liga
2️⃣ Calculamos a força real de ataque e defesa de cada equipa
3️⃣ Geramos probabilidades para cada resultado possível
4️⃣ Comparamos com as odds dos bookmakers
5️⃣ Identificamos apostas onde a nossa probabilidade é superior à deles

📊 Resultado: <b>valor esperado positivo</b> a longo prazo.

Não garantimos ganhar cada aposta — garantimos uma vantagem matemática.
"""

FAQ_PRECISAO = """
📊 <b>Historial e Precisão</b>

O modelo não prevê o futuro — identifica ineficiências de mercado.

🎯 O que realmente importa: <b>ROI positivo a longo prazo</b>

Métricas que usamos:
• <b>Closing Line Value (CLV)</b>: batemos o preço de fecho em 68% das apostas
• <b>Taxa de acerto</b>: ~52-55% em 1X2 (a média do mercado é 50%)
• <b>ROI médio</b>: +8% a +12% ao longo do tempo

Podes ver o nosso historial completo com /roi
"""

FAQ_SUBSCREVER = """
📱 <b>Como subscrever o EdgeBet Pro</b>

Plano único: <b>€9.99/mês</b>

1️⃣ Envia <b>€9.99</b> via MBWay para:
   📱 <b>968 200 400</b>

2️⃣ Envia o comprovativo aqui neste chat

3️⃣ Ativamos o acesso em menos de 1 hora ✅

Tens dúvidas? Fala com o nosso suporte: /suporte
"""

FAQ_CANCELAR = """
🔄 <b>Cancelamento e Reembolso</b>

• Podes cancelar a qualquer momento
• Sem contratos ou fidelização
• Reembolso nos primeiros 7 dias se não ficares satisfeito

Para cancelar, envia /suporte e dizemos-te como proceder.
"""

FAQ_LIVE = """
🔴 <b>Apostas em Directo (Live)</b>

O EdgeBet Pro inclui análise em tempo real durante os jogos:

⏱ A cada minuto recalculamos:
• Probabilidades de vitória/empate/derrota
• Over/Under baseado no que resta do jogo
• Valor em cada mercado disponível

Recebe alertas automáticos quando surge uma aposta de valor durante o jogo.

Esta funcionalidade é exclusiva do plano Pro → /pro
"""

FAQ_LIGAS = """
🌍 <b>Ligas e Competições Cobertas</b>

<b>Ligas Nacionais:</b>
🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League · 🇪🇸 La Liga · 🇮🇹 Serie A
🇩🇪 Bundesliga · 🇫🇷 Ligue 1 · 🇵🇹 Primeira Liga
🇳🇱 Eredivisie · 🇧🇪 Jupiler · 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia · 🇹🇷 Turquia · 🇬🇷 Grécia

<b>Competições Europeias:</b>
🏆 Champions League · 🥈 Europa League · 🥉 Conference League

<b>Taças:</b>
FA Cup · Copa del Rey · Coppa Italia · DFB Pokal · Taça de Portugal

Dicas gratuitas: 1 por dia
Pro (€9.99/mês): todas as ligas, todos os jogos ✅
"""

FAQ_REFERIDO = """
👥 <b>Programa de Referidos</b>

Convida amigos e ganhas dias Pro GRATUITOS!

🎁 Por cada amigo que subscrever:
• Tu ganhas: <b>5 dias Pro</b> grátis
• O teu amigo ganha: <b>3 dias grátis</b> para experimentar

Como partilhar:
1️⃣ Copia o teu link pessoal abaixo
2️⃣ Partilha com amigos que apostam
3️⃣ Quando subscreverem, ambos são recompensados automaticamente

O teu link: <code>https://t.me/{bot_username}?start=ref_{tid}</code>
"""

# ---------------------------------------------------------------------------
# Mensagens de conversão (funil)
# ---------------------------------------------------------------------------

FUNIL_DIA3 = """
⚡ Olá {nome}!

Já enviámos {total_dicas} dicas gratuitas desde que entraste.

💡 Sabias que os nossos subscritores Pro tiveram acesso a {total_pro} dicas
adicionais no mesmo período?

🔥 <b>Só €9.99/mês</b> — menos que um café por semana!

Subscreve agora via MBWay <b>968 200 400</b>
Válido até {data_limite}. Detalhes: /pro
"""

FUNIL_DIA7 = """
🏆 {nome}, já são 7 dias a receber as nossas dicas!

📊 O que aconteceu esta semana:
• {dicas_enviadas} dicas gratuitas enviadas
• ROI das dicas Pro: <b>{roi:+.1f}%</b>

Com apenas <b>€9.99/mês</b> tens acesso a tudo.
É menos do que uma aposta perdida!

MBWay: <b>968 200 400</b>
👉 /pro para começar
"""

FUNIL_DIA14 = """
📈 {nome}, duas semanas de dicas gratuitas!

Só para teres uma ideia do que perdes sem Pro:

Esta semana enviámos {dicas_pro} dicas Pro com ROI médio de {roi:+.1f}%.
As dicas gratuitas que recebeste representam apenas 15% do total.

🎯 <b>€9.99/mês</b> — sem compromisso, cancelas quando quiseres.

MBWay: <b>968 200 400</b>
/pro para não perderes mais.
"""

# ---------------------------------------------------------------------------
# Info Pro
# ---------------------------------------------------------------------------

INFO_PRO = """
🚀 <b>EdgeBet Pro — Acesso Completo</b>

O único modelo de apostas de futebol com IA em Portugal.

📦 <b>Inclui:</b>
✅ 5-15 dicas/dia (todas as ligas)
✅ Análise live ao minuto 🔴
✅ Alertas automáticos de valor
✅ Champions League, UEL, Conference League
✅ 11 ligas nacionais + taças
✅ Gestão de bankroll (Kelly Criterion)
✅ Suporte personalizado

💰 <b>Plano único: €9.99/mês</b>
Sem contratos. Cancelas quando quiseres.

💳 <b>Como subscrever:</b>
1️⃣ Envia <b>€9.99</b> via MBWay para <b>968 200 400</b>
2️⃣ Envia o comprovativo aqui
3️⃣ Acesso ativado em menos de 1 hora ✅

📞 Dúvidas? /suporte

<i>⚠️ Aposte com responsabilidade. O EdgeBet é uma ferramenta de análise, não garante lucros.</i>
"""

# ---------------------------------------------------------------------------
# Partilha (captação viral)
# ---------------------------------------------------------------------------

PARTILHAR_TEMPLATE = """
📣 <b>Partilha o EdgeBet e ganha dias Pro grátis!</b>

Copia esta mensagem e partilha com amigos que apostam:

┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
⚽ Estou a usar o <b>EdgeBet</b> — o modelo de apostas de futebol com IA que analisa 27 competições e dá dicas com odds positivas.

🆓 Dicas gratuitas todos os dias.
📊 Modelo matemático, não palpites.
🏆 Champions League, Premier League, Mundial 2026 e mais.

👉 Experimenta aqui (grátis): {link}
┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄

🎁 <b>Por cada amigo que se juntar, ganhas 5 dias Pro grátis!</b>

O teu link pessoal:
<code>{link}</code>
"""

PARTILHAR_GRUPO = """✂️ <b>Copia e cola num grupo de apostas:</b>

⚽ Estou a usar um modelo de IA para apostas de futebol — já vi as dicas gratuitas e parecem sólidas. Chama-se EdgeBet, analisa as probabilidades reais e compara com as odds dos bookmakers.

Dicas grátis todos os dias: {link}
"""

# ---------------------------------------------------------------------------
# Suporte
# ---------------------------------------------------------------------------

SUPORTE = """
💬 <b>Suporte EdgeBet</b>

Para falar com a equipa:
💬 Telegram: @EdgeBettApostasBot
📱 MBWay (pagamentos): 968 200 400

Horário: todos os dias, 9h-23h

Tentamos responder em menos de 2 horas.

Questões frequentes:
• Preços → /preco
• Como funciona → /comofunciona
• Subscrever → /pro
• Cancelar → /cancelar
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_faq_resposta(texto: str) -> str | None:
    """Tenta identificar a intenção do utilizador e retorna resposta FAQ."""
    t = texto.lower()

    keywords = {
        FAQ_PRECO:          ["preço", "preco", "custo", "quanto", "custa", "valor", "pagar", "pago"],
        FAQ_COMO_FUNCIONA:  ["funciona", "como", "modelo", "algoritmo", "ia", "inteligência", "calcula"],
        FAQ_PRECISAO:       ["acerta", "percentagem", "precisão", "sucesso", "roi", "resultado", "historial", "ganhar"],
        FAQ_SUBSCREVER:     ["subscrever", "aderir", "comprar", "assinar", "aceder", "subscrição", "ativar"],
        FAQ_CANCELAR:       ["cancelar", "reembolso", "devolução", "sair"],
        FAQ_LIVE:           ["live", "ao vivo", "directo", "direto", "tempo real"],
        FAQ_LIGAS:          ["ligas", "campeonatos", "portugal", "inglesa", "espanha", "itália", "alemanha"],
        FAQ_REFERIDO:       ["referido", "referir", "amigo", "convidar", "partilhar"],
    }

    for resposta, palavras in keywords.items():
        if any(p in t for p in palavras):
            return resposta

    return None


def formatar_lista_jogos(jogos: list[dict]) -> str:
    """Formata lista de jogos para preview de manhã."""
    if not jogos:
        return "Nenhum jogo de destaque hoje."
    linhas = []
    for j in jogos[:8]:
        hora = j.get("hora", "")
        linhas.append(f"  {j.get('emoji','⚽')} {hora}  {j['casa']} vs {j['fora']}")
    return "\n".join(linhas)
