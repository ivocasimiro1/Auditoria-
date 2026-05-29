"""
Descarrega dados históricos de football-data.co.uk e jogos ao vivo via ESPN API.
"""

import io
import json
import time
import urllib.request
import urllib.error
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

from .ligas import LIGAS, get_season_codes, normalizar_equipa
from .data import DataLoader

CACHE_DIR = Path(__file__).parent.parent / "dados" / "cache"
FDCO_BASE = "https://www.football-data.co.uk/mmz4281"
ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
HEADERS   = {"User-Agent": "Mozilla/5.0 (compatible; EdgeBet/1.0)"}
CACHE_TTL = 21600  # 6 horas em segundos


# ---------------------------------------------------------------------------
# Utilitários HTTP
# ---------------------------------------------------------------------------

def _get(url: str, timeout: int = 15) -> bytes:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def _cache_valido(path: Path) -> bool:
    if not path.exists():
        return False
    return (time.time() - path.stat().st_mtime) < CACHE_TTL


# ---------------------------------------------------------------------------
# Dados históricos — football-data.co.uk
# ---------------------------------------------------------------------------

def download_temporada(fd_code: str, temporada: str, forcar: bool = False) -> pd.DataFrame:
    """
    Descarrega CSV de uma temporada de football-data.co.uk.
    Guarda em cache em dados/cache/.
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = CACHE_DIR / f"{fd_code}_{temporada}.csv"

    if cache.exists() and not forcar and _cache_valido(cache):
        try:
            return pd.read_csv(cache, encoding="latin-1")
        except Exception:
            pass

    url = f"{FDCO_BASE}/{temporada}/{fd_code}.csv"
    try:
        raw = _get(url)
        df  = pd.read_csv(io.BytesIO(raw), encoding="latin-1")
        df.to_csv(cache, index=False, encoding="utf-8")
        return df
    except Exception as e:
        # Temporada ainda não disponível (início de época)
        if cache.exists():
            return pd.read_csv(cache, encoding="latin-1")
        print(f"      ⚠  {fd_code} {temporada}: {e}")
        return pd.DataFrame()


def carregar_dados_liga(fd_code: str, n_temporadas: int = 2, forcar: bool = False) -> pd.DataFrame:
    """
    Carrega e concatena N temporadas de dados históricos para uma liga.
    Retorna DataFrame normalizado pronto para treinar o modelo.
    """
    codigos = get_season_codes(n_temporadas)
    dfs = []
    for cod in codigos:
        df = download_temporada(fd_code, cod, forcar)
        if not df.empty:
            dfs.append(df)
    if not dfs:
        return pd.DataFrame()
    combined = pd.concat(dfs, ignore_index=True)
    try:
        return DataLoader._normalizar(combined)
    except ValueError:
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Jogos ao vivo / hoje — ESPN API (sem autenticação)
# ---------------------------------------------------------------------------

def _minutos_decorridos(clock: float, period: int) -> int:
    """Converte clock (minutos) e período ESPN em minutos totais decorridos."""
    base = (period - 1) * 45
    total = base + int(clock)
    return min(total, 90)


def _american_para_decimal(ml: float | None) -> float | None:
    """Converte odds americanas (moneyLine) em odds decimais."""
    if ml is None:
        return None
    try:
        ml = float(ml)
        if ml > 0:
            return round(ml / 100 + 1, 2)
        else:
            return round(100 / abs(ml) + 1, 2)
    except (TypeError, ZeroDivisionError):
        return None


def fetch_jogos_espn(fd_code: str, data_str: str | None = None) -> list[dict]:
    """
    Obtém jogos de hoje (ou de uma data específica) via ESPN API.

    data_str : formato YYYYMMDD, ex: "20260528". None = hoje.

    Retorna lista de dicts:
    {
        liga, espn_slug, casa_espn, fora_espn,
        estado,         # "pre" | "in" | "post"
        minuto,
        golos_casa, golos_fora,
        hora_utc,       # datetime UTC
        odds            # {"o1": float|None, "ox": float|None, "o2": float|None}
    }
    """
    liga = LIGAS[fd_code]
    slug = liga["espn_slug"]
    url  = f"{ESPN_BASE}/{slug}/scoreboard"
    if data_str:
        url += f"?dates={data_str}"

    try:
        raw      = _get(url)
        payload  = json.loads(raw)
    except Exception as e:
        print(f"      ⚠  ESPN {liga['nome']}: {e}")
        return []

    jogos = []
    for evento in payload.get("events", []):
        try:
            comp   = evento.get("competitions", [{}])[0]
            status = comp.get("status", {})
            tipo   = status.get("type", {})
            estado = {"1": "pre", "2": "in", "3": "post"}.get(tipo.get("id", ""), "pre")

            # Ignorar jogos já terminados
            if estado == "post":
                continue

            concorrentes = comp.get("competitors", [])
            home_c = next((c for c in concorrentes if c.get("homeAway") == "home"), None)
            away_c = next((c for c in concorrentes if c.get("homeAway") == "away"), None)
            if not home_c or not away_c:
                continue

            casa_espn = home_c["team"]["displayName"]
            fora_espn = away_c["team"]["displayName"]

            clock  = float(status.get("clock", 0) or 0)
            period = int(status.get("period", 1) or 1)
            minuto = _minutos_decorridos(clock, period) if estado == "in" else 0

            golos_casa = int(home_c.get("score") or 0)
            golos_fora = int(away_c.get("score") or 0)

            # Data/hora UTC
            hora_utc_str = evento.get("date", "") or comp.get("date", "")
            try:
                hora_utc = datetime.fromisoformat(hora_utc_str.replace("Z", "+00:00"))
            except Exception:
                hora_utc = None

            # Odds americanas → decimais (ESPN BET, se disponível)
            odds_raw = comp.get("odds", [])
            odds = {"o1": None, "ox": None, "o2": None}
            if odds_raw:
                o = odds_raw[0]
                odds["o1"] = _american_para_decimal(
                    o.get("homeTeamOdds", {}).get("moneyLine"))
                odds["ox"] = _american_para_decimal(
                    o.get("drawOdds", {}).get("moneyLine"))
                odds["o2"] = _american_para_decimal(
                    o.get("awayTeamOdds", {}).get("moneyLine"))

            jogos.append({
                "fd_code":    fd_code,
                "liga":       liga["nome"],
                "emoji":      liga["emoji"],
                "espn_slug":  slug,
                "casa_espn":  casa_espn,
                "fora_espn":  fora_espn,
                "estado":     estado,
                "minuto":     minuto,
                "golos_casa": golos_casa,
                "golos_fora": golos_fora,
                "hora_utc":   hora_utc,
                "odds":       odds,
            })
        except Exception:
            continue

    return jogos


def fetch_todas_ligas(data_str: str | None = None) -> list[dict]:
    """Obtém jogos de todas as ligas configuradas (nacionais + europeias + taças)."""
    # Sempre passa data explícita para evitar fuso horário ESPN (US Eastern)
    if data_str is None:
        data_str = date.today().strftime("%Y%m%d")

    hoje = datetime.strptime(data_str, "%Y%m%d").date()

    todos = []
    for fd_code in LIGAS:
        jogos = fetch_jogos_espn(fd_code, data_str)
        todos.extend(jogos)
    # Remove duplicados (mesmo jogo pode aparecer em várias pesquisas)
    vistos = set()
    unicos = []
    for j in todos:
        # Filtrar jogos que não são de hoje (segurança extra)
        if j.get("hora_utc") and j["hora_utc"].date() != hoje:
            continue
        chave = (j["casa_espn"], j["fora_espn"], str(j.get("hora_utc", "")))
        if chave not in vistos:
            vistos.add(chave)
            unicos.append(j)
    return unicos


def normalizar_jogo(jogo: dict, modelos: dict) -> dict | None:
    """
    Tenta associar os nomes ESPN às equipas conhecidas pelo modelo.
    Retorna None se não conseguir normalizar ambas as equipas.
    """
    fd_code = jogo["fd_code"]
    modelo  = modelos.get(fd_code)
    if modelo is None:
        return None

    equipas = modelo.teams_
    casa = normalizar_equipa(jogo["casa_espn"], fd_code, equipas)
    fora = normalizar_equipa(jogo["fora_espn"], fd_code, equipas)

    if not casa or not fora:
        return None

    return {**jogo, "casa": casa, "fora": fora}
