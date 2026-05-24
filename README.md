# Auditoria Power BI

Assistente inteligente em português para explorar e analisar os seus dashboards, relatórios e datasets do Power BI através de linguagem natural.

## O que faz

- **Explora** todos os seus workspaces, dashboards e relatórios
- **Responde** a perguntas em português sobre os seus dados
- **Executa** queries DAX para extrair informação dos datasets
- **Gera** resumos e relatórios sobre os seus recursos Power BI

## Exemplos de uso

```
Você: Mostra-me todos os meus dashboards
Você: Que relatórios tenho no workspace de Vendas?
Você: Faz um resumo completo de todos os meus recursos Power BI
Você: Quais são as tabelas do dataset de Clientes?
Você: Mostra-me os tiles do dashboard principal
```

## Instalação

```bash
pip install -r requirements.txt
cp .env.example .env
# Edite o .env com as suas credenciais (veja SETUP.md)
python main.py
```

## Configuração

Consulte [SETUP.md](SETUP.md) para instruções detalhadas sobre como:
1. Registar a aplicação no Azure AD
2. Configurar permissões do Power BI
3. Obter a chave da API Anthropic

## Requisitos

- Python 3.10+
- Conta Microsoft com acesso ao Power BI
- Chave da API Anthropic
