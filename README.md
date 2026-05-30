# Modelo de Apostas Desportivas — Futebol

Modelo estatístico de previsão de jogos de futebol baseado no algoritmo **Dixon-Coles (1997)**, com cálculo de **apostas de valor** e dimensionamento de stakes via **critério de Kelly**.

---

## Como funciona

### Modelo Dixon-Coles
- Estima a **força de ataque e defesa** de cada equipa por máxima verosimilhança
- Inclui **vantagem de casa** como parâmetro
- Aplica **correcção de baixa pontuação** (rho) para placares 0-0, 1-0, 0-1 e 1-1
- Pondera os jogos mais recentes com **decaimento temporal** (xi)

### Apostas de Valor (Value Betting)
```
Valor Esperado = Probabilidade_Modelo × Odd - 1
```
Uma aposta tem valor positivo quando a nossa probabilidade supera a probabilidade implícita nas odds do bookmaker.

### Critério de Kelly (¼ Kelly)
```
f* = (b × p - q) / b    →    stake = ¼ × f* × bankroll
```
Dimensiona o stake de forma óptima, minimizando o risco de ruína.

---

## Instalação

```bash
pip install -r requirements.txt
```

---

## Utilização

### Modo interactivo (recomendado)
```bash
python main.py
```

### Previsão directa com odds
```bash
python main.py --casa "Arsenal" --fora "Chelsea" \
               --o1 2.10 --ox 3.40 --o2 3.60 \
               --over 1.85 --under 1.95 \
               --bankroll 1000
```

### Listar equipas disponíveis
```bash
python main.py --lista
```

### Ver forças estimadas das equipas
```bash
python main.py --forcas
```

### Usar dados próprios
```bash
python main.py --csv dados/meus_jogos.csv --casa "Benfica" --fora "Porto"
```

O CSV deve ter colunas: `home_team, away_team, home_goals, away_goals[, date]`
Também aceita o formato de [football-data.co.uk](https://www.football-data.co.uk/).

---

## Mercados previstos

| Mercado          | Descrição                      |
|------------------|-------------------------------|
| Vitória Casa     | Equipa da casa vence          |
| Empate           | Jogo termina empatado         |
| Vitória Fora     | Equipa visitante vence        |
| Over 2.5 Golos   | 3 ou mais golos no total      |
| Under 2.5 Golos  | 0, 1 ou 2 golos no total      |
| Ambas Marcam     | As duas equipas marcam        |
| Placares         | Top 5 placares mais prováveis |

---

## Estrutura do Projecto

```
├── main.py                    # Ponto de entrada (CLI)
├── requirements.txt
├── modelo/
│   ├── dixon_coles.py         # Modelo estatístico Dixon-Coles
│   ├── value_betting.py       # Value betting + Kelly criterion
│   └── data.py                # Carregamento de dados + dataset exemplo
└── dados/                     # Coloque aqui os seus CSV
```

---

## Aviso

Este modelo é uma ferramenta de análise estatística. Nenhum modelo garante lucro nas apostas. Aposte sempre de forma responsável e dentro das suas possibilidades.
