"""
In-play (live) match prediction.

Scales the full-game Poisson rates by the fraction of time remaining,
then computes probabilities for additional goals from the current score.
"""

import numpy as np
from scipy.stats import poisson

from .dixon_coles import DixonColesModel


def _remaining_fraction(minuto: int) -> float:
    """Fraction of match remaining. Caps at 90 min, minimum 3 min stoppage."""
    restantes = max(90 - minuto, 3)
    return restantes / 90.0


def predict_live(
    modelo: DixonColesModel,
    casa: str,
    fora: str,
    golos_casa: int,
    golos_fora: int,
    minuto: int,
    max_add: int = 8,
) -> dict:
    """
    In-play prediction from current score and minute.

    Returns the same dict structure as DixonColesModel.predict(),
    but probabilities reflect only the remaining time.
    """
    frac = _remaining_fraction(minuto)

    hi = modelo._team_idx.get(casa)
    ai = modelo._team_idx.get(fora)

    if hi is None or ai is None:
        raise ValueError(f"Equipa desconhecida: '{casa}' ou '{fora}'")

    lam_full, mu_full = modelo._lambda_mu(hi, ai)
    lam = lam_full * frac
    mu  = mu_full  * frac

    g = range(max_add + 1)
    p_home = poisson.pmf(list(g), lam)
    p_away = poisson.pmf(list(g), mu)

    vc = emp = vf = over = 0.0
    for dh, ph in enumerate(p_home):
        for da, pa in enumerate(p_away):
            p = ph * pa
            fh = golos_casa + dh
            fa = golos_fora + da
            if fh > fa:
                vc  += p
            elif fh == fa:
                emp += p
            else:
                vf  += p
            if fh + fa >= 3:
                over += p

    return {
        "vitoria_casa":   vc,
        "empate":         emp,
        "vitoria_fora":   vf,
        "over_25":        over,
        "under_25":       1.0 - over,
        "ambas_marcam":   float("nan"),  # not meaningful live
        "nao_ambas":      float("nan"),
        "golos_esp_casa": lam,
        "golos_esp_fora": mu,
        "placares_prov":  [],
        "minutos_restantes": max(90 - minuto, 3),
        "placar_atual":   f"{golos_casa}-{golos_fora}",
        "minuto":         minuto,
    }


def predict_com_fallback(
    modelo: DixonColesModel,
    casa: str,
    fora: str,
    golos_casa: int = 0,
    golos_fora: int = 0,
    minuto: int = 0,
) -> tuple[dict, bool]:
    """
    Wrapper that falls back to league-average parameters if either team is unknown.
    Returns (prediction_dict, is_fallback).
    """
    casa_ok = casa in modelo._team_idx
    fora_ok = fora in modelo._team_idx

    if casa_ok and fora_ok:
        if minuto > 0:
            return predict_live(modelo, casa, fora, golos_casa, golos_fora, minuto), False
        return modelo.predict(casa, fora), False

    # Fallback: use league-average attack/defence
    n = len(modelo.teams_)
    avg_atk = float(np.exp(modelo.params_[:n]).mean())
    avg_def = float(np.exp(modelo.params_[n : 2 * n]).mean())
    home_adv = float(np.exp(modelo.params_[-2]))

    atk_h = avg_atk if not casa_ok else float(np.exp(modelo.params_[modelo._team_idx[casa]]))
    def_h = avg_def if not casa_ok else float(np.exp(modelo.params_[n + modelo._team_idx[casa]]))
    atk_a = avg_atk if not fora_ok else float(np.exp(modelo.params_[modelo._team_idx[fora]]))
    def_a = avg_def if not fora_ok else float(np.exp(modelo.params_[n + modelo._team_idx[fora]]))

    lam_full = atk_h * def_a * home_adv
    mu_full  = atk_a * def_h

    frac = _remaining_fraction(minuto) if minuto > 0 else 1.0
    lam, mu = lam_full * frac, mu_full * frac

    from scipy.stats import poisson as _p
    max_g = 10
    g = range(max_g + 1)
    p_h = _p.pmf(list(g), lam)
    p_a = _p.pmf(list(g), mu)

    vc = emp = vf = over = 0.0
    for dh, ph in enumerate(p_h):
        for da, pa in enumerate(p_a):
            p = ph * pa
            fh = golos_casa + dh
            fa = golos_fora + da
            if fh > fa:   vc  += p
            elif fh == fa: emp += p
            else:          vf  += p
            if fh + fa >= 3: over += p

    result = {
        "vitoria_casa": vc, "empate": emp, "vitoria_fora": vf,
        "over_25": over, "under_25": 1.0 - over,
        "ambas_marcam": float("nan"), "nao_ambas": float("nan"),
        "golos_esp_casa": lam, "golos_esp_fora": mu,
        "placares_prov": [],
        "minutos_restantes": max(90 - minuto, 3) if minuto > 0 else 90,
        "placar_atual": f"{golos_casa}-{golos_fora}",
        "minuto": minuto,
    }
    return result, True
