#!/usr/bin/env python3
"""
Modelo de Previsão para Apostas Desportivas de Futebol
=======================================================
Baseado no modelo estatístico Dixon-Coles (1997) com cálculo de apostas de valor.

Uso:
    python main.py                                    # demo interactivo
    python main.py --casa "Arsenal" --fora "Chelsea"  # previsão directa
    python main.py --lista                            # listar equipas disponíveis
    python main.py --csv dados/meus_jogos.csv         # usar dados próprios
"""

import argparse
import sys

try:
    import numpy as np
    import pandas as pd
    from tabulate import tabulate
    from colorama import Fore, Style, init as colorama_init
except ImportError:
    print("A instalar dependências...")
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


# ---------------------------------------------------------------------------
# Display helpers
# ---------------------------------------------------------------------------

def _cor_prob(p: float) -> str:
    if p >= 0.55:
        return Fore.GREEN
    if p >= 0.35:
        return Fore.YELLOW
    return Fore.RED


def _cor_ev(ev: float) -> str:
    if ev >= 0.15:
        return Fore.GREEN + Style.BRIGHT
    if ev >= 0.07:
        return Fore.YELLOW
    return Fore.CYAN


def _barra(p: float, largura: int = 20) -> str:
    filled = round(p * largura)
    return "█" * filled + "░" * (largura - filled)


def imprimir_cabecalho():
    print()
    print(Fore.CYAN + Style.BRIGHT + "=" * 62)
    print(Fore.CYAN + Style.BRIGHT + "  MODELO DE APOSTAS DESPORTIVAS — FUTEBOL (Dixon-Coles)")
    print(Fore.CYAN + Style.BRIGHT + "=" * 62)
    print()


def imprimir_previsao(casa: str, fora: str, prev: dict):
    print()
    print(Fore.WHITE + Style.BRIGHT + f"  {casa}  vs  {fora}")
    print(Fore.WHITE + "  " + "-" * 44)

    linhas = [
        ("Vitória Casa",  prev["vitoria_casa"]),
        ("Empate",        prev["empate"]),
        ("Vitória Fora",  prev["vitoria_fora"]),
    ]
    for nome, p in linhas:
        cor = _cor_prob(p)
        barra = _barra(p)
        print(f"  {cor}{nome:<14}{p:>6.1%}  {barra}")

    print()
    print(Fore.WHITE + "  Mercados Adicionais")
    print(Fore.WHITE + "  " + "-" * 44)
    mkt = [
        ("Over 2.5 Golos",  prev["over_25"]),
        ("Under 2.5 Golos", prev["under_25"]),
        ("Ambas Marcam",    prev["ambas_marcam"]),
        ("Não Ambas Marc.", prev["nao_ambas"]),
    ]
    for nome, p in mkt:
        cor = _cor_prob(p)
        barra = _barra(p)
        print(f"  {cor}{nome:<18}{p:>6.1%}  {barra}")

    print()
    eg_c = prev["golos_esp_casa"]
    eg_f = prev["golos_esp_fora"]
    print(f"  {Fore.WHITE}Golos Esperados:  {Fore.YELLOW}{eg_c:.2f} – {eg_f:.2f}")

    print()
    print(Fore.WHITE + "  Placares Mais Prováveis")
    print(Fore.WHITE + "  " + "-" * 44)
    tabela = [(s["placar"], f"{s['prob']:.1%}") for s in prev["placares_prov"]]
    print(tabulate(tabela, headers=["Placar", "Prob"], tablefmt="simple",
                   colalign=("center", "right")))


def imprimir_apostas_valor(apostas, bankroll: float):
    if not apostas:
        print()
        print(Fore.YELLOW + "  Nenhuma aposta de valor encontrada com as odds fornecidas.")
        return

    print()
    print(Fore.GREEN + Style.BRIGHT + "  *** APOSTAS DE VALOR DETECTADAS ***")
    print(Fore.WHITE + "  " + "-" * 62)

    for a in apostas:
        cor_ev = _cor_ev(a.valor_esperado)
        stake  = stake_recomendado(bankroll, a.kelly_fraction)
        print()
        print(f"  {Fore.WHITE}{a.mercado}")
        print(f"    Classificação     : {cor_ev}{a.classificacao}")
        print(f"    Probabilidade Mod.: {Fore.CYAN}{a.prob_modelo:.1%}")
        print(f"    Prob. Implícita   : {Fore.RED}{a.prob_implícita:.1%}")
        print(f"    Odd               : {Fore.WHITE}{a.odd:.2f}")
        print(f"    Valor Esperado    : {cor_ev}+{a.valor_esperado:.1%}")
        print(f"    Kelly (¼)         : {Fore.YELLOW}{a.kelly_fraction:.1%} do bankroll")
        if bankroll > 0:
            print(f"    Stake Recomendado : {Fore.YELLOW}€{stake:.2f}")


def imprimir_forcas(modelo: DixonColesModel):
    df = modelo.team_strengths()
    print()
    print(Fore.CYAN + Style.BRIGHT + "  FORÇAS DAS EQUIPAS (Ataque / Defesa)")
    print(Fore.WHITE + "  " + "-" * 50)
    print(tabulate(
        df.head(16).values,
        headers=["Equipa", "Ataque", "Defesa"],
        tablefmt="simple",
        floatfmt=".3f",
    ))


# ---------------------------------------------------------------------------
# Mode: demo interactivo
# ---------------------------------------------------------------------------

def modo_demo(modelo: DixonColesModel):
    """Walk the user through a complete analysis interactively."""
    imprimir_forcas(modelo)
    print()
    print(Fore.CYAN + "  Equipas disponíveis:")
    print("  " + ", ".join(modelo.teams_))

    print()
    casa = input(Fore.WHITE + "  Equipa da CASA  > ").strip()
    fora = input(Fore.WHITE + "  Equipa de FORA  > ").strip()

    try:
        prev = modelo.predict(casa, fora)
    except ValueError as e:
        print(Fore.RED + f"\n  Erro: {e}")
        return

    imprimir_previsao(casa, fora, prev)

    print()
    print(Fore.WHITE + "  Introduza as odds do seu site de apostas")
    print(Fore.WHITE + "  (deixe em branco para ignorar o mercado)")

    def _ler_odd(prompt):
        v = input(Fore.YELLOW + f"    {prompt} > ").strip()
        try:
            return float(v.replace(",", ".")) if v else None
        except ValueError:
            return None

    odds_casa    = _ler_odd("Odd Vitória Casa")
    odds_empate  = _ler_odd("Odd Empate     ")
    odds_fora    = _ler_odd("Odd Vitória Fora")
    odds_over    = _ler_odd("Odd Over 2.5    ")
    odds_under   = _ler_odd("Odd Under 2.5   ")
    odds_btts_s  = _ler_odd("Odd Ambas Marcam")
    odds_btts_n  = _ler_odd("Odd Não Ambas   ")

    if all(o is None for o in [odds_casa, odds_empate, odds_fora]):
        print(Fore.YELLOW + "\n  Nenhuma odd introduzida — análise de valor ignorada.")
        return

    bankroll_str = input(Fore.WHITE + "\n  Bankroll disponível (€) [padrão: 1000] > ").strip()
    try:
        bankroll = float(bankroll_str.replace(",", ".")) if bankroll_str else 1000.0
    except ValueError:
        bankroll = 1000.0

    apostas = analisar_mercados(
        prev,
        odds_casa=odds_casa or 0,
        odds_empate=odds_empate or 0,
        odds_fora=odds_fora or 0,
        odds_over=odds_over,
        odds_under=odds_under,
        odds_btts_sim=odds_btts_s,
        odds_btts_nao=odds_btts_n,
    )
    imprimir_apostas_valor(apostas, bankroll)
    print()


# ---------------------------------------------------------------------------
# Mode: argparse directo
# ---------------------------------------------------------------------------

def modo_directo(args, modelo: DixonColesModel):
    if args.lista:
        print("\n  Equipas disponíveis:\n")
        for t in modelo.teams_:
            print(f"    {t}")
        print()
        return

    if args.forcas:
        imprimir_forcas(modelo)
        print()
        return

    casa = args.casa
    fora = args.fora
    if not casa or not fora:
        print(Fore.RED + "\n  Use --casa e --fora para especificar as equipas.")
        print("  Ou corra sem argumentos para o modo interactivo.\n")
        return

    try:
        prev = modelo.predict(casa, fora)
    except ValueError as e:
        print(Fore.RED + f"\n  Erro: {e}\n")
        return

    imprimir_previsao(casa, fora, prev)

    # Build apostas if any odds supplied
    if any([args.o1, args.ox, args.o2, args.over, args.under]):
        apostas = analisar_mercados(
            prev,
            odds_casa=args.o1 or 0,
            odds_empate=args.ox or 0,
            odds_fora=args.o2 or 0,
            odds_over=args.over,
            odds_under=args.under,
        )
        imprimir_apostas_valor(apostas, args.bankroll)
    print()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Modelo de apostas desportivas de futebol (Dixon-Coles)"
    )
    parser.add_argument("--csv",      help="Caminho para CSV com histórico de jogos")
    parser.add_argument("--casa",     help="Equipa da casa")
    parser.add_argument("--fora",     help="Equipa de fora")
    parser.add_argument("--o1",       type=float, help="Odd vitória casa")
    parser.add_argument("--ox",       type=float, help="Odd empate")
    parser.add_argument("--o2",       type=float, help="Odd vitória fora")
    parser.add_argument("--over",     type=float, help="Odd Over 2.5")
    parser.add_argument("--under",    type=float, help="Odd Under 2.5")
    parser.add_argument("--bankroll", type=float, default=1000.0, help="Bankroll em euros")
    parser.add_argument("--lista",    action="store_true", help="Listar equipas disponíveis")
    parser.add_argument("--forcas",   action="store_true", help="Mostrar forças das equipas")
    args = parser.parse_args()

    imprimir_cabecalho()

    # Load data
    print(Fore.WHITE + "  A carregar dados históricos...", end="", flush=True)
    if args.csv:
        df = DataLoader.carregar_csv(args.csv)
    else:
        df = DataLoader.carregar_dados_exemplo()
    print(Fore.GREEN + f" {len(df)} jogos carregados.")

    # Train model
    print(Fore.WHITE + "  A treinar modelo Dixon-Coles...", end="", flush=True)
    modelo = DixonColesModel(xi=0.0018)
    modelo.fit(df)
    print(Fore.GREEN + f" OK — {len(modelo.teams_)} equipas.")

    # Route
    interactive = not any([args.casa, args.fora, args.lista, args.forcas])
    if interactive:
        modo_demo(modelo)
    else:
        modo_directo(args, modelo)


if __name__ == "__main__":
    main()
