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
    subscricoes_a_expirar, subscricoes_expiradas_hoje, tem_subscricao_ativa,
)
from conteudo import (
    BOAS_VINDAS, BOAS_VINDAS_REFERIDO, DICA_TEMPLATE, SEM_JOGOS_HOJE,
    PREVIEW_MANHA, RESUMO_NOITE, FAQ_PRECO, FAQ_COMO_FUNCIONA,
    FAQ_PRECISAO, FAQ_SUBSCREVER, FAQ_CANCELAR, FAQ_LIVE, FAQ_LIGAS,
    FAQ_REFERIDO, INFO_PRO, SUPORTE, FUNIL_DIA3, FUNIL_DIA7,
    PARTILHAR_TEMPLATE, PARTILHAR_GRUPO,
    get_faq_resposta, formatar_lista_jogos,
)
from motor import treinar_todos, analisar_dia
from modelo.odds_api import fetch_odds_jogo, formatar_odds_bookmakers

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
        com_valor  = [r for r in resultados if r["apostas"] and r["estado"] == "pre" and r["previsao"] is not None]
        if not com_valor:
            return None
        melhor = com_valor[0]
        aposta = melhor["apostas"][0]
        return {
            "fd_code":  melhor["fd_code"],
            "liga":     melhor["liga"],
            "emoji":    melhor["emoji"],
            "casa":     melhor["casa_espn"],
            "fora":     melhor["fora_espn"],
            "mercado":  aposta.mercado,
            "odd":      aposta.odd,
            "prob":     aposta.prob_modelo,
            "stake":    1.0,
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

    # Notificar admin de novo utilizador
    if novo:
        stats = total_utilizadores()
        user_tag = f"@{user.username}" if user.username else f"ID {tid}"
        ref_txt = f"\n👥 Referido por: <code>{referido_por}</code>" if referido_por else ""
        aviso_admin = (
            f"🆕 <b>Novo utilizador no EdgeBet!</b>\n\n"
            f"👤 {nome} ({user_tag})\n"
            f"🆔 <code>{tid}</code>{ref_txt}\n\n"
            f"📊 Total de utilizadores: <b>{stats['total']}</b> "
            f"({stats['hoje']} hoje)"
        )
        for admin_id in ADMIN_IDS:
            try:
                await ctx.bot.send_message(admin_id, aviso_admin,
                                           parse_mode=ParseMode.HTML)
            except Exception:
                pass

    # Enviar dica logo no start
    if novo:
        await _enviar_dica(update, ctx)

    # Agendar mensagens de funil (requer job-queue instalado)
    if novo and ctx.job_queue is not None:
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
        ctx.job_queue.run_once(
            _funil_dia14, when=14 * 86400,
            chat_id=tid, data={"nome": nome, "tid": tid},
            name=f"funil14_{tid}"
        )


async def cmd_dica(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await _enviar_dica(update, ctx)


async def _enviar_dica(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_html("⏳ A gerar dica do dia...")
    dica = _dica_do_dia()
    if not dica:
        await update.message.reply_html(SEM_JOGOS_HOJE)
        return

    # Buscar odds dos bookmakers
    odds_bk = fetch_odds_jogo(dica["fd_code"], dica["casa"], dica["fora"])
    odds_str = formatar_odds_bookmakers(odds_bk)
    odds_bloco = f"\n{odds_str}\n" if odds_str else ""

    msg = DICA_TEMPLATE.format(
        **dica,
        odds_casas=odds_bloco,
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
        [InlineKeyboardButton("💳 Subscrever por €9.99/mês", callback_data="como_subscrever")],
        [InlineKeyboardButton("❓ Como funciona",            callback_data="ver_como_funciona")],
        [InlineKeyboardButton("📊 Historial / ROI",          callback_data="ver_roi")],
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


async def cmd_paguei(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    tid  = user.id
    nome = user.first_name or "Cliente"
    user_tag = f"@{user.username}" if user.username else f"ID {tid}"

    # Confirmação ao cliente
    await update.message.reply_html(
        "✅ <b>Recebemos o teu aviso!</b>\n\n"
        "Vamos verificar o pagamento no MBWay e activar o teu acesso "
        "em menos de <b>1 hora</b>.\n\n"
        "Assim que estiver pronto recebes uma mensagem aqui. 🔥"
    )

    # Notificação ao admin com botão de activar
    botoes = InlineKeyboardMarkup([[
        InlineKeyboardButton("✅ Activar agora", callback_data=f"pg_ok_{tid}"),
        InlineKeyboardButton("❌ Rejeitar",      callback_data=f"pg_no_{tid}"),
    ]])
    aviso = (
        f"💰 <b>PAGAMENTO PENDENTE</b>\n\n"
        f"👤 Cliente: <b>{nome}</b> ({user_tag})\n"
        f"🆔 ID Telegram: <code>{tid}</code>\n"
        f"💶 Valor declarado: <b>€9.99 via MBWay</b>\n\n"
        f"⚠️ Verifica no MBWay (968 200 400) se o pagamento foi recebido.\n"
        f"Depois carrega em <b>Activar</b>."
    )
    for admin_id in ADMIN_IDS:
        try:
            await ctx.bot.send_message(
                admin_id, aviso,
                parse_mode=ParseMode.HTML,
                reply_markup=botoes,
            )
        except Exception:
            pass


async def cmd_partilhar(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    tid  = update.effective_user.id
    link = f"https://t.me/{BOT_USERNAME}?start=ref_{tid}"
    msg  = PARTILHAR_TEMPLATE.format(link=link)
    await update.message.reply_html(msg, disable_web_page_preview=True)
    # Segunda mensagem com texto para copiar para grupos
    msg2 = PARTILHAR_GRUPO.format(link=link)
    await update.message.reply_html(msg2, disable_web_page_preview=True)


# ---------------------------------------------------------------------------
# Inline keyboard callbacks
# ---------------------------------------------------------------------------

async def callback_handler(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data  = query.data

    # ── Activação de pagamento via botão ──────────────────────────────────
    if data.startswith("pg_ok_") or data.startswith("pg_no_"):
        try:
            cliente_id = int(data.split("_")[-1])
        except ValueError:
            return

        if data.startswith("pg_ok_"):
            expira = ativar_subscricao(cliente_id, "mensal", valor=9.99, ref="mbway_paguei")
            expira_fmt = expira[:10]
            # Notifica o cliente
            await _enviar_seguro(ctx.bot, cliente_id,
                "🎉 <b>Acesso EdgeBet Pro activado!</b>\n\n"
                f"📅 Válido até: <b>{expira_fmt}</b>\n\n"
                "Usa @EdgeBetProBot para todas as dicas e análises live.\n"
                "Boas apostas! 🔥"
            )
            await query.edit_message_text(
                f"✅ Subscrição activada para {cliente_id}\n📅 Expira: {expira_fmt}",
                parse_mode=ParseMode.HTML,
            )
        else:
            # Pagamento rejeitado — avisa o cliente
            await _enviar_seguro(ctx.bot, cliente_id,
                "⚠️ <b>Não encontrámos o teu pagamento.</b>\n\n"
                "Por favor confirma:\n"
                "• Enviaste para o número correcto: <b>968 200 400</b>\n"
                "• O valor foi <b>€9.99</b>\n\n"
                "Se já enviaste, envia o comprovativo aqui e resolvemos em minutos. 🙏"
            )
            await query.edit_message_text(
                f"❌ Pagamento rejeitado para {cliente_id}. Cliente foi avisado.",
                parse_mode=ParseMode.HTML,
            )
        return

    # ── Respostas normais de FAQ ──────────────────────────────────────────
    respostas = {
        "ver_pro":           INFO_PRO,
        "ver_roi":           None,
        "ver_como_funciona": FAQ_COMO_FUNCIONA,
        "como_subscrever":   FAQ_SUBSCREVER,
        "plano_mensal":      FAQ_SUBSCREVER,
        "plano_trimestral":  FAQ_SUBSCREVER,
        "plano_anual":       FAQ_SUBSCREVER,
    }

    if data == "ver_roi":
        roi = roi_historico()
        msg = (f"📈 ROI: <b>{roi['roi']:+.1f}%</b> · "
               f"Acerto: <b>{roi.get('taxa_acerto', 0):.0f}%</b> · "
               f"Dicas: <b>{roi['total_dicas']}</b>")
        await query.edit_message_text(msg, parse_mode=ParseMode.HTML)
    elif data in respostas and respostas[data]:
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
        if len(args) < 2:
            await update.message.reply_html(
                "Uso: /admin ativar [telegram_id]"
            )
            return
        try:
            target_id = int(args[1])
        except ValueError:
            await update.message.reply_html("ID inválido.")
            return
        expira = ativar_subscricao(target_id, "mensal", valor=9.99, ref="mbway")
        expira_fmt = expira[:10]  # YYYY-MM-DD
        await _enviar_seguro(ctx.bot, target_id,
            "🎉 O teu acesso <b>EdgeBet Pro</b> foi ativado!\n\n"
            f"📅 Válido até: <b>{expira_fmt}</b>\n\n"
            "Usa @EdgeBetProBot para aceder a todas as funcionalidades.\n"
            "Boas apostas! 🔥"
        )
        await update.message.reply_html(
            f"✅ Subscrição <b>mensal (€9.99)</b> ativada para {target_id}.\n"
            f"📅 Expira em: <b>{expira_fmt}</b>"
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
    odds_bk  = fetch_odds_jogo(dica["fd_code"], dica["casa"], dica["fora"])
    odds_str  = formatar_odds_bookmakers(odds_bk)
    odds_bloco = f"\n{odds_str}\n" if odds_str else ""
    msg = DICA_TEMPLATE.format(
        **dica,
        odds_casas=odds_bloco,
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
    """Verifica subscrições a expirar (3 dias antes) e já expiradas (hoje)."""
    # Aviso 3 dias antes
    a_expirar = subscricoes_a_expirar(dias=3)
    for row in a_expirar:
        expira_fmt = row["expira"][:10]
        await _enviar_seguro(
            ctx.bot, row["telegram_id"],
            f"⚠️ <b>A tua subscrição EdgeBet Pro expira a {expira_fmt}!</b>\n\n"
            "Para renovar, envia <b>€9.99</b> via MBWay para <b>968 200 400</b> "
            "e envia o comprovativo aqui.\n\n"
            "Não percas as dicas! 🔥"
        )

    # Aviso no dia em que expira
    expiradas = subscricoes_expiradas_hoje()
    for row in expiradas:
        await _enviar_seguro(
            ctx.bot, row["telegram_id"],
            "😔 <b>A tua subscrição EdgeBet Pro expirou hoje.</b>\n\n"
            "Para continuar a receber todas as dicas:\n"
            "1️⃣ Envia <b>€9.99</b> via MBWay → <b>968 200 400</b>\n"
            "2️⃣ Envia o comprovativo aqui\n"
            "3️⃣ Acesso renovado em menos de 1h ✅\n\n"
            "Continuamos a enviar-te dicas gratuitas: /dica"
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


async def _funil_dia14(ctx: ContextTypes.DEFAULT_TYPE):
    from conteudo import FUNIL_DIA14
    data = ctx.job.data
    roi  = roi_historico()
    msg  = FUNIL_DIA14.format(
        nome=data["nome"],
        dicas_pro=roi.get("total_dicas", 0) * 8,
        roi=roi.get("roi", 0.0),
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
    app.add_handler(CommandHandler("partilhar",   cmd_partilhar))
    app.add_handler(CommandHandler("paguei",      cmd_paguei))
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
