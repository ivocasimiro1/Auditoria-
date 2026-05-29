"""
Integração com The Odds API (the-odds-api.com).
Obtém odds em tempo real das principais casas de apostas europeias.

Plano gratuito: 500 pedidos/mês (suficiente para uso diário).
Registo: https://the-odds-api.com/
"""

import json
import os
import time
import urllib.request
import urllib.error
from pathlib import Path

ODDS_API_KEY  = os.getenv("ODDS_API_KEY", "")
ODDS_API_BASE = "https://api.the-odds-api.com/v4/sports"
CACHE_DIR     = Path(__file__).parent.parent / "dados" / "cache"
CACHE_TTL     = 1800  # 30 minutos

# Mapeamento fd_code → sport_key da Odds API
ODDS_API_SLUG: dict[str, str] = {
    "E0":  "soccer_epl",
    "SP1": "soccer_spain_la_liga",
    "I1":  "soccer_italy_serie_a",
    "D1":  "soccer_germany_bundesliga",
    "F1":  "soccer_france_ligue_one",
    "P1":  "soccer_portugal_primeira_liga",
    "N1":  "soccer_netherlands_eredivisie",
    "B1":  "soccer_belgium_first_div",
    "SC0": "soccer_scotland_premiership",
    "T1":  "soccer_turkey_super_ligi",
    "G1":  "soccer_greece_super_league",
    "UCL": "soccer_uefa_champs_league",
    "UEL": "soccer_uefa_europa_league",
    "UCO": "soccer_uefa_europa_conference_league",
}

# Casas de apostas a mostrar (por ordem de preferência)
BOOKMAKERS_PREFERIDOS = [
    ("bet365",      "Bet365"),
    ("betclic",     "Betclic"),
    ("unibet_eu",   "Unibet"),
    ("williamhill", "William Hill"),
    ("pinnacle",    "Pinnacle"),
    ("betway",      "Betway"),
    ("sport888",    "888sport"),
]


def _cache_path(fd_code: str) -> Path:
    return CACHE_DIR / f"odds_{fd_code}.json"


def _cache_valido(path: Path) -> bool:
    return path.exists() and (time.time() - path.stat().st_mtime) < CACHE_TTL


def _get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "EdgeBet/1.0"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read()


def fetch_odds_liga(fd_code: str, forcar: bool = False) -> list[dict]:
    """
    Obtém odds de todos os jogos da liga via The Odds API.
    Retorna lista de eventos com odds de múltiplos bookmakers.
    """
    if not ODDS_API_KEY:
        return []

    sport_key = ODDS_API_SLUG.get(fd_code)
    if not sport_key:
        return []

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = _cache_path(fd_code)

    if not forcar and _cache_valido(cache):
        try:
            with open(cache) as f:
                return json.load(f)
        except Exception:
            pass

    url = (
        f"{ODDS_API_BASE}/{sport_key}/odds/"
        f"?apiKey={ODDS_API_KEY}"
        f"&regions=eu"
        f"&markets=h2h"
        f"&oddsFormat=decimal"
        f"&dateFormat=iso"
    )

    try:
        raw  = _get(url)
        data = json.loads(raw)
        with open(cache, "w") as f:
            json.dump(data, f)
        return data
    except Exception as e:
        print(f"      ⚠  OddsAPI {fd_code}: {e}")
        if cache.exists():
            try:
                with open(cache) as f:
                    return json.load(f)
            except Exception:
                pass
        return []


def _normalizar_nome(nome: str) -> str:
    """Normaliza nome de equipa para comparação."""
    return nome.lower().replace("fc ", "").replace(" fc", "").strip()


def encontrar_jogo(eventos: list[dict], casa: str, fora: str) -> dict | None:
    """Encontra o evento que corresponde ao jogo dado pelo nome das equipas."""
    casa_n = _normalizar_nome(casa)
    fora_n = _normalizar_nome(fora)

    for ev in eventos:
        h = _normalizar_nome(ev.get("home_team", ""))
        a = _normalizar_nome(ev.get("away_team", ""))
        if (casa_n in h or h in casa_n) and (fora_n in a or a in fora_n):
            return ev
    return None


def extrair_odds_bookmakers(evento: dict | None, max_bk: int = 5) -> list[dict]:
    """
    Extrai odds de múltiplos bookmakers de um evento.

    Retorna lista de dicts:
    [{"nome": "Bet365", "o1": 2.10, "ox": 3.20, "o2": 3.50}, ...]
    """
    if not evento:
        return []

    resultado = []
    bk_order  = [key for key, _ in BOOKMAKERS_PREFERIDOS]
    bk_names  = dict(BOOKMAKERS_PREFERIDOS)

    # Ordenar bookmakers por preferência
    bookmakers = sorted(
        evento.get("bookmakers", []),
        key=lambda b: bk_order.index(b["key"]) if b["key"] in bk_order else 99
    )

    home_team = evento.get("home_team", "")

    for bk in bookmakers[:max_bk]:
        key   = bk.get("key", "")
        nome  = bk_names.get(key, bk.get("title", key))
        mkt   = next((m for m in bk.get("markets", []) if m["key"] == "h2h"), None)
        if not mkt:
            continue

        o1 = ox = o2 = None
        for outcome in mkt.get("outcomes", []):
            n = outcome["name"]
            p = float(outcome["price"])
            if n == "Draw":
                ox = p
            elif _normalizar_nome(n) in _normalizar_nome(home_team) or \
                 _normalizar_nome(home_team) in _normalizar_nome(n):
                o1 = p
            else:
                o2 = p

        if o1 and o2:
            resultado.append({"nome": nome, "o1": o1, "ox": ox, "o2": o2})

    return resultado


def formatar_odds_bookmakers(odds_bk: list[dict]) -> str:
    """Formata lista de bookmakers para exibição no Telegram."""
    if not odds_bk:
        return ""

    linhas = ["🏪 <b>Odds nas casas de apostas:</b>"]
    for bk in odds_bk:
        ox_str = f" X {bk['ox']:.2f}" if bk.get("ox") else ""
        linhas.append(
            f"  • <b>{bk['nome']}</b>: "
            f"1 {bk['o1']:.2f}{ox_str} 2 {bk['o2']:.2f}"
        )
    return "\n".join(linhas)


def get_melhor_odd(odds_bk: list[dict], mercado: str) -> tuple[str, float] | None:
    """
    Retorna (bookmaker, odd) com a melhor odd disponível para o mercado.
    mercado: '1', 'X', '2'
    """
    if not odds_bk:
        return None

    campo = {"1": "o1", "X": "ox", "2": "o2"}.get(mercado, "o1")
    melhor_bk   = None
    melhor_odd  = 0.0

    for bk in odds_bk:
        odd = bk.get(campo)
        if odd and odd > melhor_odd:
            melhor_odd = odd
            melhor_bk  = bk["nome"]

    return (melhor_bk, melhor_odd) if melhor_bk else None


def fetch_odds_jogo(fd_code: str, casa_espn: str, fora_espn: str) -> list[dict]:
    """
    Busca e retorna as odds do bookmaker para um jogo específico.
    Função de conveniência usada pelos bots.
    """
    eventos = fetch_odds_liga(fd_code)
    evento  = encontrar_jogo(eventos, casa_espn, fora_espn)
    return extrair_odds_bookmakers(evento)
