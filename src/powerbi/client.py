import requests
from typing import Any
from .auth import get_access_token

BASE_URL = "https://api.powerbi.com/v1.0/myorg"


class PowerBIClient:
    def __init__(self):
        self._token = None

    def _headers(self) -> dict:
        if not self._token:
            self._token = get_access_token()
        return {"Authorization": f"Bearer {self._token}"}

    def _get(self, path: str) -> Any:
        url = f"{BASE_URL}{path}"
        response = requests.get(url, headers=self._headers())

        if response.status_code == 401:
            self._token = None
            self._token = get_access_token()
            response = requests.get(url, headers=self._headers())

        response.raise_for_status()
        return response.json()

    # Workspaces (grupos)
    def list_workspaces(self) -> list[dict]:
        data = self._get("/groups")
        return data.get("value", [])

    # Dashboards
    def list_dashboards(self, workspace_id: str | None = None) -> list[dict]:
        path = f"/groups/{workspace_id}/dashboards" if workspace_id else "/dashboards"
        return self._get(path).get("value", [])

    def get_dashboard_tiles(self, dashboard_id: str, workspace_id: str | None = None) -> list[dict]:
        if workspace_id:
            path = f"/groups/{workspace_id}/dashboards/{dashboard_id}/tiles"
        else:
            path = f"/dashboards/{dashboard_id}/tiles"
        return self._get(path).get("value", [])

    # Relatórios
    def list_reports(self, workspace_id: str | None = None) -> list[dict]:
        path = f"/groups/{workspace_id}/reports" if workspace_id else "/reports"
        return self._get(path).get("value", [])

    def get_report(self, report_id: str, workspace_id: str | None = None) -> dict:
        if workspace_id:
            path = f"/groups/{workspace_id}/reports/{report_id}"
        else:
            path = f"/reports/{report_id}"
        return self._get(path)

    def get_report_pages(self, report_id: str, workspace_id: str | None = None) -> list[dict]:
        if workspace_id:
            path = f"/groups/{workspace_id}/reports/{report_id}/pages"
        else:
            path = f"/reports/{report_id}/pages"
        return self._get(path).get("value", [])

    # Datasets
    def list_datasets(self, workspace_id: str | None = None) -> list[dict]:
        path = f"/groups/{workspace_id}/datasets" if workspace_id else "/datasets"
        return self._get(path).get("value", [])

    def get_dataset(self, dataset_id: str, workspace_id: str | None = None) -> dict:
        if workspace_id:
            path = f"/groups/{workspace_id}/datasets/{dataset_id}"
        else:
            path = f"/datasets/{dataset_id}"
        return self._get(path)

    def get_dataset_tables(self, dataset_id: str, workspace_id: str | None = None) -> list[dict]:
        if workspace_id:
            path = f"/groups/{workspace_id}/datasets/{dataset_id}/tables"
        else:
            path = f"/datasets/{dataset_id}/tables"
        return self._get(path).get("value", [])

    def execute_query(self, dataset_id: str, dax_query: str, workspace_id: str | None = None) -> dict:
        if workspace_id:
            url = f"{BASE_URL}/groups/{workspace_id}/datasets/{dataset_id}/executeQueries"
        else:
            url = f"{BASE_URL}/datasets/{dataset_id}/executeQueries"

        payload = {
            "queries": [{"query": dax_query}],
            "serializerSettings": {"includeNulls": True},
        }
        response = requests.post(url, headers=self._headers(), json=payload)
        response.raise_for_status()
        return response.json()

    def get_full_inventory(self) -> dict:
        """Retorna um inventário completo de todos os recursos Power BI do utilizador."""
        inventory = {"workspaces": [], "my_workspace": {}}

        # Espaço de trabalho pessoal
        my_dashboards = self.list_dashboards()
        my_reports = self.list_reports()
        my_datasets = self.list_datasets()

        inventory["my_workspace"] = {
            "name": "O Meu Espaço de Trabalho",
            "dashboards": my_dashboards,
            "reports": my_reports,
            "datasets": my_datasets,
        }

        # Outros workspaces
        workspaces = self.list_workspaces()
        for ws in workspaces:
            ws_id = ws["id"]
            try:
                ws_data = {
                    "id": ws_id,
                    "name": ws.get("name", "Sem nome"),
                    "dashboards": self.list_dashboards(ws_id),
                    "reports": self.list_reports(ws_id),
                    "datasets": self.list_datasets(ws_id),
                }
                inventory["workspaces"].append(ws_data)
            except Exception:
                pass

        return inventory
