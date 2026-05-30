"""
Dixon-Coles model for football match prediction.
Reference: Dixon & Coles (1997) - Modelling Association Football Scores
           and Inefficiencies in the Football Betting Market.
"""

import numpy as np
import pandas as pd
from scipy.stats import poisson
from scipy.optimize import minimize


class DixonColesModel:
    """
    Estimates attack/defence strength for each team via maximum likelihood.
    Includes home advantage and low-score correlation correction (rho).
    """

    def __init__(self, xi: float = 0.0018):
        # xi controls time-decay weight: higher => recent matches weighted more
        self.xi = xi
        self.params_: np.ndarray | None = None
        self.teams_: list[str] = []
        self._team_idx: dict[str, int] = {}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _tau(x: int, y: int, lam: float, mu: float, rho: float) -> float:
        """Dixon-Coles low-score dependency correction."""
        if x == 0 and y == 0:
            return 1.0 - lam * mu * rho
        if x == 0 and y == 1:
            return 1.0 + lam * rho
        if x == 1 and y == 0:
            return 1.0 + mu * rho
        if x == 1 and y == 1:
            return 1.0 - rho
        return 1.0

    def _lambda_mu(self, hi: int, ai: int) -> tuple[float, float]:
        n = len(self.teams_)
        attack  = np.exp(self.params_[:n])
        defence = np.exp(self.params_[n : 2 * n])
        home_adv = np.exp(self.params_[-2])
        lam = attack[hi] * defence[ai] * home_adv
        mu  = attack[ai] * defence[hi]
        return lam, mu

    def _neg_log_likelihood(
        self,
        params: np.ndarray,
        home_goals: np.ndarray,
        away_goals: np.ndarray,
        home_idx: np.ndarray,
        away_idx: np.ndarray,
        weights: np.ndarray,
    ) -> float:
        n = len(self.teams_)
        attack   = np.exp(params[:n])
        defence  = np.exp(params[n : 2 * n])
        home_adv = np.exp(params[-2])
        rho      = params[-1]

        total = 0.0
        for k in range(len(home_goals)):
            hi, ai = home_idx[k], away_idx[k]
            hg, ag = home_goals[k], away_goals[k]
            lam = attack[hi] * defence[ai] * home_adv
            mu  = attack[ai] * defence[hi]
            tau = self._tau(hg, ag, lam, mu, rho)
            if tau <= 0:
                return 1e10
            total += weights[k] * (
                np.log(tau)
                + poisson.logpmf(hg, lam)
                + poisson.logpmf(ag, mu)
            )
        return -total

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fit(self, df: pd.DataFrame) -> "DixonColesModel":
        """
        Train on historical matches.

        df must have columns: home_team, away_team, home_goals, away_goals
        Optionally: date (datetime) — enables time-decay weighting.
        """
        all_teams = pd.concat([df["home_team"], df["away_team"]]).unique()
        self.teams_ = sorted(all_teams.tolist())
        self._team_idx = {t: i for i, t in enumerate(self.teams_)}
        n = len(self.teams_)

        hi = df["home_team"].map(self._team_idx).values
        ai = df["away_team"].map(self._team_idx).values
        hg = df["home_goals"].values.astype(int)
        ag = df["away_goals"].values.astype(int)

        if "date" in df.columns:
            days_ago = (pd.Timestamp.now() - pd.to_datetime(df["date"])).dt.days.values
            weights = np.exp(-self.xi * days_ago)
        else:
            weights = np.ones(len(df))

        x0 = np.zeros(2 * n + 2)
        x0[-1] = 0.1  # rho seed

        result = minimize(
            self._neg_log_likelihood,
            x0,
            args=(hg, ag, hi, ai, weights),
            method="L-BFGS-B",
            options={"maxiter": 1000, "ftol": 1e-9},
        )
        self.params_ = result.x
        return self

    def _check_team(self, team: str) -> None:
        if team not in self._team_idx:
            raise ValueError(
                f"Equipa '{team}' desconhecida. "
                f"Equipas disponíveis: {self.teams_}"
            )

    def score_matrix(self, home: str, away: str, max_goals: int = 10) -> np.ndarray:
        """Probability matrix P[home_goals, away_goals]."""
        self._check_team(home)
        self._check_team(away)
        hi = self._team_idx[home]
        ai = self._team_idx[away]
        lam, mu = self._lambda_mu(hi, ai)
        rho = self.params_[-1]

        g = range(max_goals + 1)
        matrix = np.outer(poisson.pmf(list(g), lam), poisson.pmf(list(g), mu))

        # Dixon-Coles low-score correction
        for x in range(2):
            for y in range(2):
                matrix[x, y] *= self._tau(x, y, lam, mu, rho)

        matrix /= matrix.sum()
        return matrix

    def predict(self, home: str, away: str) -> dict:
        """Return full probability breakdown for a match."""
        matrix = self.score_matrix(home, away)
        n = matrix.shape[0]

        home_win = float(np.sum(np.tril(matrix, -1)))
        draw     = float(np.sum(np.diag(matrix)))
        away_win = float(np.sum(np.triu(matrix, 1)))

        over_25 = btts = 0.0
        for i in range(n):
            for j in range(n):
                if i + j >= 3:
                    over_25 += matrix[i, j]
                if i >= 1 and j >= 1:
                    btts += matrix[i, j]

        # Expected goals
        g = np.arange(n)
        exp_home = float(g @ matrix.sum(axis=1))
        exp_away = float(g @ matrix.sum(axis=0))

        # Top 5 most likely scorelines
        flat = matrix.flatten()
        top_idx = np.argsort(flat)[::-1][:5]
        top_scores = []
        for idx in top_idx:
            hg, ag = divmod(int(idx), n)
            top_scores.append({"placar": f"{hg}-{ag}", "prob": float(matrix[hg, ag])})

        return {
            "vitoria_casa":   home_win,
            "empate":         draw,
            "vitoria_fora":   away_win,
            "over_25":        float(over_25),
            "under_25":       float(1 - over_25),
            "ambas_marcam":   float(btts),
            "nao_ambas":      float(1 - btts),
            "golos_esp_casa": exp_home,
            "golos_esp_fora": exp_away,
            "placares_prov":  top_scores,
        }

    def team_strengths(self) -> pd.DataFrame:
        """Return estimated attack/defence parameters per team."""
        n = len(self.teams_)
        attack  = np.exp(self.params_[:n])
        defence = np.exp(self.params_[n : 2 * n])
        return pd.DataFrame(
            {"equipa": self.teams_, "ataque": attack, "defesa": defence}
        ).sort_values("ataque", ascending=False).reset_index(drop=True)
