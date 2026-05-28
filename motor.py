"""
Motor central do EdgeBet.
Treina os modelos e gera previsões + apostas de valor.
Partilhado entre main.py (CLI) e bot.py (Telegram).
"""

import os
import sys
import time
from datetime import datetime, timezone

from colorama import Fore, Style

from modelo.dixon_coles import DixonColesModel
from modelo.fetcher import carregar_dados_liga, fetch_todas_ligas, normalizar_jogo
from modelo.live import predict_com_fallback
from modelo.value_betting import analisar_mercados
from modelo.ligas import LIGAS

MIN_JOGOS = 80  # mínimo para modelo confiável


def treinar_todos(ligas: list[str] | None = None, verbose: bool = True) -> dict:
    """
    Descarrega dados e treina um DixonColesModel por liga.
    Retorna dict {fd_code: DixonColesModel | None}
    """
    codigos = ligas or list(LIGAS.keys())
    modelos = {}

    for fd_code in codigos:
        info = LIGAS[fd_code]
        if verbose:
            print(f"  {info['emoji']}  {info['nome']:<20}", end="", flush=True)

        df = carregar_dados_liga(fd_code, n_temporadas=2)
        if df.empty or len(df) < MIN_JOGOS:
            if verbose:
                print(Fore.YELLOW + f" {len(df)} jogos — poucos dados, a ignorar.")
            modelos[fd_code] = None
            continue

        modelo = DixonColesModel(xi=0.0018)
        modelo.fit(df)
        modelos[fd_code] = modelo
        if verbose:
            print(Fore.GREEN + f" ✓  {len(df)} jogos, {len(modelo.teams_)} equipas")

    return modelos


def analisar_dia(
    modelos: dict,
    data_str: str | None = None,
    limiar_ev: float = 0.05,
    bankroll: float = 1000.0,
) -> list[dict]:
    """
    Obtém os jogos de hoje (ou data_str=YYYYMMDD) e gera previsões para todos.
    Retorna lista de resultados ordenada por estado (live primeiro) e hora.
    """
    jogos_raw = fetch_todas_ligas(data_str)
    resultados = []

    for jogo in jogos_raw:
        jogo_norm = normalizar_jogo(jogo, modelos)
        if jogo_norm is None:
            continue  # não conseguiu normalizar o nome da equipa

        modelo = modelos.get(jogo["fd_code"])
        if modelo is None:
            continue

        try:
            prev, fallback = predict_com_fallback(
                modelo,
                jogo_norm["casa"],
                jogo_norm["fora"],
                jogo["golos_casa"],
                jogo["golos_fora"],
                jogo["minuto"],
            )
        except Exception:
            continue

        # Apostas de valor (só se houver odds da ESPN)
        odds = jogo["odds"]
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
            "fd_code":    jogo["fd_code"],
            "liga":       jogo["liga"],
            "emoji":      jogo["emoji"],
            "casa":       jogo_norm["casa"],
            "fora":       jogo_norm["fora"],
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

    # Live primeiro, depois por hora
    resultados.sort(key=lambda r: (
        0 if r["estado"] == "in" else 1,
        r["hora_utc"] or datetime.max.replace(tzinfo=timezone.utc),
    ))
    return resultados
