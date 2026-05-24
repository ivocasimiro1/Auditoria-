#!/usr/bin/env python3
import sys
import os
from dotenv import load_dotenv

load_dotenv()

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Prompt
    from rich.markdown import Markdown
    from rich.rule import Rule
except ImportError:
    print("A instalar dependências... Execute: pip install -r requirements.txt")
    sys.exit(1)

console = Console()


def verificar_configuracao():
    erros = []
    if not os.getenv("AZURE_CLIENT_ID"):
        erros.append("AZURE_CLIENT_ID em falta no ficheiro .env")
    if not os.getenv("AZURE_TENANT_ID"):
        erros.append("AZURE_TENANT_ID em falta no ficheiro .env")
    if not os.getenv("ANTHROPIC_API_KEY"):
        erros.append("ANTHROPIC_API_KEY em falta no ficheiro .env")

    if erros:
        console.print(Panel(
            "\n".join(f"[red]✗[/red] {e}" for e in erros) +
            "\n\n[yellow]Consulte o ficheiro SETUP.md para instruções de configuração.[/yellow]",
            title="[red]Configuração Incompleta[/red]",
            border_style="red",
        ))
        sys.exit(1)


def main():
    console.print(Panel(
        "[bold blue]Auditoria Power BI[/bold blue]\n"
        "[dim]Assistente inteligente para os seus dashboards e relatórios[/dim]",
        border_style="blue",
    ))

    verificar_configuracao()

    console.print("[dim]A inicializar cliente Power BI...[/dim]")

    try:
        from src.powerbi.client import PowerBIClient
        from src.chat.assistant import PowerBIAssistant

        pbi_client = PowerBIClient()
        assistant = PowerBIAssistant(pbi_client)
    except Exception as e:
        console.print(f"[red]Erro ao inicializar: {e}[/red]")
        sys.exit(1)

    console.print(Panel(
        "Exemplos do que pode perguntar:\n"
        "• [italic]\"Mostra-me todos os meus dashboards\"[/italic]\n"
        "• [italic]\"Que relatórios tenho no workspace X?\"[/italic]\n"
        "• [italic]\"Faz um resumo de todos os meus recursos Power BI\"[/italic]\n"
        "• [italic]\"Quais são as tabelas do dataset Y?\"[/italic]\n\n"
        "[dim]Escreva [bold]sair[/bold] para terminar | [bold]limpar[/bold] para nova conversa[/dim]",
        title="Como usar",
        border_style="green",
    ))

    while True:
        console.print()
        try:
            user_input = Prompt.ask("[bold green]Você[/bold green]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Até logo![/dim]")
            break

        if not user_input.strip():
            continue

        if user_input.strip().lower() in ("sair", "exit", "quit"):
            console.print("[dim]Até logo![/dim]")
            break

        if user_input.strip().lower() in ("limpar", "clear"):
            assistant.reset()
            console.clear()
            console.print("[dim]Conversa reiniciada.[/dim]")
            continue

        console.print(Rule(style="dim"))
        console.print("[dim]A processar...[/dim]")

        try:
            response = assistant.chat(user_input)
            console.print(Rule(style="dim"))
            console.print("[bold blue]Assistente[/bold blue]")
            console.print(Markdown(response))
        except Exception as e:
            console.print(f"[red]Erro: {e}[/red]")


if __name__ == "__main__":
    main()
