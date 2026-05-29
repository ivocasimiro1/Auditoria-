#!/usr/bin/env python3
"""
EdgeBet — Bot Telegram para Apostas de Futebol
===============================================
Instala o token do BotFather na variável TELEGRAM_TOKEN (ficheiro .env ou ambiente).

Comandos:
  /start          — boas-vindas
  /hoje           — melhores apostas do dia
  /live           — jogos em curso agora
  /prever         — prever jogo específico (ex: /prever Arsenal Chelsea)
  /ligas          — ligas disponíveis
  /ajuda          — lista de comandos
"""

import os
import sys
import asyncio
import logging
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

TOKEN    = os.environ.get("TELEGRAM_TOKEN", "")
ADMIN_IDS = [int(x) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip()]

try:
    from telegram import Update, BotCommand
    from telegram.ext import (
        Application, CommandHandler, ContextTypes,
        MessageHandler, filters,
    )
    from telegram.constants import ParseMode
except ImportError:
    print("A instalar python-telegram-bot...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           "python-telegram-bot>=20.0", "python-dotenv"],
                          capture_output=True)
    from telegram import Update, BotCommand
    from telegram.ext import (
        Application, CommandHandler, ContextTypes,
        MessageHandler, filters,
    )
    from telegram.constants import ParseMode

from colorama import init as colorama_init
colorama_init(autoreset=True)

from motor import treinar_todos, analisar_dia
from modelo.dixon_coles import DixonColesModel
from modelo.value_betting import analisar_mercados
from modelo.ligas import LIGAS, normalizar_equipa
from modelo.live import predict_com_fallback
from modelo.odds_api import fetch_odds_jogo, formatar_odds_bookmakers
from database import (
    registar_utilizador, tem_subscricao_ativa, info_subscricao,
    ativar_subscricao, total_utilizadores, total_subscricoes,
    todos_utilizadores_ativos, bloquear_utilizador, registar_broadcast,
)
from telegram.error import Forbidden, BadRequest

logging.basicConfig(level=logging.WARNING)

# ---------------------------------------------------------------------------
# Estado global (carregado uma vez ao arrancar)
# ---------------------------------------------------------------------------
MODELOS: dict = {}


# ---------------------------------------------------------------------------
# Formatação Telegram (Markdown V2 → usamos HTML para simplicidade)
# ---------------------------------------------------------------------------

def _barra(p: float, n: int = 12) -> str:
    filled = round(p * n)
    return "▓" * filled + "░" * (n - filled)


def _estado_emoji(estado: str) -> str:
    return {"pre": "🕐", "in": "🔴 LIVE", "post": "✅"}.get(estado, "")


def formatar_previsao(r: dict, bankroll: float = 1000.0) -> str:
    p   = r["previsao"]

    estado  = r["estado"]
    minuto  = r["minuto"]
    gc, gf  = r["golos_casa"], r["golos_fora"]

    header = f"{r['emoji']} <b>{r['liga']}</b>\n"
    if estado == "in":
        header += f"🔴 <b>LIVE {minuto}'</b>  {r['casa_espn']} <b>{gc}–{gf}</b> {r['fora_espn']}\n"
    else:
        hora = r["hora_utc"]
        hora_str = hora.strftime("%H:%M UTC") if hora else ""
        header += f"🕐 {hora_str}  {r['casa_espn']} vs {r['fora_espn']}\n"

    # Jogos de seleções: sem modelo Dixon-Coles, só info + odds
    if p is None:
        odds_bk = fetch_odds_jogo(r.get("fd_code", ""), r.get("casa_espn", ""), r.get("fora_espn", ""))
        odds_txt = "\n" + formatar_odds_bookmakers(odds_bk) + "\n" if odds_bk else "\n<i>Odds não disponíveis de momento.</i>\n"
        return header + odds_txt + "\n<i>⚽ Jogo de seleções — análise por modelo não disponível.</i>"

    vc  = p["vitoria_casa"]
    emp = p["empate"]
    vf  = p["vitoria_fora"]

    linhas = (
        f"\n<b>Resultado Final</b>\n"
        f"🏠 Vitória Casa  <code>{vc:>5.1%}</code>  {_barra(vc)}\n"
        f"➖ Empate        <code>{emp:>5.1%}</code>  {_barra(emp)}\n"
        f"✈️ Vitória Fora  <code>{vf:>5.1%}</code>  {_barra(vf)}\n"
        f"\n<b>Mercados</b>\n"
        f"⚽ Over 2.5      <code>{p['over_25']:>5.1%}</code>\n"
        f"🔒 Under 2.5     <code>{p['under_25']:>5.1%}</code>\n"
    )

    eg = f"\n📊 Golos esperados: <b>{p['golos_esp_casa']:.2f} – {p['golos_esp_fora']:.2f}</b>\n"

    # Odds das casas de apostas
    odds_bk = fetch_odds_jogo(r.get("fd_code", ""), r.get("casa_espn", ""), r.get("fora_espn", ""))
    odds_txt = "\n" + formatar_odds_bookmakers(odds_bk) + "\n" if odds_bk else ""

    apostas_txt = ""
    if r["apostas"]:
        apostas_txt = "\n🎯 <b>APOSTAS DE VALOR</b>\n"
        for a in r["apostas"]:
            stars = "⭐⭐⭐" if a.classificacao == "Alta" else ("⭐⭐" if a.classificacao == "Media" else "⭐")
            stake = bankroll * a.kelly_fraction
            apostas_txt += (
                f"\n{stars} <b>{a.mercado}</b>\n"
                f"   Odd <b>{a.odd:.2f}</b> · EV <b>+{a.valor_esperado:.1%}</b>\n"
                f"   Stake: <b>€{stake:.0f}</b> de €{bankroll:.0f}\n"
            )
    elif r["estado"] != "post":
        apostas_txt = "\n<i>ℹ️ Odds ESPN não disponíveis — ver tabela acima.</i>\n"

    fallback_txt = "\n⚠️ <i>Equipa não no histórico — previsão com média da liga.</i>" if r["fallback"] else ""

    return header + linhas + eg + odds_txt + apostas_txt + fallback_txt


def formatar_resumo(resultados: list[dict]) -> str:
    """Mensagem resumida com os jogos — uma linha por jogo."""
    if not resultados:
        return "Nenhum jogo encontrado para hoje. ⚽"

    linhas = ["📅 <b>Jogos de Hoje</b>\n"]
    liga_atual = ""
    for r in resultados:
        if r["liga"] != liga_atual:
            liga_atual = r["liga"]
            linhas.append(f"\n{r['emoji']} <b>{r['liga']}</b>")

        p   = r["previsao"]
        gc, gf = r["golos_casa"], r["golos_fora"]

        if r["estado"] == "in":
            placar = f"🔴 {gc}–{gf} ({r['minuto']}')"
        else:
            hora = r["hora_utc"]
            placar = hora.strftime("%H:%M") if hora else ""

        # For selecoes, p is None
        if p:
            vc_pct  = f"{p['vitoria_casa']:.0%}"
            emp_pct = f"{p['empate']:.0%}"
            vf_pct  = f"{p['vitoria_fora']:.0%}"
            prob_str = f"\n  <code>{vc_pct} | {emp_pct} | {vf_pct}</code>"
        else:
            prob_str = ""

        val = " 🎯" if r["apostas"] else ""
        linhas.append(
            f"  {placar}  {r['casa_espn']} vs {r['fora_espn']}{val}{prob_str}"
        )

    linhas.append("\n\n💡 Usa /prever &lt;casa&gt; &lt;fora&gt; para ver detalhes de um jogo.")
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _e_admin(tid: int) -> bool:
    return tid in ADMIN_IDS


async def _verificar_acesso(update: Update) -> bool:
    """Verifica se o utilizador tem subscrição activa. Envia mensagem se não tiver."""
    tid = update.effective_user.id
    if _e_admin(tid):
        return True
    if tem_subscricao_ativa(tid):
        return True
    await update.message.reply_html(
        "🔒 <b>Acesso restrito</b>\n\n"
        "Este bot é exclusivo para subscritores EdgeBet Pro.\n\n"
        "👉 Dicas gratuitas e upgrade: @EdgeBettApostasBot\n"
        "👉 /pro — ver planos e preços"
    )
    return False


async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    registar_utilizador(user.id, user.username, user.first_name, bot="pro")
    sub  = info_subscricao(user.id)
    acesso = tem_subscricao_ativa(user.id) or _e_admin(user.id)

    if acesso:
        if sub:
            from datetime import date
            dias_rest = (datetime.fromisoformat(sub["expira"]) - datetime.utcnow()).days
            expira_str = f"\n📅 Válido até: <b>{sub['expira'][:10]}</b> ({dias_rest} dias restantes)"
        else:
            expira_str = ""
        msg = (
            f"⚽ <b>EdgeBet Pro — Bem-vindo, {user.first_name}!</b>"
            f"{expira_str}\n\n"
            "<b>Comandos:</b>\n"
            "/hoje — melhores apostas do dia\n"
            "/live — jogos em directo agora\n"
            "/prever &lt;casa&gt; &lt;fora&gt; — prever jogo específico\n"
            "/ligas — ligas disponíveis\n"
            "/ajuda — mais informação\n\n"
            "<i>Aposte sempre de forma responsável.</i>"
        )
    else:
        msg = (
            "🔒 <b>EdgeBet Pro</b>\n\n"
            "Este é o bot exclusivo para subscritores.\n\n"
            "👉 Para acesso gratuito e upgrade: @EdgeBetMarketingBot\n"
            "👉 Para subscrever directamente: /pro"
        )
    await update.message.reply_html(msg)


async def cmd_ligas(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    linhas = ["🌍 <b>Ligas Disponíveis</b>\n"]
    for fd_code, info in LIGAS.items():
        modelo = MODELOS.get(fd_code)
        if modelo:
            linhas.append(f"{info['emoji']} <b>{info['nome']}</b> — {info['pais']} ({len(modelo.teams_)} equipas)")
        else:
            linhas.append(f"{info['emoji']} {info['nome']} — <i>dados insuficientes</i>")
    await update.message.reply_html("\n".join(linhas))


async def cmd_ajuda(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = (
        "📖 <b>Como usar o EdgeBet</b>\n\n"
        "<b>/hoje</b>\n"
        "Lista todos os jogos do dia com probabilidades e apostas de valor.\n\n"
        "<b>/live</b>\n"
        "Mostra apenas os jogos em curso neste momento com previsões ao minuto.\n\n"
        "<b>/prever Arsenal Chelsea</b>\n"
        "Previsão detalhada de um jogo específico.\n\n"
        "<b>Apostas de Valor 🎯</b>\n"
        "Marcadas quando a probabilidade do modelo supera a probabilidade implícita na odd. "
        "Quanto maior o EV, melhor.\n\n"
        "<b>Critério de Kelly ¼</b>\n"
        "Stake calculado para maximizar crescimento do bankroll a longo prazo.\n\n"
        "<i>Dados: football-data.co.uk + ESPN API</i>"
    )
    await update.message.reply_html(msg)


async def cmd_pro(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    from conteudo import INFO_PRO
    await update.message.reply_html(INFO_PRO, disable_web_page_preview=True)


async def cmd_admin_pro(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id
    if not _e_admin(tid):
        return
    args = ctx.args or []
    if not args:
        su = total_utilizadores()
        ss = total_subscricoes()
        await update.message.reply_html(
            f"📊 <b>Admin Pro</b>\n"
            f"👥 Utilizadores: {su['total']} ({su['hoje']} hoje)\n"
            f"💳 Subscrições: {ss['ativas']} · Receita: €{ss['receita_total']:.2f}\n\n"
            f"/admin ativar [id] [plano]"
        )
        return
    if args[0] == "ativar" and len(args) >= 2:
        try:
            target = int(args[1])
        except ValueError:
            await update.message.reply_html("ID inválido.")
            return
        expira = ativar_subscricao(target, "mensal", valor=9.99, ref="admin_pro")
        await update.message.reply_html(
            f"✅ Pro mensal (€9.99) ativado para {target}.\n"
            f"📅 Expira em: <b>{expira[:10]}</b>"
        )


async def cmd_hoje(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not await _verificar_acesso(update):
        return
    await update.message.reply_html("⏳ A analisar jogos de hoje...")
    resultados = analisar_dia(MODELOS)
    msg = formatar_resumo(resultados)
    await update.message.reply_html(msg)


async def cmd_live(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not await _verificar_acesso(update):
        return
    await update.message.reply_html("🔴 A procurar jogos em directo...")
    resultados = analisar_dia(MODELOS)
    live = [r for r in resultados if r["estado"] == "in"]
    if not live:
        await update.message.reply_html("Nenhum jogo em directo de momento.")
        return
    for r in live:
        await update.message.reply_html(formatar_previsao(r), disable_web_page_preview=True)


async def cmd_prever(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not await _verificar_acesso(update):
        return
    args = ctx.args
    if len(args) < 2:
        await update.message.reply_html(
            "❌ Uso: /prever &lt;casa&gt; &lt;fora&gt;\n"
            "Ex: <code>/prever Arsenal Chelsea</code>"
        )
        return

    # Tenta encontrar a divisão do nome (último arg é fora, o resto é casa)
    # Ou heurística: primeira palavra maiúscula até "vs" / dois termos comuns
    texto = " ".join(args)
    partes = texto.split(" vs ", 1) if " vs " in texto.lower() else None
    if partes and len(partes) == 2:
        casa_input, fora_input = partes[0].strip(), partes[1].strip()
    elif len(args) == 2:
        casa_input, fora_input = args[0], args[1]
    else:
        # Divide ao meio
        meio = len(args) // 2
        casa_input = " ".join(args[:meio])
        fora_input = " ".join(args[meio:])

    # Tentar encontrar o modelo correcto e normalizar
    encontrado = False
    for fd_code, modelo in MODELOS.items():
        if modelo is None:
            continue
        casa = normalizar_equipa(casa_input, fd_code, modelo.teams_)
        fora = normalizar_equipa(fora_input, fd_code, modelo.teams_)
        if casa and fora:
            try:
                prev, fallback = predict_com_fallback(modelo, casa, fora)
                resultado = {
                    "fd_code": fd_code,
                    "liga": LIGAS[fd_code]["nome"],
                    "emoji": LIGAS[fd_code]["emoji"],
                    "casa": casa, "fora": fora,
                    "casa_espn": casa_input, "fora_espn": fora_input,
                    "estado": "pre", "minuto": 0,
                    "golos_casa": 0, "golos_fora": 0,
                    "hora_utc": None,
                    "previsao": prev,
                    "apostas": [],
                    "fallback": fallback,
                }
                await update.message.reply_html(formatar_previsao(resultado))
                encontrado = True
                break
            except Exception as e:
                continue

    if not encontrado:
        await update.message.reply_html(
            f"❌ Não encontrei <b>{casa_input}</b> ou <b>{fora_input}</b> nos dados.\n"
            "Verifica o nome da equipa e tenta novamente."
        )


async def msg_desconhecida(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(
        "Não percebi. Usa /ajuda para ver os comandos disponíveis."
    )


# ---------------------------------------------------------------------------
# Arranque
# ---------------------------------------------------------------------------

def main():
    global MODELOS

    if not TOKEN:
        print(
            "\n❌  Token Telegram não configurado!\n"
            "   Cria um bot em @BotFather e define a variável TELEGRAM_TOKEN.\n"
            "   Exemplo:\n"
            "     export TELEGRAM_TOKEN=123456:ABC-DEF...\n"
            "     python bot.py\n"
            "   Ou cria um ficheiro .env com:  TELEGRAM_TOKEN=...\n"
        )
        sys.exit(1)

    print("\n⚽  EdgeBet — Bot Telegram")
    print("=" * 40)
    print("🔄  A treinar modelos com dados online...")
    MODELOS = treinar_todos(verbose=True)
    modelos_ok = sum(1 for m in MODELOS.values() if m is not None)
    print(f"\n✅  {modelos_ok} ligas prontas.\n")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start",  cmd_start))
    app.add_handler(CommandHandler("ligas",  cmd_ligas))
    app.add_handler(CommandHandler("ajuda",  cmd_ajuda))
    app.add_handler(CommandHandler("hoje",   cmd_hoje))
    app.add_handler(CommandHandler("live",   cmd_live))
    app.add_handler(CommandHandler("prever", cmd_prever))
    app.add_handler(CommandHandler("pro",    cmd_pro))
    app.add_handler(CommandHandler("admin",  cmd_admin_pro))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, msg_desconhecida))

    print("🤖  Bot a correr. Prima Ctrl+C para parar.\n")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
