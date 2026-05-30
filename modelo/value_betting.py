"""
Value betting and stake sizing utilities.

Value bet:  our probability > bookmaker's implied probability
Kelly stake: fraction of bankroll that maximises log-growth.
"""

from dataclasses import dataclass


@dataclass
class ApuestaValor:
    mercado: str
    prob_modelo: float
    prob_implícita: float
    odd: float
    valor_esperado: float
    kelly_fraction: float
    classificacao: str  # "Alta" | "Media" | "Baixa"


def prob_implicita(odd: float) -> float:
    """Convert decimal odd to implied probability (removes overround effect)."""
    return 1.0 / odd


def valor_esperado(prob: float, odd: float) -> float:
    """Expected value per unit staked (+EV = profitable long-term)."""
    return prob * odd - 1.0


def kelly(prob: float, odd: float, fracao: float = 0.25) -> float:
    """
    Fractional Kelly criterion stake as proportion of bankroll.
    fracao=0.25 => quarter-Kelly (safer, less variance).
    """
    b = odd - 1.0
    k = (b * prob - (1.0 - prob)) / b
    return max(0.0, k * fracao)


def _classificar_valor(ev: float) -> str:
    if ev >= 0.15:
        return "Alta"
    if ev >= 0.07:
        return "Media"
    return "Baixa"


def analisar_mercados(
    previsao: dict,
    odds_casa: float,
    odds_empate: float,
    odds_fora: float,
    odds_over: float | None = None,
    odds_under: float | None = None,
    odds_btts_sim: float | None = None,
    odds_btts_nao: float | None = None,
    limiar_ev: float = 0.04,
) -> list[ApuestaValor]:
    """
    Compare model probabilities against bookmaker odds and return value bets.

    Parameters
    ----------
    previsao       : output de DixonColesModel.predict()
    odds_*         : bookmaker decimal odds (None => market not available)
    limiar_ev      : minimum expected value to flag as a value bet (default 4 %)
    """
    mercados = [
        ("Vitória Casa",  previsao["vitoria_casa"],  odds_casa),
        ("Empate",        previsao["empate"],         odds_empate),
        ("Vitória Fora",  previsao["vitoria_fora"],  odds_fora),
    ]
    if odds_over is not None:
        mercados.append(("Over 2.5",     previsao["over_25"],    odds_over))
    if odds_under is not None:
        mercados.append(("Under 2.5",    previsao["under_25"],   odds_under))
    if odds_btts_sim is not None:
        mercados.append(("Ambas Marcam", previsao["ambas_marcam"], odds_btts_sim))
    if odds_btts_nao is not None:
        mercados.append(("Não Ambas",    previsao["nao_ambas"],  odds_btts_nao))

    apostas_valor = []
    for nome, prob_modelo, odd in mercados:
        if odd is None or odd <= 1.0:
            continue
        pi = prob_implicita(odd)
        ev = valor_esperado(prob_modelo, odd)
        if ev >= limiar_ev:
            apostas_valor.append(
                ApuestaValor(
                    mercado=nome,
                    prob_modelo=prob_modelo,
                    prob_implícita=pi,
                    odd=odd,
                    valor_esperado=ev,
                    kelly_fraction=kelly(prob_modelo, odd),
                    classificacao=_classificar_valor(ev),
                )
            )

    # Sort best EV first
    apostas_valor.sort(key=lambda a: a.valor_esperado, reverse=True)
    return apostas_valor


def stake_recomendado(bankroll: float, kelly_fraction: float) -> float:
    return bankroll * kelly_fraction
