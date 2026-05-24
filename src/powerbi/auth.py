import os
import msal
from dotenv import load_dotenv

load_dotenv()

SCOPES = ["https://analysis.windows.net/powerbi/api/.default"]
AUTHORITY = "https://login.microsoftonline.com/{tenant_id}"
CACHE_FILE = ".token_cache.json"


def _build_app(cache: msal.SerializableTokenCache) -> msal.PublicClientApplication:
    client_id = os.getenv("AZURE_CLIENT_ID")
    tenant_id = os.getenv("AZURE_TENANT_ID")

    if not client_id or not tenant_id:
        raise ValueError(
            "AZURE_CLIENT_ID e AZURE_TENANT_ID são obrigatórios no ficheiro .env"
        )

    return msal.PublicClientApplication(
        client_id,
        authority=AUTHORITY.format(tenant_id=tenant_id),
        token_cache=cache,
    )


def _load_cache() -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            cache.deserialize(f.read())
    return cache


def _save_cache(cache: msal.SerializableTokenCache) -> None:
    if cache.has_state_changed:
        with open(CACHE_FILE, "w") as f:
            f.write(cache.serialize())


def get_access_token() -> str:
    cache = _load_cache()
    app = _build_app(cache)

    accounts = app.get_accounts()
    result = None

    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])

    if not result:
        flow = app.initiate_device_flow(scopes=SCOPES)
        if "user_code" not in flow:
            raise RuntimeError("Falha ao iniciar autenticação: " + str(flow))

        print("\n" + "=" * 60)
        print("AUTENTICAÇÃO NECESSÁRIA")
        print("=" * 60)
        print(flow["message"])
        print("=" * 60 + "\n")

        result = app.acquire_token_by_device_flow(flow)

    _save_cache(cache)

    if "access_token" not in result:
        error = result.get("error_description", result.get("error", "Erro desconhecido"))
        raise RuntimeError(f"Falha na autenticação: {error}")

    return result["access_token"]
