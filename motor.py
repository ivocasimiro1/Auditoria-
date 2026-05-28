"""
Motor central do EdgeBet.
Treina os modelos e gera previsões + apostas de valor.
Suporta ligas nacionais (com histórico) e competições europeias/taças (cross-liga).
"""

import numpy as np
from datetime import datetime, timezone

from colorama import Fore

from modelo.dixon_coles import DixonColesModel
from modelo.fetcher import carregar_dados_liga, fetch_todas_ligas, normalizar_jogo
from modelo.live import predict_com_fallback
from modelo.value_betting import analisar_mercados
from modelo.ligas import LIGAS, LIGAS_NACIONAIS, LIGAS_ESPN_ONLY, normalizar_equipa

MIN_JOGOS = 80


# ---------------------------------------------------------------------------
# Treino
# ---------------------------------------------------------------------------

def treinar_todos(ligas: list[str] | None = None, verbose: bool = True) -> dict:
    """
    Treina um DixonColesModel por liga nacional.
    Competições europeias/taças não têm modelo próprio (usam cross-liga).
    Retorna dict {fd_code: DixonColesModel | None}
    """
    # Só treinar ligas nacionais com dados históricos
    codigos_nacionais = [c for c in (ligas or list(LIGAS.keys()))
                         if LIGAS[c]["tipo"] == "nacional"]
    modelos = {}

    for fd_code in codigos_nacionais:
        info = LIGAS[fd_code]
        if verbose:
            print(f"  {info['emoji']}  {info['nome']:<22}", end="", flush=True)

        df = carregar_dados_liga(fd_code, n_temporadas=2)
        if df.empty or len(df) < MIN_JOGOS:
            if verbose:
                n = len(df) if not df.empty else 0
                print(Fore.YELLOW + f" {n} jogos — poucos dados, a ignorar.")
            modelos[fd_code] = None
            continue

        modelo = DixonColesModel(xi=0.0018)
        modelo.fit(df)
        modelos[fd_code] = modelo
        if verbose:
            print(Fore.GREEN + f" ✓  {len(df)} jogos, {len(modelo.teams_)} equipas")

    return modelos


# ---------------------------------------------------------------------------
# Previsão cross-liga (Competições Europeias / Taças)
# ---------------------------------------------------------------------------

# Média de golos por jogo por liga (ajuste de escala entre ligas)
_GOLOS_MEDIO = {
    "E0": 2.81, "SP1": 2.67, "I1": 2.60, "D1": 3.19,
    "F1": 2.72, "P1": 2.65, "N1": 3.05, "B1": 2.89,
    "SC0": 2.70, "T1": 2.71, "G1": 2.58,
}
_MEDIA_EUROPEIA = 2.75


def _liga_de_equipa(nome_espn: str, modelos: dict) -> tuple[str | None, str | None]:
    """Tenta descobrir em que liga está uma equipa pelo nome ESPN."""
    for fd_code, modelo in modelos.items():
        if modelo is None:
            continue
        nome_norm = normalizar_equipa(nome_espn, fd_code, modelo.teams_)
        if nome_norm:
            return fd_code, nome_norm
    return None, None


def _params_equipa(nome_norm: str, fd_code: str, modelo: DixonColesModel) -> tuple[float, float]:
    """Retorna (ataque, defesa) de uma equipa normalizados para escala europeia."""
    n    = len(modelo.teams_)
    hi   = modelo._team_idx.get(nome_norm)
    if hi is None:
        avg_atk = float(np.exp(modelo.params_[:n]).mean())
        avg_def = float(np.exp(modelo.params_[n:2*n]).mean())
        return avg_atk, avg_def
    atk = float(np.exp(modelo.params_[hi]))
    def_ = float(np.exp(modelo.params_[n + hi]))
    # Escalar para nível europeu comum
    liga_media = _GOLOS_MEDIO.get(fd_code, 2.75)
    escala = _MEDIA_EUROPEIA / liga_media
    return atk * escala, def_ * escala


def prever_cross_liga(
    nome_casa_espn: str,
    nome_fora_espn: str,
    modelos: dict,
    golos_casa: int = 0,
    golos_fora: int = 0,
    minuto: int = 0,
) -> tuple[dict | None, bool]:
    """
    Previsão para jogos de competições europeias/taças,
    usando parâmetros das ligas nacionais normalizados.
    Retorna (previsao, é_fallback).
    """
    from scipy.stats import poisson

    liga_c, nome_c = _liga_de_equipa(nome_casa_espn, modelos)
    liga_f, nome_f = _liga_de_equipa(nome_fora_espn, modelos)

    if not nome_c or not nome_f:
        return None, True

    atk_c, def_c = _params_equipa(nome_c, liga_c, modelos[liga_c])
    atk_f, def_f = _params_equipa(nome_f, liga_f, modelos[liga_f])

    # Home advantage reduzido em campo neutro / europeu
    home_adv = 1.10
    lam_full = atk_c * def_f * home_adv
    mu_full  = atk_f * def_c

    frac = max(90 - minuto, 3) / 90.0 if minuto > 0 else 1.0
    lam, mu = lam_full * frac, mu_full * frac

    max_g = 10
    g     = range(max_g + 1)
    p_h   = poisson.pmf(list(g), lam)
    p_a   = poisson.pmf(list(g), mu)

    vc = emp = vf = over = btts = 0.0
    for dh, ph in enumerate(p_h):
        for da, pa in enumerate(p_a):
            p  = ph * pa
            fh = golos_casa + dh
            fa = golos_fora + da
            if fh > fa:    vc  += p
            elif fh == fa: emp += p
            else:          vf  += p
            if fh + fa >= 3:       over += p
            if fh >= 1 and fa >= 1: btts += p

    # Top placares
    matrix = np.outer(p_h, p_a)
    flat   = matrix.flatten()
    top    = np.argsort(flat)[::-1][:5]
    scores = []
    for idx in top:
        hg, ag = divmod(int(idx), max_g + 1)
        scores.append({"placar": f"{hg}-{ag}", "prob": float(matrix[hg, ag])})

    return {
        "vitoria_casa": vc, "empate": emp, "vitoria_fora": vf,
        "over_25": over, "under_25": 1.0 - over,
        "ambas_marcam": btts, "nao_ambas": 1.0 - btts,
        "golos_esp_casa": lam, "golos_esp_fora": mu,
        "placares_prov": scores,
        "minutos_restantes": max(90 - minuto, 3) if minuto > 0 else 90,
        "placar_atual": f"{golos_casa}-{golos_fora}",
        "minuto": minuto,
        "ligas_origem": f"{liga_c}+{liga_f}",
    }, (liga_c != liga_f)


# ---------------------------------------------------------------------------
# Análise do dia
# ---------------------------------------------------------------------------

def analisar_dia(
    modelos: dict,
    data_str: str | None = None,
    limiar_ev: float = 0.05,
    bankroll: float = 1000.0,
) -> list[dict]:
    """
    Obtém jogos de hoje (ou data_str=YYYYMMDD) e gera previsões.
    Suporta ligas nacionais e competições europeias/taças.
    Ordena: live primeiro, depois por hora.
    """
    jogos_raw = fetch_todas_ligas(data_str)
    resultados = []

    for jogo in jogos_raw:
        fd_code  = jogo["fd_code"]
        tipo_liga = LIGAS[fd_code]["tipo"]
        prev, fallback = None, False

        if tipo_liga == "nacional":
            # Previsão normal com modelo treinado
            jogo_norm = normalizar_jogo(jogo, modelos)
            if jogo_norm is None:
                continue
            modelo = modelos.get(fd_code)
            if modelo is None:
                continue
            try:
                prev, fallback = predict_com_fallback(
                    modelo,
                    jogo_norm["casa"], jogo_norm["fora"],
                    jogo["golos_casa"], jogo["golos_fora"],
                    jogo["minuto"],
                )
            except Exception:
                continue
        else:
            # Previsão cross-liga (europeia / taça)
            prev, fallback = prever_cross_liga(
                jogo["casa_espn"], jogo["fora_espn"],
                modelos,
                jogo["golos_casa"], jogo["golos_fora"],
                jogo["minuto"],
            )
            if prev is None:
                continue

        # Apostas de valor (se ESPN tiver odds)
        odds    = jogo["odds"]
        apostas = []
        if any(v is not None for v in odds.values()):
            apostas = analisar_mercados(
                prev,
                odds_casa   = odds.get("o1") or 0,
                odds_empate = odds.get("ox") or 0,
                odds_fora   = odds.get("o2") or 0,
                limiar_ev   = limiar_ev,
            )

        resultados.append({
            "fd_code":    fd_code,
            "liga":       jogo["liga"],
            "emoji":      jogo["emoji"],
            "tipo":       tipo_liga,
            "casa":       jogo.get("casa_espn", ""),
            "fora":       jogo.get("fora_espn", ""),
            "casa_espn":  jogo["casa_espn"],
            "fora_espn":  jogo["fora_espn"],
            "estado":     jogo["estado"],
            "minuto":     jogo["minuto"],
            "golos_casa": jogo["golos_casa"],
            "golos_fora": jogo["golos_fora"],
            "hora_utc":   jogo["hora_utc"],
            "previsao":   prev,
            "apostas":    apostas,
            "fallback":   fallback,
        })

    resultados.sort(key=lambda r: (
        0 if r["estado"] == "in" else 1,
        r["hora_utc"] or datetime.max.replace(tzinfo=timezone.utc),
    ))
    return resultados
