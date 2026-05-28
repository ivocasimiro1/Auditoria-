"""
Data loading utilities.

Supports:
  - CSV files in football-data.co.uk format
  - Built-in sample dataset (Premier League 2023/24 results)
"""

import io
import textwrap
import pandas as pd


# ---------------------------------------------------------------------------
# Sample data — realistic Premier League 2023/24 season subset (80 matches)
# ---------------------------------------------------------------------------
_SAMPLE_CSV = textwrap.dedent("""
home_team,away_team,home_goals,away_goals,date
Manchester City,Arsenal,2,0,2023-08-13
Liverpool,Chelsea,1,1,2023-08-13
Tottenham,Manchester United,2,0,2023-08-19
Newcastle,Aston Villa,5,1,2023-08-26
Arsenal,Manchester United,3,1,2023-09-03
Liverpool,Aston Villa,3,0,2023-09-03
Manchester City,Fulham,5,1,2023-09-02
Chelsea,Liverpool,1,2,2023-09-24
Tottenham,Liverpool,1,2,2023-09-30
Arsenal,Manchester City,1,0,2023-10-08
Newcastle,Arsenal,1,0,2023-11-04
Manchester United,Manchester City,0,3,2023-10-29
Aston Villa,Chelsea,4,2,2023-11-05
Liverpool,Brentford,3,0,2023-11-12
Manchester City,Liverpool,1,1,2023-11-25
Tottenham,Chelsea,1,4,2023-11-06
Arsenal,Brentford,2,1,2023-11-11
Manchester United,Everton,3,0,2023-11-26
Newcastle,Chelsea,4,1,2023-12-03
Manchester City,Tottenham,3,3,2023-12-03
Liverpool,Fulham,4,3,2023-12-03
Arsenal,Wolves,2,1,2023-12-02
Aston Villa,Manchester City,1,3,2023-12-06
Chelsea,Everton,2,0,2023-12-16
Manchester United,Chelsea,2,1,2023-12-06
Tottenham,Aston Villa,4,0,2023-12-10
Liverpool,Manchester City,1,1,2023-12-01
Arsenal,Luton,4,3,2023-12-13
Newcastle,Manchester City,3,2,2023-12-13
Manchester City,Crystal Palace,2,2,2023-12-16
Liverpool,Arsenal,1,1,2023-12-23
Chelsea,Fulham,2,1,2023-12-26
Aston Villa,Arsenal,1,1,2024-01-30
Tottenham,Manchester City,0,2,2024-01-14
Newcastle,Everton,3,1,2024-01-30
Arsenal,Fulham,2,1,2024-03-09
Liverpool,Nottingham Forest,1,0,2024-03-02
Manchester City,Manchester United,3,1,2024-03-03
Chelsea,Newcastle,3,2,2024-03-11
Tottenham,Aston Villa,1,4,2024-03-10
Arsenal,Brentford,2,1,2024-03-09
Liverpool,Tottenham,1,0,2024-03-31
Manchester City,Arsenal,0,0,2024-03-31
Chelsea,Burnley,4,2,2024-04-06
Aston Villa,Wolves,3,1,2024-04-06
Arsenal,Luton,2,0,2024-04-03
Manchester United,Liverpool,2,2,2024-04-07
Newcastle,Wolves,3,0,2024-04-02
Tottenham,Chelsea,4,4,2024-03-26
Liverpool,Brighton,2,1,2024-04-14
Manchester City,Luton,5,1,2024-04-13
Arsenal,Chelsea,5,0,2024-04-23
Aston Villa,Everton,3,0,2024-04-14
Newcastle,Tottenham,4,0,2024-04-13
Manchester United,Sheffield United,4,2,2024-04-24
Liverpool,Everton,2,0,2024-04-24
Chelsea,West Ham,5,0,2024-05-05
Tottenham,Sheffield United,5,0,2024-05-01
Manchester City,Wolves,5,1,2024-05-04
Arsenal,Bournemouth,3,0,2024-05-04
Aston Villa,Liverpool,3,3,2024-05-13
Chelsea,Bournemouth,2,1,2024-05-19
Liverpool,Wolves,2,0,2024-05-19
Manchester City,West Ham,3,1,2024-05-19
Arsenal,Everton,1,1,2024-05-19
Manchester United,Brighton,2,0,2024-05-19
Tottenham,Burnley,2,1,2024-05-19
Newcastle,Brentford,4,2,2024-05-19
Aston Villa,Brighton,1,2,2024-05-19
Brighton,Manchester City,0,2,2024-05-04
Wolves,Arsenal,2,1,2024-05-11
Fulham,Manchester City,0,4,2024-05-11
Brentford,Newcastle,2,4,2024-05-11
Sheffield United,Tottenham,0,3,2024-05-11
Everton,Liverpool,2,0,2024-05-11
Burnley,Aston Villa,1,2,2024-05-11
West Ham,Chelsea,0,2,2024-05-11
Luton,Manchester United,1,2,2024-05-11
Nottingham Forest,Chelsea,2,3,2024-02-17
Bournemouth,Arsenal,0,2,2024-03-30
Crystal Palace,Liverpool,1,1,2024-03-30
""").strip()


class DataLoader:
    """Load match data from CSV or use built-in sample."""

    @staticmethod
    def carregar_csv(caminho: str) -> pd.DataFrame:
        """
        Load CSV with columns: home_team, away_team, home_goals, away_goals[, date].
        Accepts football-data.co.uk format if columns are renamed accordingly.
        """
        df = pd.read_csv(caminho)
        df = DataLoader._normalizar(df)
        return df

    @staticmethod
    def carregar_dados_exemplo() -> pd.DataFrame:
        """Return built-in Premier League 2023/24 sample dataset."""
        df = pd.read_csv(io.StringIO(_SAMPLE_CSV))
        df = DataLoader._normalizar(df)
        return df

    @staticmethod
    def _normalizar(df: pd.DataFrame) -> pd.DataFrame:
        col_map = {
            # football-data.co.uk aliases
            "HomeTeam": "home_team",
            "AwayTeam": "away_team",
            "FTHG":     "home_goals",
            "FTAG":     "away_goals",
            "Date":     "date",
        }
        df = df.rename(columns=col_map)
        required = ["home_team", "away_team", "home_goals", "away_goals"]
        for col in required:
            if col not in df.columns:
                raise ValueError(f"Coluna obrigatória ausente: '{col}'")
        df["home_goals"] = pd.to_numeric(df["home_goals"], errors="coerce").fillna(0).astype(int)
        df["away_goals"] = pd.to_numeric(df["away_goals"], errors="coerce").fillna(0).astype(int)
        if "date" in df.columns:
            # Aceita tanto DD/MM/YYYY (football-data.co.uk) como YYYY-MM-DD
            df["date"] = pd.to_datetime(df["date"], dayfirst=True, errors="coerce")
        df = df.dropna(subset=required)
        return df.reset_index(drop=True)
