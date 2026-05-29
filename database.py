"""
Base de dados SQLite central do EdgeBet.
Gere utilizadores, subscrições, dicas enviadas e referidos.
"""

import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "dados" / "edgebet.db"


def init_db():
    """Cria todas as tabelas se ainda não existirem."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS utilizadores (
            telegram_id     INTEGER PRIMARY KEY,
            username        TEXT,
            primeiro_nome   TEXT,
            data_entrada    TEXT DEFAULT (datetime('now')),
            referido_por    INTEGER,
            num_referidos   INTEGER DEFAULT 0,
            bloqueado       INTEGER DEFAULT 0,
            bot_origem      TEXT DEFAULT 'marketing'
        );

        CREATE TABLE IF NOT EXISTS subscricoes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id     INTEGER NOT NULL,
            plano           TEXT NOT NULL,
            inicio          TEXT DEFAULT (datetime('now')),
            expira          TEXT NOT NULL,
            valor_pago      REAL,
            ref_pagamento   TEXT,
            ativa           INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS dicas_enviadas (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            enviada_em      TEXT DEFAULT (datetime('now')),
            jogo            TEXT,
            liga            TEXT,
            mercado         TEXT,
            odd             REAL,
            stake_unidades  REAL DEFAULT 1.0,
            resultado       TEXT,
            lucro_unidades  REAL,
            tipo            TEXT DEFAULT 'gratuita'
        );

        CREATE TABLE IF NOT EXISTS broadcasts (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            enviado_em      TEXT DEFAULT (datetime('now')),
            tipo            TEXT,
            conteudo        TEXT,
            destinatarios   INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS mensagens_pendentes (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id     INTEGER,
            conteudo        TEXT,
            agendada_para   TEXT,
            enviada         INTEGER DEFAULT 0
        );
        """)


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Utilizadores
# ---------------------------------------------------------------------------

def registar_utilizador(tid: int, username: str, primeiro_nome: str,
                        referido_por: int | None = None, bot: str = "marketing"):
    with get_db() as db:
        existe = db.execute(
            "SELECT 1 FROM utilizadores WHERE telegram_id=?", (tid,)
        ).fetchone()
        if not existe:
            db.execute(
                """INSERT INTO utilizadores
                   (telegram_id, username, primeiro_nome, referido_por, bot_origem)
                   VALUES (?,?,?,?,?)""",
                (tid, username or "", primeiro_nome or "Utilizador",
                 referido_por, bot)
            )
            if referido_por:
                db.execute(
                    "UPDATE utilizadores SET num_referidos=num_referidos+1 WHERE telegram_id=?",
                    (referido_por,)
                )
            return True  # novo
        return False  # já existia


def obter_utilizador(tid: int):
    with get_db() as db:
        return db.execute(
            "SELECT * FROM utilizadores WHERE telegram_id=?", (tid,)
        ).fetchone()


def todos_utilizadores_ativos(bot: str | None = None) -> list:
    with get_db() as db:
        if bot:
            return db.execute(
                "SELECT telegram_id FROM utilizadores WHERE bloqueado=0 AND bot_origem=?",
                (bot,)
            ).fetchall()
        return db.execute(
            "SELECT telegram_id FROM utilizadores WHERE bloqueado=0"
        ).fetchall()


def bloquear_utilizador(tid: int):
    with get_db() as db:
        db.execute("UPDATE utilizadores SET bloqueado=1 WHERE telegram_id=?", (tid,))


def total_utilizadores() -> dict:
    with get_db() as db:
        total   = db.execute("SELECT COUNT(*) FROM utilizadores").fetchone()[0]
        ativos  = db.execute("SELECT COUNT(*) FROM utilizadores WHERE bloqueado=0").fetchone()[0]
        hoje    = db.execute(
            "SELECT COUNT(*) FROM utilizadores WHERE date(data_entrada)=date('now')"
        ).fetchone()[0]
        return {"total": total, "ativos": ativos, "hoje": hoje}


# ---------------------------------------------------------------------------
# Subscrições
# ---------------------------------------------------------------------------

PLANOS = {
    "mensal": {"dias": 30, "preco": 9.99},
}


def ativar_subscricao(tid: int, plano: str, valor: float = 0.0, ref: str = ""):
    dias = PLANOS.get(plano, {}).get("dias", 30)
    with get_db() as db:
        # Se já tem subscrição activa, estende a partir da data de expiração (não perde dias)
        atual = db.execute(
            """SELECT expira FROM subscricoes
               WHERE telegram_id=? AND ativa=1 AND expira > datetime('now')
               ORDER BY expira DESC LIMIT 1""",
            (tid,)
        ).fetchone()

        if atual:
            base = datetime.fromisoformat(atual["expira"])
        else:
            base = datetime.utcnow()

        expira = (base + timedelta(days=dias)).isoformat()

        db.execute("UPDATE subscricoes SET ativa=0 WHERE telegram_id=?", (tid,))
        db.execute(
            """INSERT INTO subscricoes (telegram_id, plano, expira, valor_pago, ref_pagamento)
               VALUES (?,?,?,?,?)""",
            (tid, plano, expira, valor, ref)
        )
    return expira  # devolve data de expiração para confirmar ao admin


def tem_subscricao_ativa(tid: int) -> bool:
    with get_db() as db:
        row = db.execute(
            """SELECT 1 FROM subscricoes
               WHERE telegram_id=? AND ativa=1 AND expira > datetime('now')""",
            (tid,)
        ).fetchone()
        return row is not None


def info_subscricao(tid: int):
    with get_db() as db:
        return db.execute(
            """SELECT * FROM subscricoes
               WHERE telegram_id=? AND ativa=1
               ORDER BY expira DESC LIMIT 1""",
            (tid,)
        ).fetchone()


def subscricoes_a_expirar(dias: int = 3) -> list:
    limite = (datetime.utcnow() + timedelta(days=dias)).isoformat()
    with get_db() as db:
        return db.execute(
            """SELECT telegram_id, plano, expira FROM subscricoes
               WHERE ativa=1 AND expira <= ? AND expira > datetime('now')""",
            (limite,)
        ).fetchall()


def subscricoes_expiradas_hoje() -> list:
    """Subscrições que expiraram nas últimas 24h (para notificar o cliente)."""
    ontem = (datetime.utcnow() - timedelta(days=1)).isoformat()
    agora = datetime.utcnow().isoformat()
    with get_db() as db:
        return db.execute(
            """SELECT telegram_id, plano, expira FROM subscricoes
               WHERE ativa=1 AND expira <= ? AND expira >= ?""",
            (agora, ontem)
        ).fetchall()


def total_subscricoes() -> dict:
    with get_db() as db:
        ativas  = db.execute(
            "SELECT COUNT(*) FROM subscricoes WHERE ativa=1 AND expira>datetime('now')"
        ).fetchone()[0]
        receita = db.execute(
            "SELECT COALESCE(SUM(valor_pago),0) FROM subscricoes"
        ).fetchone()[0]
        return {"ativas": ativas, "receita_total": receita}


# ---------------------------------------------------------------------------
# Dicas e ROI
# ---------------------------------------------------------------------------

def registar_dica(jogo, liga, mercado, odd, stake=1.0, tipo="gratuita") -> int:
    with get_db() as db:
        cur = db.execute(
            """INSERT INTO dicas_enviadas (jogo, liga, mercado, odd, stake_unidades, tipo)
               VALUES (?,?,?,?,?,?)""",
            (jogo, liga, mercado, odd, stake, tipo)
        )
        return cur.lastrowid


def atualizar_resultado_dica(dica_id: int, resultado: str, lucro: float):
    with get_db() as db:
        db.execute(
            "UPDATE dicas_enviadas SET resultado=?, lucro_unidades=? WHERE id=?",
            (resultado, lucro, dica_id)
        )


def roi_historico() -> dict:
    with get_db() as db:
        rows = db.execute(
            """SELECT stake_unidades, lucro_unidades FROM dicas_enviadas
               WHERE resultado IS NOT NULL"""
        ).fetchall()
        if not rows:
            return {"total_dicas": 0, "ganhas": 0, "roi": 0.0, "lucro": 0.0}
        total   = len(rows)
        ganhas  = sum(1 for r in rows if r["lucro_unidades"] > 0)
        stake   = sum(r["stake_unidades"] for r in rows)
        lucro   = sum(r["lucro_unidades"] for r in rows if r["lucro_unidades"])
        roi     = (lucro / stake * 100) if stake else 0.0
        return {
            "total_dicas": total,
            "ganhas":      ganhas,
            "taxa_acerto": ganhas / total * 100 if total else 0,
            "roi":         roi,
            "lucro":       lucro,
        }


# ---------------------------------------------------------------------------
# Broadcasts
# ---------------------------------------------------------------------------

def registar_broadcast(tipo: str, conteudo: str, destinatarios: int):
    with get_db() as db:
        db.execute(
            "INSERT INTO broadcasts (tipo, conteudo, destinatarios) VALUES (?,?,?)",
            (tipo, conteudo, destinatarios)
        )


init_db()
