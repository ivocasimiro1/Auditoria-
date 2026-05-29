"""
Configuração de ligas e normalização de nomes de equipas.
Inclui ligas nacionais, competições europeias, taças e seleções nacionais.
"""

import difflib
from datetime import date

# tipo "nacional"  → treina modelo com dados históricos (football-data.co.uk)
# tipo "europeia"  → só ESPN (previsão cross-liga)
# tipo "taca"      → só ESPN
# tipo "selecoes"  → só ESPN, sem modelo Dixon-Coles (seleções nacionais)

LIGAS = {
    # ── Ligas Nacionais Principais ─────────────────────────────────────────
    "E0":  {"nome": "Premier League",    "pais": "Inglaterra", "espn_slug": "eng.1",            "emoji": "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "tipo": "nacional"},
    "SP1": {"nome": "La Liga",           "pais": "Espanha",    "espn_slug": "esp.1",            "emoji": "🇪🇸", "tipo": "nacional"},
    "I1":  {"nome": "Serie A",           "pais": "Itália",     "espn_slug": "ita.1",            "emoji": "🇮🇹", "tipo": "nacional"},
    "D1":  {"nome": "Bundesliga",        "pais": "Alemanha",   "espn_slug": "ger.1",            "emoji": "🇩🇪", "tipo": "nacional"},
    "F1":  {"nome": "Ligue 1",           "pais": "França",     "espn_slug": "fra.1",            "emoji": "🇫🇷", "tipo": "nacional"},
    "P1":  {"nome": "Primeira Liga",     "pais": "Portugal",   "espn_slug": "por.1",            "emoji": "🇵🇹", "tipo": "nacional"},
    # ── Ligas Nacionais Secundárias ────────────────────────────────────────
    "N1":  {"nome": "Eredivisie",        "pais": "Holanda",    "espn_slug": "ned.1",            "emoji": "🇳🇱", "tipo": "nacional"},
    "B1":  {"nome": "Jupiler Pro League","pais": "Bélgica",    "espn_slug": "bel.1",            "emoji": "🇧🇪", "tipo": "nacional"},
    "SC0": {"nome": "Scottish Prem.",    "pais": "Escócia",    "espn_slug": "sco.premiership",  "emoji": "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "tipo": "nacional"},
    "T1":  {"nome": "Süper Lig",         "pais": "Turquia",    "espn_slug": "tur.1",            "emoji": "🇹🇷", "tipo": "nacional"},
    "G1":  {"nome": "Super League",      "pais": "Grécia",     "espn_slug": "gre.1",            "emoji": "🇬🇷", "tipo": "nacional"},
    # ── Competições Europeias (ESPN + cross-liga) ──────────────────────────
    "UCL": {"nome": "Champions League",  "pais": "Europa",     "espn_slug": "uefa.champions",   "emoji": "🏆", "tipo": "europeia"},
    "UEL": {"nome": "Europa League",     "pais": "Europa",     "espn_slug": "uefa.europa",      "emoji": "🥈", "tipo": "europeia"},
    "UCO": {"nome": "Conference League", "pais": "Europa",     "espn_slug": "uefa.europa.conf", "emoji": "🥉", "tipo": "europeia"},
    # ── Taças Nacionais ────────────────────────────────────────────────────
    "FAC": {"nome": "FA Cup",            "pais": "Inglaterra", "espn_slug": "eng.fa",           "emoji": "🏆🏴󠁧󠁢󠁥󠁮󠁧󠁿", "tipo": "taca"},
    "CDR": {"nome": "Copa del Rey",      "pais": "Espanha",    "espn_slug": "esp.copa_del_rey", "emoji": "🏆🇪🇸", "tipo": "taca"},
    "CIT": {"nome": "Coppa Italia",      "pais": "Itália",     "espn_slug": "ita.coppa_italia", "emoji": "🏆🇮🇹", "tipo": "taca"},
    "DFB": {"nome": "DFB Pokal",         "pais": "Alemanha",   "espn_slug": "ger.dfb_pokal",    "emoji": "🏆🇩🇪", "tipo": "taca"},
    "TCP": {"nome": "Taça de Portugal",  "pais": "Portugal",   "espn_slug": "por.cup",          "emoji": "🏆🇵🇹", "tipo": "taca"},
    # ── Seleções Nacionais ─────────────────────────────────────────────────
    "WCQ": {"nome": "Qualif. Mundial 2026 (UEFA)", "pais": "Europa",       "espn_slug": "fifa.worldq.uefa",     "emoji": "🌍🏆", "tipo": "selecoes"},
    "WCS": {"nome": "Qualif. Mundial 2026 (CONMEBOL)", "pais": "América",  "espn_slug": "fifa.worldq.conmebol", "emoji": "🌎🏆", "tipo": "selecoes"},
    "WCA": {"nome": "Qualif. Mundial 2026 (CONCACAF)", "pais": "América N","espn_slug": "fifa.worldq.concacaf", "emoji": "🌎🏆", "tipo": "selecoes"},
    "EUQ": {"nome": "Qualif. Euro 2028",           "pais": "Europa",       "espn_slug": "uefa.euro.qualifying", "emoji": "🇪🇺", "tipo": "selecoes"},
    "CAM": {"nome": "Copa América",                "pais": "América Sul",  "espn_slug": "conmebol.america",     "emoji": "🏆🌎", "tipo": "selecoes"},
    "UNL": {"nome": "Nations League",             "pais": "Europa",       "espn_slug": "uefa.nations",         "emoji": "🌍",  "tipo": "selecoes"},
    "GC":  {"nome": "Gold Cup (CONCACAF)",         "pais": "América N",    "espn_slug": "concacaf.gold",        "emoji": "🏆🌎", "tipo": "selecoes"},
    "ACN": {"nome": "CAN (Africa)",                "pais": "África",       "espn_slug": "caf.nations",          "emoji": "🌍🏆", "tipo": "selecoes"},
    # ── Amigáveis ──────────────────────────────────────────────────────────
    "AMI": {"nome": "Amigáveis Internacionais",    "pais": "Mundial",      "espn_slug": "fifa.friendly",        "emoji": "🤝",  "tipo": "selecoes"},
    "AMC": {"nome": "Amigáveis de Clubes",         "pais": "Mundial",      "espn_slug": "club.friendly",        "emoji": "🤝",  "tipo": "selecoes"},
}

# Ligas com dados históricos (football-data.co.uk)
LIGAS_NACIONAIS = {k: v for k, v in LIGAS.items() if v["tipo"] == "nacional"}
# Competições sem dados históricos próprios (cross-liga e seleções)
LIGAS_ESPN_ONLY = {k: v for k, v in LIGAS.items() if v["tipo"] in ("europeia", "taca", "selecoes")}

# ---------------------------------------------------------------------------
# Mapa ESPN → football-data.co.uk
# ---------------------------------------------------------------------------
TEAM_NAME_MAP: dict[str, dict[str, str]] = {
    "E0": {
        "Arsenal": "Arsenal", "Chelsea": "Chelsea", "Liverpool": "Liverpool",
        "Everton": "Everton", "Fulham": "Fulham", "Brentford": "Brentford",
        "Burnley": "Burnley", "Bournemouth": "Bournemouth",
        "Brighton & Hove Albion": "Brighton", "Brighton and Hove Albion": "Brighton",
        "Crystal Palace": "Crystal Palace", "Leicester City": "Leicester",
        "Luton Town": "Luton", "Manchester City": "Man City",
        "Manchester United": "Man United", "Newcastle United": "Newcastle",
        "Nottingham Forest": "Nott'm Forest", "Sheffield United": "Sheffield United",
        "Tottenham Hotspur": "Tottenham", "West Ham United": "West Ham",
        "Wolverhampton Wanderers": "Wolves", "Aston Villa": "Aston Villa",
        "Ipswich Town": "Ipswich", "Southampton": "Southampton",
        "Sunderland": "Sunderland",
    },
    "SP1": {
        "Real Madrid": "Real Madrid", "FC Barcelona": "Barcelona",
        "Barcelona": "Barcelona", "Atlético de Madrid": "Ath Madrid",
        "Atletico de Madrid": "Ath Madrid", "Athletic Club": "Ath Bilbao",
        "Villarreal CF": "Villarreal", "Villarreal": "Villarreal",
        "Real Sociedad": "Sociedad", "Real Betis": "Betis",
        "Sevilla FC": "Sevilla", "Sevilla": "Sevilla",
        "Valencia CF": "Valencia", "Valencia": "Valencia",
        "Deportivo Alavés": "Alaves", "Alaves": "Alaves",
        "Rayo Vallecano": "Vallecano", "CD Leganés": "Leganes",
        "RCD Mallorca": "Mallorca", "Getafe CF": "Getafe",
        "UD Las Palmas": "Las Palmas", "CA Osasuna": "Osasuna",
        "Girona FC": "Girona", "Celta Vigo": "Celta",
        "Granada CF": "Granada", "Espanyol": "Espanol",
        "Cadiz CF": "Cadiz", "Almeria": "Almeria",
    },
    "I1": {
        "Juventus": "Juventus", "AC Milan": "Milan",
        "Inter Milan": "Inter", "Internazionale": "Inter",
        "AS Roma": "Roma", "Roma": "Roma", "SSC Napoli": "Napoli",
        "Napoli": "Napoli", "Lazio": "Lazio", "Atalanta": "Atalanta",
        "Fiorentina": "Fiorentina", "Torino": "Torino",
        "Bologna": "Bologna", "Udinese": "Udinese", "Cagliari": "Cagliari",
        "Lecce": "Lecce", "Genoa": "Genoa", "Hellas Verona": "Verona",
        "Monza": "Monza", "Frosinone": "Frosinone",
        "Salernitana": "Salernitana", "Empoli": "Empoli",
        "Sassuolo": "Sassuolo", "Venezia": "Venezia",
        "Como": "Como", "Parma": "Parma",
    },
    "D1": {
        "Bayern Munich": "Bayern Munich", "Borussia Dortmund": "Dortmund",
        "RB Leipzig": "RB Leipzig", "Bayer Leverkusen": "Leverkusen",
        "Eintracht Frankfurt": "Ein Frankfurt", "VfB Stuttgart": "Stuttgart",
        "SC Freiburg": "Freiburg",
        "Borussia Mönchengladbach": "M'gladbach",
        "Borussia Monchengladbach": "M'gladbach",
        "TSG Hoffenheim": "Hoffenheim", "Wolfsburg": "Wolfsburg",
        "Werder Bremen": "Werder Bremen", "FC Augsburg": "Augsburg",
        "FC Union Berlin": "Union Berlin", "VfL Bochum": "Bochum",
        "1. FC Heidenheim": "Heidenheim", "SV Darmstadt 98": "Darmstadt",
        "Mainz 05": "Mainz", "Cologne": "Koln",
        "1. FC Köln": "Koln", "Holstein Kiel": "Kiel",
        "St. Pauli": "St Pauli",
    },
    "F1": {
        "Paris Saint-Germain": "Paris SG", "PSG": "Paris SG",
        "Olympique de Marseille": "Marseille", "Marseille": "Marseille",
        "Lyon": "Lyon", "Olympique Lyonnais": "Lyon",
        "Monaco": "Monaco", "AS Monaco": "Monaco",
        "Lille": "Lille", "LOSC Lille": "Lille",
        "Rennes": "Rennes", "Nice": "Nice", "OGC Nice": "Nice",
        "Lens": "Lens", "RC Lens": "Lens",
        "Strasbourg": "Strasbourg", "Nantes": "Nantes",
        "Montpellier": "Montpellier", "Reims": "Reims",
        "Brest": "Brest", "Metz": "Metz", "Le Havre": "Le Havre",
        "Toulouse": "Toulouse", "Clermont Foot": "Clermont",
        "Lorient": "Lorient", "Auxerre": "Auxerre",
        "Saint-Etienne": "St Etienne", "Angers": "Angers",
    },
    "P1": {
        "SL Benfica": "Benfica", "Benfica": "Benfica",
        "FC Porto": "Porto", "Porto": "Porto",
        "Sporting CP": "Sp Lisbon", "Sporting": "Sp Lisbon",
        "SC Braga": "Braga", "Braga": "Braga",
        "Vitória SC": "Guimaraes", "Guimarães": "Guimaraes",
        "Famalicão": "Famalicao", "Casa Pia": "Casa Pia",
        "Rio Ave": "Rio Ave", "Gil Vicente": "Gil Vicente",
        "Boavista": "Boavista", "Moreirense": "Moreirense",
        "Arouca": "Arouca", "FC Arouca": "Arouca",
        "Estoril Praia": "Estoril", "FC Vizela": "Vizela",
        "Chaves": "Chaves", "Santa Clara": "Santa Clara",
        "Nacional": "Nacional", "Estrela Amadora": "Estrela",
        "AVS": "AVS",
    },
    "N1": {
        "Ajax": "Ajax", "PSV": "PSV", "PSV Eindhoven": "PSV",
        "Feyenoord": "Feyenoord", "AZ": "AZ", "AZ Alkmaar": "AZ",
        "FC Utrecht": "Utrecht", "FC Twente": "Twente",
        "Vitesse": "Vitesse", "SC Heerenveen": "Heerenveen",
        "Sparta Rotterdam": "Sparta", "NEC Nijmegen": "NEC",
        "RKC Waalwijk": "RKC", "PEC Zwolle": "Zwolle",
        "Almere City": "Almere", "Heracles Almelo": "Heracles",
        "Go Ahead Eagles": "Go Ahead", "FC Volendam": "Volendam",
        "Fortuna Sittard": "Fortuna Sittard",
        "Willem II": "Willem II",
    },
    "B1": {
        "Club Brugge": "Club Brugge", "RSC Anderlecht": "Anderlecht",
        "Anderlecht": "Anderlecht", "KAA Gent": "Gent", "Gent": "Gent",
        "Standard Liège": "Standard", "KV Mechelen": "Mechelen",
        "KRC Genk": "Genk", "Genk": "Genk",
        "Royal Antwerp": "Antwerp", "R. Antwerp": "Antwerp",
        "Union Saint-Gilloise": "Union SG",
        "Beerschot VA": "Beerschot",
        "Cercle Brugge": "Cercle Brugge",
        "Sint-Truiden": "St. Truiden", "Kortrijk": "Kortrijk",
        "OHL": "OHL", "Charleroi": "Charleroi",
    },
    "SC0": {
        "Celtic": "Celtic", "Rangers": "Rangers",
        "Heart of Midlothian": "Hearts", "Hearts": "Hearts",
        "Hibernian": "Hibernian", "Aberdeen": "Aberdeen",
        "Motherwell": "Motherwell", "Livingston": "Livingston",
        "Ross County": "Ross County", "St. Mirren": "St Mirren",
        "Dundee United": "Dundee United", "Dundee": "Dundee",
        "Kilmarnock": "Kilmarnock", "St. Johnstone": "St Johnstone",
        "Inverness CT": "Inverness",
    },
    "T1": {
        "Galatasaray": "Galatasaray", "Fenerbahçe": "Fenerbahce",
        "Fenerbahce": "Fenerbahce", "Besiktas": "Besiktas",
        "Beşiktaş": "Besiktas", "Trabzonspor": "Trabzonspor",
        "Basaksehir": "Basaksehir", "Istanbul Basaksehir": "Basaksehir",
        "Kasimpasa": "Kasimpasa", "Sivasspor": "Sivasspor",
        "Konyaspor": "Konyaspor", "Alanyaspor": "Alanyaspor",
        "Antalyaspor": "Antalyaspor", "Kayserispor": "Kayserispor",
        "Gaziantep": "Gaziantep", "Hatayspor": "Hatayspor",
    },
    "G1": {
        "Olympiacos": "Olympiakos", "Olympiakos": "Olympiakos",
        "PAOK": "PAOK", "AEK Athens": "AEK",
        "Panathinaikos": "Panathinaikos",
        "Aris Thessaloniki": "Aris", "Atromitos": "Atromitos",
        "Volos NPS": "Volos", "Asteras Tripolis": "Asteras",
        "PAS Lamia": "Lamia",
    },
}


def get_season_codes(n: int = 2) -> list[str]:
    """Últimos N códigos de época (ex: ['2526', '2425'])."""
    today = date.today()
    year  = today.year
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
    """Mapeia ESPN displayName → nome no modelo. Retorna None se não encontrar."""
    static = TEAM_NAME_MAP.get(fd_code, {}).get(espn_name)
    if static and static in equipas_modelo:
        return static
    if not equipas_modelo:
        return None
    # difflib
    matches = difflib.get_close_matches(espn_name, equipas_modelo, n=1, cutoff=0.55)
    if matches:
        return matches[0]
    # token Jaccard
    tokens_in = set(espn_name.lower().replace("-", " ").split())
    best, score = None, 0.0
    for eq in equipas_modelo:
        tok = set(eq.lower().replace("-", " ").split())
        s   = len(tokens_in & tok) / len(tokens_in | tok) if (tokens_in | tok) else 0
        if s > score:
            score, best = s, eq
    return best if score >= 0.4 else None
