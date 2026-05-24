import os
import json
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """És um assistente especializado em Power BI que ajuda o utilizador a explorar
os seus dashboards, relatórios e datasets de forma simples e em português.

Tens acesso a ferramentas que te permitem:
- Listar todos os workspaces, dashboards, relatórios e datasets
- Ver os tiles (visuais) de um dashboard
- Ver as páginas de um relatório
- Executar queries DAX num dataset para obter dados
- Obter um inventário completo de todos os recursos

Quando o utilizador pedir informação, usa as ferramentas disponíveis para obter os dados reais
e apresenta-os de forma clara e organizada em português.

Quando apresentares listas, usa formatação clara com bullet points.
Quando apresentares dados numéricos, formata-os de forma legível.
Se o utilizador pedir um relatório, organiza a informação de forma estruturada.

Responde SEMPRE em português de Portugal."""

TOOLS = [
    {
        "name": "listar_workspaces",
        "description": "Lista todos os workspaces (espaços de trabalho) Power BI do utilizador",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
    {
        "name": "listar_dashboards",
        "description": "Lista todos os dashboards de um workspace ou do espaço de trabalho pessoal",
        "input_schema": {
            "type": "object",
            "properties": {
                "workspace_id": {
                    "type": "string",
                    "description": "ID do workspace. Omitir para o espaço de trabalho pessoal.",
                }
            },
            "required": [],
        },
    },
    {
        "name": "ver_tiles_dashboard",
        "description": "Mostra todos os tiles (visuais/cartões) de um dashboard específico",
        "input_schema": {
            "type": "object",
            "properties": {
                "dashboard_id": {"type": "string", "description": "ID do dashboard"},
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": ["dashboard_id"],
        },
    },
    {
        "name": "listar_relatorios",
        "description": "Lista todos os relatórios de um workspace ou do espaço de trabalho pessoal",
        "input_schema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": [],
        },
    },
    {
        "name": "ver_paginas_relatorio",
        "description": "Mostra as páginas de um relatório específico",
        "input_schema": {
            "type": "object",
            "properties": {
                "report_id": {"type": "string", "description": "ID do relatório"},
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": ["report_id"],
        },
    },
    {
        "name": "listar_datasets",
        "description": "Lista todos os datasets de um workspace ou do espaço de trabalho pessoal",
        "input_schema": {
            "type": "object",
            "properties": {
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": [],
        },
    },
    {
        "name": "ver_tabelas_dataset",
        "description": "Mostra as tabelas disponíveis num dataset",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {"type": "string", "description": "ID do dataset"},
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": ["dataset_id"],
        },
    },
    {
        "name": "executar_query_dax",
        "description": "Executa uma query DAX num dataset para obter dados específicos",
        "input_schema": {
            "type": "object",
            "properties": {
                "dataset_id": {"type": "string", "description": "ID do dataset"},
                "dax_query": {"type": "string", "description": "Query DAX a executar"},
                "workspace_id": {"type": "string", "description": "ID do workspace (opcional)"},
            },
            "required": ["dataset_id", "dax_query"],
        },
    },
    {
        "name": "inventario_completo",
        "description": "Obtém um inventário completo de todos os recursos Power BI do utilizador (workspaces, dashboards, relatórios, datasets)",
        "input_schema": {"type": "object", "properties": {}, "required": []},
    },
]


class PowerBIAssistant:
    def __init__(self, pbi_client):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.pbi = pbi_client
        self.history = []

    def _execute_tool(self, tool_name: str, tool_input: dict) -> str:
        try:
            if tool_name == "listar_workspaces":
                result = self.pbi.list_workspaces()
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "listar_dashboards":
                result = self.pbi.list_dashboards(tool_input.get("workspace_id"))
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "ver_tiles_dashboard":
                result = self.pbi.get_dashboard_tiles(
                    tool_input["dashboard_id"],
                    tool_input.get("workspace_id"),
                )
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "listar_relatorios":
                result = self.pbi.list_reports(tool_input.get("workspace_id"))
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "ver_paginas_relatorio":
                result = self.pbi.get_report_pages(
                    tool_input["report_id"],
                    tool_input.get("workspace_id"),
                )
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "listar_datasets":
                result = self.pbi.list_datasets(tool_input.get("workspace_id"))
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "ver_tabelas_dataset":
                result = self.pbi.get_dataset_tables(
                    tool_input["dataset_id"],
                    tool_input.get("workspace_id"),
                )
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "executar_query_dax":
                result = self.pbi.execute_query(
                    tool_input["dataset_id"],
                    tool_input["dax_query"],
                    tool_input.get("workspace_id"),
                )
                return json.dumps(result, ensure_ascii=False, indent=2)

            elif tool_name == "inventario_completo":
                result = self.pbi.get_full_inventory()
                return json.dumps(result, ensure_ascii=False, indent=2)

            else:
                return f"Ferramenta '{tool_name}' desconhecida."

        except Exception as e:
            return f"Erro ao executar '{tool_name}': {str(e)}"

    def chat(self, user_message: str) -> str:
        self.history.append({"role": "user", "content": user_message})

        while True:
            response = self.client.messages.create(
                model="claude-opus-4-7",
                max_tokens=4096,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=self.history,
            )

            # Processar uso de ferramentas
            if response.stop_reason == "tool_use":
                assistant_message = {"role": "assistant", "content": response.content}
                self.history.append(assistant_message)

                tool_results = []
                for block in response.content:
                    if block.type == "tool_use":
                        result = self._execute_tool(block.name, block.input)
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": result,
                        })

                self.history.append({"role": "user", "content": tool_results})
                continue

            # Resposta final em texto
            final_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    final_text += block.text

            self.history.append({"role": "assistant", "content": final_text})
            return final_text

    def reset(self):
        self.history = []
