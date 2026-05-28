"""
League configuration and team name normalization.

Maps ESPN displayName → football-data.co.uk short name for all 6 major leagues.
"""

import difflib
from datetime import date

LIGAS = {
    "E0": {
        "nome": "Premier League",
        "pais": "Inglaterra",
        "espn_slug": "eng.1",
        "emoji": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        "temporadas": [],  # filled by get_season_codes()
    },
    "SP1": {
        "nome": "La Liga",
        "pais": "Espanha",
        "espn_slug": "esp.1",
        "emoji": "🇪🇸",
        "temporadas": [],
    },
    "I1": {
        "nome": "Serie A",
        "pais": "Itália",
        "espn_slug": "ita.1",
        "emoji": "🇮🇹",
        "temporadas": [],
    },
    "D1": {
        "nome": "Bundesliga",
        "pais": "Alemanha",
        "espn_slug": "ger.1",
        "emoji": "🇩🇪",
        "temporadas": [],
    },
    "F1": {
        "nome": "Ligue 1",
        "pais": "França",
        "espn_slug": "fra.1",
        "emoji": "🇫🇷",
        "temporadas": [],
    },
    "P1": {
        "nome": "Primeira Liga",
        "pais": "Portugal",
        "espn_slug": "por.1",
        "emoji": "🇵🇹",
        "temporadas": [],
    },
}

# ---------------------------------------------------------------------------
# Static ESPN displayName → football-data.co.uk short name
# ---------------------------------------------------------------------------
TEAM_NAME_MAP: dict[str, dict[str, str]] = {
    "E0": {
        "Arsenal": "Arsenal",
        "Chelsea": "Chelsea",
        "Liverpool": "Liverpool",
        "Everton": "Everton",
        "Fulham": "Fulham",
        "Brentford": "Brentford",
        "Burnley": "Burnley",
        "Bournemouth": "Bournemouth",
        "Brighton & Hove Albion": "Brighton",
        "Brighton and Hove Albion": "Brighton",
        "Crystal Palace": "Crystal Palace",
        "Leicester City": "Leicester",
        "Luton Town": "Luton",
        "Manchester City": "Man City",
        "Manchester United": "Man United",
        "Newcastle United": "Newcastle",
        "Nottingham Forest": "Nott'm Forest",
        "Sheffield United": "Sheffield United",
        "Tottenham Hotspur": "Tottenham",
        "West Ham United": "West Ham",
        "Wolverhampton Wanderers": "Wolves",
        "Aston Villa": "Aston Villa",
        "Ipswich Town": "Ipswich",
        "Southampton": "Southampton",
        "Sunderland": "Sunderland",
    },
    "SP1": {
        "Real Madrid": "Real Madrid",
        "FC Barcelona": "Barcelona",
        "Barcelona": "Barcelona",
        "Atlético de Madrid": "Ath Madrid",
        "Atletico de Madrid": "Ath Madrid",
        "Athletic Club": "Ath Bilbao",
        "Villarreal CF": "Villarreal",
        "Villarreal": "Villarreal",
        "Real Sociedad": "Sociedad",
        "Real Betis": "Betis",
        "Sevilla FC": "Sevilla",
        "Sevilla": "Sevilla",
        "Valencia CF": "Valencia",
        "Valencia": "Valencia",
        "Deportivo Alavés": "Alaves",
        "Alaves": "Alaves",
        "Rayo Vallecano": "Vallecano",
        "CD Leganés": "Leganes",
        "Leganes": "Leganes",
        "RCD Mallorca": "Mallorca",
        "Mallorca": "Mallorca",
        "Real Valladolid": "Valladolid",
        "Getafe CF": "Getafe",
        "Getafe": "Getafe",
        "UD Las Palmas": "Las Palmas",
        "Las Palmas": "Las Palmas",
        "CA Osasuna": "Osasuna",
        "Osasuna": "Osasuna",
        "Girona FC": "Girona",
        "Girona": "Girona",
        "Celta Vigo": "Celta",
        "Granada CF": "Granada",
        "Cadiz CF": "Cadiz",
        "Almeria": "Almeria",
        "Espanyol": "Espanol",
    },
    "I1": {
        "Juventus": "Juventus",
        "AC Milan": "Milan",
        "Inter Milan": "Inter",
        "Internazionale": "Inter",
        "AS Roma": "Roma",
        "Roma": "Roma",
        "SSC Napoli": "Napoli",
        "Napoli": "Napoli",
        "Lazio": "Lazio",
        "Atalanta": "Atalanta",
        "Fiorentina": "Fiorentina",
        "Torino": "Torino",
        "Bologna": "Bologna",
        "Udinese": "Udinese",
        "Cagliari": "Cagliari",
        "Lecce": "Lecce",
        "Genoa": "Genoa",
        "Hellas Verona": "Verona",
        "Verona": "Verona",
        "Monza": "Monza",
        "Frosinone": "Frosinone",
        "Salernitana": "Salernitana",
        "Empoli": "Empoli",
        "Sassuolo": "Sassuolo",
        "Venezia": "Venezia",
        "Como": "Como",
        "Parma": "Parma",
    },
    "D1": {
        "Bayern Munich": "Bayern Munich",
        "Borussia Dortmund": "Dortmund",
        "RB Leipzig": "RB Leipzig",
        "Bayer Leverkusen": "Leverkusen",
        "Eintracht Frankfurt": "Ein Frankfurt",
        "VfB Stuttgart": "Stuttgart",
        "SC Freiburg": "Freiburg",
        "Borussia Mönchengladbach": "M'gladbach",
        "Borussia Monchengladbach": "M'gladbach",
        "TSG Hoffenheim": "Hoffenheim",
        "Wolfsburg": "Wolfsburg",
        "Werder Bremen": "Werder Bremen",
        "FC Augsburg": "Augsburg",
        "Augsburg": "Augsburg",
        "FC Union Berlin": "Union Berlin",
        "Union Berlin": "Union Berlin",
        "VfL Bochum": "Bochum",
        "Bochum": "Bochum",
        "1. FC Heidenheim": "Heidenheim",
        "Heidenheim": "Heidenheim",
        "SV Darmstadt 98": "Darmstadt",
        "Darmstadt": "Darmstadt",
        "Mainz 05": "Mainz",
        "Mainz": "Mainz",
        "Cologne": "Koln",
        "1. FC Köln": "Koln",
        "FC Köln": "Koln",
        "Holstein Kiel": "Kiel",
        "St. Pauli": "St Pauli",
    },
    "F1": {
        "Paris Saint-Germain": "Paris SG",
        "PSG": "Paris SG",
        "Olympique de Marseille": "Marseille",
        "Marseille": "Marseille",
        "Lyon": "Lyon",
        "Olympique Lyonnais": "Lyon",
        "Monaco": "Monaco",
        "AS Monaco": "Monaco",
        "Lille": "Lille",
        "LOSC Lille": "Lille",
        "Rennes": "Rennes",
        "Stade Rennais": "Rennes",
        "Nice": "Nice",
        "OGC Nice": "Nice",
        "Lens": "Lens",
        "RC Lens": "Lens",
        "Strasbourg": "Strasbourg",
        "RC Strasbourg Alsace": "Strasbourg",
        "Nantes": "Nantes",
        "FC Nantes": "Nantes",
        "Montpellier": "Montpellier",
        "Reims": "Reims",
        "Stade de Reims": "Reims",
        "Brest": "Brest",
        "Stade Brestois": "Brest",
        "Metz": "Metz",
        "FC Metz": "Metz",
        "Le Havre": "Le Havre",
        "Toulouse": "Toulouse",
        "TFC Toulouse": "Toulouse",
        "Clermont Foot": "Clermont",
        "Lorient": "Lorient",
        "Auxerre": "Auxerre",
        "Saint-Etienne": "St Etienne",
        "Angers": "Angers",
    },
    "P1": {
        "SL Benfica": "Benfica",
        "Benfica": "Benfica",
        "FC Porto": "Porto",
        "Porto": "Porto",
        "Sporting CP": "Sp Lisbon",
        "Sporting": "Sp Lisbon",
        "SC Braga": "Braga",
        "Braga": "Braga",
        "Vitória SC": "Guimaraes",
        "Guimarães": "Guimaraes",
        "Famalicão": "Famalicao",
        "FC Famalicão": "Famalicao",
        "Casa Pia": "Casa Pia",
        "Rio Ave": "Rio Ave",
        "Gil Vicente": "Gil Vicente",
        "Boavista": "Boavista",
        "Moreirense": "Moreirense",
        "Arouca": "Arouca",
        "FC Arouca": "Arouca",
        "Estoril Praia": "Estoril",
        "Estoril": "Estoril",
        "FC Vizela": "Vizela",
        "Vizela": "Vizela",
        "Chaves": "Chaves",
        "GD Chaves": "Chaves",
        "Santa Clara": "Santa Clara",
        "Nacional": "Nacional",
        "Estrela Amadora": "Estrela",
        "AVS": "AVS",
    },
}


def get_season_codes(n: int = 2) -> list[str]:
    """Return last N season codes based on today's date. E.g. ['2526', '2425']."""
    today = date.today()
    year = today.year
    # Season starts in July/August
    if today.month >= 7:
        current_start = year
    else:
        current_start = year - 1
    codes = []
    for i in range(n):
        y = current_start - i
        codes.append(f"{y % 100:02d}{(y + 1) % 100:02d}")
    return codes


def normalizar_equipa(espn_name: str, fd_code: str, equipas_modelo: list[str]) -> str | None:
    """
    Map an ESPN team displayName to a football-data.co.uk short name.
    Returns None if no reliable match found.
    """
    # Layer 1: static map
    static = TEAM_NAME_MAP.get(fd_code, {}).get(espn_name)
    if static and static in equipas_modelo:
        return static

    if not equipas_modelo:
        return None

    # Layer 2: difflib on model's known team names
    matches = difflib.get_close_matches(espn_name, equipas_modelo, n=1, cutoff=0.55)
    if matches:
        return matches[0]

    # Also try against static map values (different ESPN spelling)
    all_espn = list(TEAM_NAME_MAP.get(fd_code, {}).keys())
    espn_matches = difflib.get_close_matches(espn_name, all_espn, n=1, cutoff=0.55)
    if espn_matches:
        mapped = TEAM_NAME_MAP[fd_code].get(espn_matches[0])
        if mapped and mapped in equipas_modelo:
            return mapped

    # Layer 3: token Jaccard similarity
    tokens_input = set(espn_name.lower().replace("-", " ").split())
    best_score = 0.0
    best_match = None
    for equipa in equipas_modelo:
        tokens_eq = set(equipa.lower().replace("-", " ").split())
        intersection = tokens_input & tokens_eq
        union = tokens_input | tokens_eq
        score = len(intersection) / len(union) if union else 0
        if score > best_score:
            best_score = score
            best_match = equipa
    if best_score >= 0.4:
        return best_match

    return None
