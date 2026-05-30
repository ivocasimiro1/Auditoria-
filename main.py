#!/usr/bin/env python3
"""
EdgeBet — CLI de Apostas Desportivas de Futebol
================================================
Modos de utilização:

  python main.py                          # demo interactivo (dados de exemplo)
  python main.py --auto                   # descarregar dados online + prever hoje
  python main.py --live                   # monitorizar jogos em directo (refresh 60s)
  python main.py --liga E0                # só Premier League
  python main.py --casa Arsenal --fora Chelsea  # jogo específico
  python main.py --lista                  # listar equipas disponíveis
  python main.py --forcas                 # mostrar forças das equipas
  python main.py --csv dados/jogos.csv   # usar CSV próprio
"""

import argparse
import os
import sys
import time

try:
    import numpy as np
    import pandas as pd
    from tabulate import tabulate
    from colorama import Fore, Style, init as colorama_init
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install",
                           "numpy", "pandas", "scipy", "scikit-learn",
                           "tabulate", "colorama"], capture_output=True)
    import numpy as np
    import pandas as pd
    from tabulate import tabulate
    from colorama import Fore, Style, init as colorama_init

colorama_init(autoreset=True)

from modelo.dixon_coles import DixonColesModel
from modelo.value_betting import analisar_mercados, stake_recomendado
from modelo.data import DataLoader
from modelo.ligas import LIGAS, normalizar_equipa
from modelo.live import predict_com_fallback
from motor import treinar_todos, analisar_dia


# ---------------------------------------------------------------------------
# Formatação CLI
# ---------------------------------------------------------------------------

def _barra(p: float, n: int = 20) -> str:
    filled = round(p * n)
    return "█" * filled + "░" * (n - filled)


def _cor_prob(p: float) -> str:
    if p >= 0.55: return Fore.GREEN
    if p >= 0.35: return Fore.YELLOW
    return Fore.RED


def _cor_ev(ev: float) -> str:
    if ev >= 0.15: return Fore.GREEN + Style.BRIGHT
    if ev >= 0.07: return Fore.YELLOW
    return Fore.CYAN


def imprimir_cabecalho():
    print()
    print(Fore.CYAN + Style.BRIGHT + "=" * 62)
    print(Fore.CYAN + Style.BRIGHT + "  EdgeBet — Apostas Desportivas de Futebol (Dixon-Coles)")
    print(Fore.CYAN + Style.BRIGHT + "=" * 62)
    print()


def imprimir_resultado(r: dict, bankroll: float):
    p = r["previsao"]
    vc, emp, vf = p["vitoria_casa"], p["empate"], p["vitoria_fora"]

    estado = r["estado"]
    if estado == "in":
        gc, gf = r["golos_casa"], r["golos_fora"]
        print(Fore.RED + Style.BRIGHT + f"  🔴 LIVE {r['minuto']}'  {r['casa_espn']} {gc}–{gf} {r['fora_espn']}")
    else:
        hora = r.get("hora_utc")
        hora_str = hora.strftime("%H:%M UTC") if hora else ""
        print(Fore.WHITE + Style.BRIGHT + f"  {r['emoji']} {r['liga']}  |  {hora_str}  {r['casa_espn']} vs {r['fora_espn']}")

    if r.get("fallback"):
        print(Fore.YELLOW + "  ⚠  Equipa nova — previsão com média da liga")

    print(Fore.WHITE + "  " + "-" * 50)

    for nome, prob in [("Vitória Casa", vc), ("Empate", emp), ("Vitória Fora", vf)]:
        cor = _cor_prob(prob)
        print(f"  {cor}{nome:<14}{prob:>6.1%}  {_barra(prob, 18)}")

    print()
    for nome, prob in [
        ("Over 2.5",    p["over_25"]),
        ("Under 2.5",   p["under_25"]),
    ]:
        cor = _cor_prob(prob)
        print(f"  {cor}{nome:<18}{prob:>6.1%}  {_barra(prob, 14)}")

    print(f"\n  {Fore.WHITE}Golos esperados: {Fore.YELLOW}{p['golos_esp_casa']:.2f} – {p['golos_esp_fora']:.2f}")

    if p.get("placares_prov"):
        print()
        print(Fore.WHITE + "  Placares Mais Prováveis")
        print(Fore.WHITE + "  " + "-" * 30)
        rows = [(s["placar"], f"{s['prob']:.1%}") for s in p["placares_prov"]]
        print(tabulate(rows, headers=["Placar", "Prob"],
                       tablefmt="simple", colalign=("center", "right")))

    if r.get("apostas"):
        print()
        print(Fore.GREEN + Style.BRIGHT + "  🎯 APOSTAS DE VALOR")
        print(Fore.WHITE + "  " + "-" * 50)
        for a in r["apostas"]:
            cor = _cor_ev(a.valor_esperado)
            stake = bankroll * a.kelly_fraction
            print(f"\n  {Fore.WHITE}{a.mercado}")
            print(f"    Classificação : {cor}{a.classificacao}")
            print(f"    Prob. Modelo  : {Fore.CYAN}{a.prob_modelo:.1%}")
            print(f"    Prob. Implíc. : {Fore.RED}{a.prob_implícita:.1%}")
            print(f"    Odd           : {Fore.WHITE}{a.odd:.2f}")
            print(f"    Valor Esperado: {cor}+{a.valor_esperado:.1%}")
            print(f"    Stake Kelly   : {Fore.YELLOW}€{stake:.0f}")
    print()


def imprimir_resumo_dia(resultados: list[dict]):
    if not resultados:
        print(Fore.YELLOW + "  Nenhum jogo encontrado para hoje.")
        return

    live = [r for r in resultados if r["estado"] == "in"]
    pre  = [r for r in resultados if r["estado"] == "pre"]

    if live:
        print(Fore.RED + Style.BRIGHT + f"  🔴 {len(live)} jogo(s) em directo agora\n")

    linhas = []
    for r in resultados:
        p = r["previsao"]
        estado_str = f"LIVE {r['minuto']}'" if r["estado"] == "in" else (
            r["hora_utc"].strftime("%H:%M") if r.get("hora_utc") else "")
        val = "🎯" if r["apostas"] else "  "
        linhas.append([
            f"{r['emoji']} {r['liga'][:12]}",
            estado_str,
            f"{r['casa_espn'][:18]} vs {r['fora_espn'][:18]}",
            f"{p['vitoria_casa']:.0%} | {p['empate']:.0%} | {p['vitoria_fora']:.0%}",
            val,
        ])
    print(tabulate(linhas,
                   headers=["Liga", "Hora", "Jogo", "Casa | Emp | Fora", "Val"],
                   tablefmt="simple"))
    print()


# ---------------------------------------------------------------------------
# Modos principais
# ---------------------------------------------------------------------------

def modo_auto(args):
    """Descarrega dados reais online e analisa todos os jogos de hoje."""
    print(Fore.WHITE + "  A descarregar dados e treinar modelos...\n")
    ligas = [args.liga] if args.liga else None
    modelos = treinar_todos(ligas=ligas, verbose=True)

    print()
    print(Fore.WHITE + "  A obter jogos de hoje via ESPN API...")
    resultados = analisar_dia(modelos, limiar_ev=args.limiar_ev, bankroll=args.bankroll)

    if not resultados:
        print(Fore.YELLOW + "\n  Nenhum jogo encontrado hoje nas ligas disponíveis.")
        return

    print()
    imprimir_resumo_dia(resultados)

    tem_valor = [r for r in resultados if r["apostas"]]
    if tem_valor:
        print(Fore.GREEN + Style.BRIGHT + f"  {len(tem_valor)} jogo(s) com apostas de valor:\n")
        for r in tem_valor:
            imprimir_resultado(r, args.bankroll)
    else:
        print(Fore.YELLOW + "  Sem apostas de valor detectadas com as odds disponíveis.")


def modo_live(args):
    """Monitoriza jogos em directo com refresh automático."""
    ligas = [args.liga] if args.liga else None
    modelos = treinar_todos(ligas=ligas, verbose=True)

    intervalo = getattr(args, "intervalo", 60)
    print(Fore.CYAN + f"\n  Monitorização live (refresh cada {intervalo}s) — Ctrl+C para parar\n")

    try:
        while True:
            if os.name == "posix":
                os.system("clear")
            imprimir_cabecalho()
            print(Fore.WHITE + f"  Actualizado: {__import__('datetime').datetime.now().strftime('%H:%M:%S')}\n")

            resultados = analisar_dia(modelos, limiar_ev=args.limiar_ev, bankroll=args.bankroll)
            live = [r for r in resultados if r["estado"] == "in"]

            if not live:
                print(Fore.YELLOW + "  Nenhum jogo em directo agora.")
            else:
                for r in live:
                    imprimir_resultado(r, args.bankroll)

            time.sleep(intervalo)
    except KeyboardInterrupt:
        print(Fore.CYAN + "\n\n  Monitorização encerrada.")


def modo_manual(args, modelo: DixonColesModel):
    """Previsão de jogo específico (modo original com dados de exemplo)."""
    if args.lista:
        print(Fore.CYAN + "\n  Equipas disponíveis:\n")
        for t in modelo.teams_:
            print(f"    {t}")
        print()
        return

    if args.forcas:
        df = modelo.team_strengths()
        print()
        print(Fore.CYAN + Style.BRIGHT + "  Forças das Equipas")
        print(Fore.WHITE + "  " + "-" * 40)
        print(tabulate(df.head(20).values,
                       headers=["Equipa", "Ataque", "Defesa"],
                       tablefmt="simple", floatfmt=".3f"))
        print()
        return

    casa, fora = args.casa, args.fora
    if not casa or not fora:
        print(Fore.RED + "\n  Usa --casa e --fora ou corre sem argumentos para o modo interactivo.\n")
        return

    try:
        prev, _ = predict_com_fallback(modelo, casa, fora)
    except ValueError as e:
        print(Fore.RED + f"\n  Erro: {e}\n")
        return

    r = {
        "fd_code": "EX", "liga": "Exemplo", "emoji": "⚽",
        "casa": casa, "fora": fora,
        "casa_espn": casa, "fora_espn": fora,
        "estado": "pre", "minuto": 0,
        "golos_casa": 0, "golos_fora": 0,
        "hora_utc": None, "previsao": prev, "apostas": [], "fallback": False,
    }

    if any([args.o1, args.ox, args.o2, args.over, args.under]):
        from modelo.value_betting import analisar_mercados
        r["apostas"] = analisar_mercados(
            prev,
            odds_casa=args.o1 or 0,
            odds_empate=args.ox or 0,
            odds_fora=args.o2 or 0,
            odds_over=args.over,
            odds_under=args.under,
        )

    imprimir_resultado(r, args.bankroll)


def modo_interactivo(modelo: DixonColesModel):
    """Demo interactivo com dados de exemplo."""
    df = modelo.team_strengths()
    print(Fore.CYAN + "\n  Forças das Equipas\n")
    print(tabulate(df.head(16).values,
                   headers=["Equipa", "Ataque", "Defesa"],
                   tablefmt="simple", floatfmt=".3f"))
    print()
    print(Fore.CYAN + "  Equipas: " + ", ".join(modelo.teams_))
    print()
    casa = input(Fore.WHITE + "  Equipa da CASA  > ").strip()
    fora = input(Fore.WHITE + "  Equipa de FORA  > ").strip()

    try:
        prev, _ = predict_com_fallback(modelo, casa, fora)
    except ValueError as e:
        print(Fore.RED + f"\n  Erro: {e}\n")
        return

    r = {
        "fd_code": "EX", "liga": "Exemplo", "emoji": "⚽",
        "casa": casa, "fora": fora, "casa_espn": casa, "fora_espn": fora,
        "estado": "pre", "minuto": 0, "golos_casa": 0, "golos_fora": 0,
        "hora_utc": None, "previsao": prev, "apostas": [], "fallback": False,
    }

    print()
    print(Fore.WHITE + "  Odds do bookmaker (deixa em branco para ignorar):")
    def _ler(prompt):
        v = input(Fore.YELLOW + f"    {prompt} > ").strip()
        try:
            return float(v.replace(",", ".")) if v else None
        except ValueError:
            return None

    o1 = _ler("Odd Casa   ")
    ox = _ler("Odd Empate ")
    o2 = _ler("Odd Fora   ")
    ov = _ler("Odd Over2.5")
    un = _ler("Odd Under  ")

    if any(x is not None for x in [o1, ox, o2]):
        from modelo.value_betting import analisar_mercados
        r["apostas"] = analisar_mercados(
            prev,
            odds_casa=o1 or 0, odds_empate=ox or 0, odds_fora=o2 or 0,
            odds_over=ov, odds_under=un,
        )

    bk_str = input(Fore.WHITE + "\n  Bankroll (€) [1000] > ").strip()
    bankroll = float(bk_str.replace(",", ".")) if bk_str else 1000.0

    imprimir_resultado(r, bankroll)


# ---------------------------------------------------------------------------
# Ponto de entrada
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="EdgeBet — Apostas Desportivas de Futebol")
    parser.add_argument("--auto",       action="store_true", help="Descarregar dados online e analisar hoje")
    parser.add_argument("--live",       action="store_true", help="Monitorizar jogos em directo")
    parser.add_argument("--intervalo",  type=int, default=60, help="Segundos entre refreshes live")
    parser.add_argument("--liga",       help="Código da liga (E0, SP1, I1, D1, F1, P1)")
    parser.add_argument("--limiar-ev",  type=float, default=0.05, dest="limiar_ev",
                        help="EV mínimo para apostas de valor (padrão: 5%%)")
    parser.add_argument("--bankroll",   type=float, default=1000.0, help="Bankroll em euros")
    # Modo manual (dados de exemplo)
    parser.add_argument("--csv",        help="CSV com histórico de jogos")
    parser.add_argument("--casa",       help="Equipa da casa")
    parser.add_argument("--fora",       help="Equipa de fora")
    parser.add_argument("--o1",         type=float, help="Odd vitória casa")
    parser.add_argument("--ox",         type=float, help="Odd empate")
    parser.add_argument("--o2",         type=float, help="Odd vitória fora")
    parser.add_argument("--over",       type=float, help="Odd Over 2.5")
    parser.add_argument("--under",      type=float, help="Odd Under 2.5")
    parser.add_argument("--lista",      action="store_true", help="Listar equipas (modo manual)")
    parser.add_argument("--forcas",     action="store_true", help="Mostrar forças das equipas")
    args = parser.parse_args()

    imprimir_cabecalho()

    # Modos online
    if args.auto or args.live:
        if args.live:
            modo_live(args)
        else:
            modo_auto(args)
        return

    # Modos manuais (dados de exemplo ou CSV)
    print(Fore.WHITE + "  A carregar dados...", end="", flush=True)
    if args.csv:
        df = DataLoader.carregar_csv(args.csv)
    else:
        df = DataLoader.carregar_dados_exemplo()
    print(Fore.GREEN + f" {len(df)} jogos.")

    print(Fore.WHITE + "  A treinar modelo...", end="", flush=True)
    modelo = DixonColesModel(xi=0.0018).fit(df)
    print(Fore.GREEN + f" OK — {len(modelo.teams_)} equipas.\n")

    modo_interactivo_flag = not any([args.casa, args.fora, args.lista, args.forcas])
    if modo_interactivo_flag:
        modo_interactivo(modelo)
    else:
        modo_manual(args, modelo)


if __name__ == "__main__":
    main()
