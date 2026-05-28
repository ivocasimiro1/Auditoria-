#!/usr/bin/env python3
"""
EdgeBet Marketing Bot — Captação de Clientes
=============================================
Bot Telegram gratuito para captação e nutrição de leads.

Comandos públicos:
  /start          — boas-vindas + dica grátis
  /dica           — dica gratuita do dia
  /hoje           — prévia dos jogos de hoje
  /roi            — historial verificável do modelo
  /pro            — info e preços da subscrição Pro
  /preco          — tabela de preços
  /comofunciona   — explicação do modelo
  /referido       — programa de referidos
  /suporte        — contacto

Comandos admin (/admin_id configurado no .env):
  /admin stats        — estatísticas gerais
  /admin broadcast    — enviar mensagem a todos
  /admin dica [txt]   — registar resultado de dica
  /admin ativar [id]  — dar acesso Pro a utilizador
"""

import asyncio
import logging
import os
import sys
from datetime import datetime, time, timezone

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

MARKETING_TOKEN = os.environ.get("MARKETING_TOKEN", "")
ADMIN_IDS = [int(x) for x in os.environ.get("ADMIN_IDS", "").split(",") if x.strip()]

try:
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import (
        Application, CommandHandler, MessageHandler,
        ContextTypes, CallbackQueryHandler, filters,
    )
    from telegram.constants import ParseMode
    from telegram.error import Forbidden, BadRequest
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           "python-telegram-bot>=20.0"], capture_output=True)
    from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
    from telegram.ext import (
        Application, CommandHandler, MessageHandler,
        ContextTypes, CallbackQueryHandler, filters,
    )
    from telegram.constants import ParseMode
    from telegram.error import Forbidden, BadRequest

from database import (
    registar_utilizador, obter_utilizador, todos_utilizadores_ativos,
    bloquear_utilizador, total_utilizadores, total_subscricoes,
    roi_historico, registar_broadcast, ativar_subscricao,
    subscricoes_a_expirar, tem_subscricao_ativa,
)
from conteudo import (
    BOAS_VINDAS, BOAS_VINDAS_REFERIDO, DICA_TEMPLATE, SEM_JOGOS_HOJE,
    PREVIEW_MANHA, RESUMO_NOITE, FAQ_PRECO, FAQ_COMO_FUNCIONA,
    FAQ_PRECISAO, FAQ_SUBSCREVER, FAQ_CANCELAR, FAQ_LIVE, FAQ_LIGAS,
    FAQ_REFERIDO, INFO_PRO, SUPORTE, FUNIL_DIA3, FUNIL_DIA7,
    get_faq_resposta, formatar_lista_jogos,
)
from motor import treinar_todos, analisar_dia

logging.basicConfig(level=logging.WARNING)

BOT_USERNAME = os.environ.get("MARKETING_BOT_USERNAME", "EdgeBetBot")
MODELOS: dict = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _enviar_seguro(bot, tid: int, texto: str, **kwargs) -> bool:
    """Envia mensagem e captura erros de utilizador bloqueado."""
    try:
        await bot.send_message(tid, texto, parse_mode=ParseMode.HTML,
                               disable_web_page_preview=True, **kwargs)
        return True
    except (Forbidden, BadRequest):
        bloquear_utilizador(tid)
        return False
    except Exception:
        return False


def _e_admin(tid: int) -> bool:
    return tid in ADMIN_IDS


def _dica_do_dia() -> dict | None:
    """Gera a melhor dica gratuita do dia a partir do modelo."""
    try:
        resultados = analisar_dia(MODELOS, limiar_ev=0.06)
        com_valor  = [r for r in resultados if r["apostas"] and r["estado"] == "pre"]
        if not com_valor:
            return None
        melhor = com_valor[0]
        aposta = melhor["apostas"][0]
        return {
            "liga":    melhor["liga"],
            "emoji":   melhor["emoji"],
            "casa":    melhor["casa_espn"],
            "fora":    melhor["fora_espn"],
            "mercado": aposta.mercado,
            "odd":     aposta.odd,
            "prob":    aposta.prob_modelo,
            "stake":   1.0,
            "total_hoje": len(com_valor),
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Handlers de comandos
# ---------------------------------------------------------------------------

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user   = update.effective_user
    tid    = user.id
    nome   = user.first_name or "Apostador"

    # Detectar referido
    referido_por = None
    if ctx.args:
        arg = ctx.args[0]
        if arg.startswith("ref_"):
            try:
                referido_por = int(arg[4:])
            except ValueError:
                pass

    novo = registar_utilizador(tid, user.username, nome,
                               referido_por=referido_por, bot="marketing")

    if referido_por and novo:
        msg = BOAS_VINDAS_REFERIDO.format(nome=nome)
    else:
        msg = BOAS_VINDAS.format(nome=nome)

    await update.message.reply_html(msg, disable_web_page_preview=True)

    # Enviar dica logo no start
    if novo:
        await _enviar_dica(update, ctx)

    # Agendar mensagens de funil
    if novo:
        ctx.job_queue.run_once(
            _funil_dia3, when=3 * 86400,
            chat_id=tid, data={"nome": nome, "tid": tid},
            name=f"funil3_{tid}"
        )
        ctx.job_queue.run_once(
            _funil_dia7, when=7 * 86400,
            chat_id=tid, data={"nome": nome, "tid": tid},
            name=f"funil7_{tid}"
        )


async def cmd_dica(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await _enviar_dica(update, ctx)


async def _enviar_dica(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("⏳ A gerar dica do dia...")
    dica = _dica_do_dia()
    if not dica:
        await update.message.reply_html(SEM_JOGOS_HOJE)
        return

    msg = DICA_TEMPLATE.format(
        **dica,
        rodape="💡 Quer acesso a <b>todas as dicas</b>? → /pro"
    )
    botoes = InlineKeyboardMarkup([[
        InlineKeyboardButton("🚀 Ver planos Pro", callback_data="ver_pro"),
        InlineKeyboardButton("📊 O nosso ROI", callback_data="ver_roi"),
    ]])
    await update.message.reply_html(msg, reply_markup=botoes,
                                    disable_web_page_preview=True)


async def cmd_hoje(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("⏳ A recolher jogos de hoje...")
    try:
        resultados = analisar_dia(MODELOS)
        jogos = [{
            "emoji": r["emoji"], "hora": r["hora_utc"].strftime("%H:%M") if r.get("hora_utc") else "",
            "casa": r["casa_espn"], "fora": r["fora_espn"]
        } for r in resultados]
        data_str = datetime.now().strftime("%d/%m/%Y")
        lista    = formatar_lista_jogos(jogos)
        msg = PREVIEW_MANHA.format(data=data_str, lista_jogos=lista)
    except Exception:
        msg = "⚠️ Não foi possível obter jogos agora. Tenta mais tarde."
    await update.message.reply_html(msg, disable_web_page_preview=True)


async def cmd_roi(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    roi = roi_historico()
    if roi["total_dicas"] == 0:
        await update.message.reply_html(
            "📊 Ainda não há dicas suficientes para calcular o ROI.\n"
            "Volta em breve!"
        )
        return
    msg = (
        f"📈 <b>Historial EdgeBet</b>\n\n"
        f"Total de dicas: <b>{roi['total_dicas']}</b>\n"
        f"Taxa de acerto: <b>{roi['taxa_acerto']:.1f}%</b>\n"
        f"ROI total: <b>{roi['roi']:+.1f}%</b>\n"
        f"Lucro (unidades): <b>{roi['lucro']:+.2f}u</b>\n\n"
        f"<i>Calculado com stakes fixas de 1 unidade por dica.</i>\n\n"
        f"Quer acesso a todas as dicas? /pro"
    )
    await update.message.reply_html(msg)


async def cmd_pro(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    botoes = InlineKeyboardMarkup([
        [InlineKeyboardButton("📅 Mensal — €29",      callback_data="plano_mensal")],
        [InlineKeyboardButton("📆 Trimestral — €69 ⭐", callback_data="plano_trimestral")],
        [InlineKeyboardButton("🗓 Anual — €199 🏆",    callback_data="plano_anual")],
        [InlineKeyboardButton("❓ Como subscrever",    callback_data="como_subscrever")],
    ])
    await update.message.reply_html(INFO_PRO, reply_markup=botoes,
                                    disable_web_page_preview=True)


async def cmd_preco(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(FAQ_PRECO, disable_web_page_preview=True)


async def cmd_comofunciona(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(FAQ_COMO_FUNCIONA)


async def cmd_referido(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tid  = update.effective_user.id
    link = f"https://t.me/{BOT_USERNAME}?start=ref_{tid}"
    msg  = FAQ_REFERIDO.format(bot_username=BOT_USERNAME, tid=tid)
    msg  = msg.replace(f"ref_{tid}", str(tid))  # simplifica o link
    # Override com link real
    msg += f"\n\n🔗 O teu link: <code>https://t.me/{BOT_USERNAME}?start=ref_{tid}</code>"
    await update.message.reply_html(msg, disable_web_page_preview=True)


async def cmd_suporte(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(SUPORTE, disable_web_page_preview=True)


async def cmd_cancelar_info(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html(FAQ_CANCELAR)


# ---------------------------------------------------------------------------
# Inline keyboard callbacks
# ---------------------------------------------------------------------------

async def callback_handler(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data

    respostas = {
        "ver_pro":         INFO_PRO,
        "ver_roi":         None,  # tratado abaixo
        "como_subscrever": FAQ_SUBSCREVER,
        "plano_mensal":    FAQ_SUBSCREVER,
        "plano_trimestral": FAQ_SUBSCREVER,
        "plano_anual":     FAQ_SUBSCREVER,
    }

    if data == "ver_roi":
        roi = roi_historico()
        msg = (f"📈 ROI: <b>{roi['roi']:+.1f}%</b> · "
               f"Acerto: <b>{roi.get('taxa_acerto', 0):.0f}%</b> · "
               f"Dicas: <b>{roi['total_dicas']}</b>")
        await query.edit_message_text(msg, parse_mode=ParseMode.HTML)
    elif data in respostas:
        await query.edit_message_text(respostas[data], parse_mode=ParseMode.HTML,
                                      disable_web_page_preview=True)


# ---------------------------------------------------------------------------
# FAQ automático para mensagens livres
# ---------------------------------------------------------------------------

async def msg_livre(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    texto   = update.message.text or ""
    tid     = update.effective_user.id

    # Registar se ainda não estiver na base de dados
    registar_utilizador(tid, update.effective_user.username,
                        update.effective_user.first_name, bot="marketing")

    resposta = get_faq_resposta(texto)
    if resposta:
        # Personalizar referido
        if "{bot_username}" in resposta:
            resposta = resposta.format(bot_username=BOT_USERNAME, tid=tid)
        await update.message.reply_html(resposta, disable_web_page_preview=True)
    else:
        await update.message.reply_html(
            "Não percebi bem a tua questão 🤔\n\n"
            "Experimenta:\n"
            "• /dica — dica gratuita de hoje\n"
            "• /pro — ver planos e preços\n"
            "• /comofunciona — como o modelo funciona\n"
            "• /suporte — falar com a equipa"
        )


# ---------------------------------------------------------------------------
# Admin commands
# ---------------------------------------------------------------------------

async def cmd_admin(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tid = update.effective_user.id
    if not _e_admin(tid):
        return

    args = ctx.args or []
    if not args:
        stats_u = total_utilizadores()
        stats_s = total_subscricoes()
        roi     = roi_historico()
        msg = (
            f"📊 <b>Painel Admin EdgeBet</b>\n\n"
            f"👥 Utilizadores: <b>{stats_u['total']}</b> "
            f"({stats_u['hoje']} hoje)\n"
            f"✅ Ativos: <b>{stats_u['ativos']}</b>\n"
            f"💳 Subscrições ativas: <b>{stats_s['ativas']}</b>\n"
            f"💶 Receita total: <b>€{stats_s['receita_total']:.2f}</b>\n"
            f"📈 ROI modelo: <b>{roi['roi']:+.1f}%</b>\n\n"
            f"Comandos:\n"
            f"/admin stats — este painel\n"
            f"/admin broadcast [msg] — enviar a todos\n"
            f"/admin ativar [id] [plano] — dar Pro\n"
        )
        await update.message.reply_html(msg)
        return

    sub = args[0].lower()

    if sub == "stats":
        await cmd_admin(update, ctx)

    elif sub == "broadcast":
        if len(args) < 2:
            await update.message.reply_html("Uso: /admin broadcast [mensagem]")
            return
        texto = " ".join(args[1:])
        users = todos_utilizadores_ativos("marketing")
        enviados = 0
        for row in users:
            ok = await _enviar_seguro(ctx.bot, row["telegram_id"], texto)
            if ok:
                enviados += 1
            await asyncio.sleep(0.05)  # rate limit Telegram
        registar_broadcast("manual", texto, enviados)
        await update.message.reply_html(
            f"✅ Broadcast enviado a <b>{enviados}</b> utilizadores."
        )

    elif sub == "ativar":
        if len(args) < 3:
            await update.message.reply_html(
                "Uso: /admin ativar [telegram_id] [mensal|trimestral|anual]"
            )
            return
        try:
            target_id = int(args[1])
            plano     = args[2].lower()
        except ValueError:
            await update.message.reply_html("ID inválido.")
            return
        ativar_subscricao(target_id, plano, valor=0.0, ref="admin")
        await _enviar_seguro(ctx.bot, target_id,
            f"🎉 O teu acesso EdgeBet <b>{plano.title()}</b> foi ativado!\n"
            "Usa o Bot Pro para aceder a todas as funcionalidades.",
        )
        await update.message.reply_html(
            f"✅ Subscrição <b>{plano}</b> ativada para {target_id}."
        )


# ---------------------------------------------------------------------------
# Jobs agendados (conteúdo automático)
# ---------------------------------------------------------------------------

async def _broadcast_todos(bot, texto: str, tipo: str):
    users    = todos_utilizadores_ativos("marketing")
    enviados = 0
    for row in users:
        ok = await _enviar_seguro(bot, row["telegram_id"], texto)
        if ok:
            enviados += 1
        await asyncio.sleep(0.04)
    registar_broadcast(tipo, texto, enviados)
    return enviados


async def job_preview_manha(ctx: ContextTypes.DEFAULT_TYPE):
    """Enviado às 9h: jogos do dia."""
    try:
        resultados = analisar_dia(MODELOS)
        jogos = [{
            "emoji": r["emoji"],
            "hora":  r["hora_utc"].strftime("%H:%M") if r.get("hora_utc") else "",
            "casa":  r["casa_espn"], "fora": r["fora_espn"]
        } for r in resultados]
        data_str = datetime.now().strftime("%d/%m/%Y")
        lista    = formatar_lista_jogos(jogos)
        msg      = PREVIEW_MANHA.format(data=data_str, lista_jogos=lista)
    except Exception:
        msg = "⚽ Bom dia! A dica do dia chega às 15h. /dica"

    await _broadcast_todos(ctx.bot, msg, "preview_manha")


async def job_dica_tarde(ctx: ContextTypes.DEFAULT_TYPE):
    """Enviado às 15h: dica gratuita do dia."""
    dica = _dica_do_dia()
    if not dica:
        return
    msg = DICA_TEMPLATE.format(
        **dica,
        rodape="💡 Quer <b>todas as dicas</b> de hoje? → /pro"
    )
    await _broadcast_todos(ctx.bot, msg, "dica_tarde")


async def job_resumo_noite(ctx: ContextTypes.DEFAULT_TYPE):
    """Enviado às 22h30: resumo e ROI."""
    roi = roi_historico()
    resultados_txt = "Consulta o historial completo com /roi"
    msg = RESUMO_NOITE.format(
        resultados=resultados_txt,
        roi=roi.get("roi", 0.0),
        taxa=roi.get("taxa_acerto", 0.0),
    )
    await _broadcast_todos(ctx.bot, msg, "resumo_noite")


async def job_alertas_expiracao(ctx: ContextTypes.DEFAULT_TYPE):
    """Verifica subscrições a expirar e envia alerta."""
    a_expirar = subscricoes_a_expirar(dias=3)
    for row in a_expirar:
        await _enviar_seguro(
            ctx.bot, row["telegram_id"],
            f"⚠️ A tua subscrição EdgeBet <b>{row['plano'].title()}</b> expira em breve!\n\n"
            "Renova agora para não perderes as dicas: /pro"
        )


# ---------------------------------------------------------------------------
# Funil de conversão (job_once agendado no /start)
# ---------------------------------------------------------------------------

async def _funil_dia3(ctx: ContextTypes.DEFAULT_TYPE):
    data = ctx.job.data
    roi  = roi_historico()
    msg  = FUNIL_DIA3.format(
        nome=data["nome"],
        total_dicas=roi.get("total_dicas", 0),
        total_pro=roi.get("total_dicas", 0) * 6,
        data_limite=(datetime.now()).strftime("%d/%m"),
    )
    await _enviar_seguro(ctx.bot, data["tid"], msg)


async def _funil_dia7(ctx: ContextTypes.DEFAULT_TYPE):
    data = ctx.job.data
    roi  = roi_historico()
    msg  = FUNIL_DIA7.format(
        nome=data["nome"],
        dicas_enviadas=roi.get("total_dicas", 0),
        roi=roi.get("roi", 0.0),
        bankroll_estimado=1000 * (1 + roi.get("roi", 0) / 100),
    )
    await _enviar_seguro(ctx.bot, data["tid"], msg)


# ---------------------------------------------------------------------------
# Arranque
# ---------------------------------------------------------------------------

def main():
    global MODELOS

    if not MARKETING_TOKEN:
        print(
            "\n❌  MARKETING_TOKEN não configurado!\n"
            "   Cria um segundo bot em @BotFather e define:\n"
            "   MARKETING_TOKEN=... no ficheiro .env\n"
        )
        sys.exit(1)

    print("\n📣  EdgeBet Marketing Bot")
    print("=" * 40)
    print("🔄  A treinar modelos...")
    MODELOS = treinar_todos(verbose=True)
    print()

    app = (
        Application.builder()
        .token(MARKETING_TOKEN)
        .build()
    )

    # Comandos públicos
    app.add_handler(CommandHandler("start",        cmd_start))
    app.add_handler(CommandHandler("dica",         cmd_dica))
    app.add_handler(CommandHandler("hoje",         cmd_hoje))
    app.add_handler(CommandHandler("roi",          cmd_roi))
    app.add_handler(CommandHandler("pro",          cmd_pro))
    app.add_handler(CommandHandler("preco",        cmd_preco))
    app.add_handler(CommandHandler("comofunciona", cmd_comofunciona))
    app.add_handler(CommandHandler("referido",     cmd_referido))
    app.add_handler(CommandHandler("suporte",      cmd_suporte))
    app.add_handler(CommandHandler("cancelar",     cmd_cancelar_info))
    app.add_handler(CommandHandler("admin",        cmd_admin))

    # Inline keyboards
    app.add_handler(CallbackQueryHandler(callback_handler))

    # FAQ para mensagens livres
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, msg_livre))

    # Jobs diários automáticos (requer python-telegram-bot[job-queue])
    jq = app.job_queue
    if jq is not None:
        jq.run_daily(job_preview_manha,     time=time(9,  0,  tzinfo=timezone.utc), name="preview_manha")
        jq.run_daily(job_dica_tarde,        time=time(14, 0,  tzinfo=timezone.utc), name="dica_tarde")
        jq.run_daily(job_resumo_noite,      time=time(21, 30, tzinfo=timezone.utc), name="resumo_noite")
        jq.run_daily(job_alertas_expiracao, time=time(10, 0,  tzinfo=timezone.utc), name="alertas_exp")
        print("⏰  Envios automáticos diários activados.")
    else:
        print("⚠️  Envios automáticos desactivados.")
        print("   Para activar: pip install \"python-telegram-bot[job-queue]\"")

    print("📣  Marketing Bot a correr. Ctrl+C para parar.\n")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
