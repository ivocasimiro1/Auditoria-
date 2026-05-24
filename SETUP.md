# Guia de Configuração

## 1. Registar Aplicação no Azure AD

1. Aceda ao [Azure Portal](https://portal.azure.com)
2. Pesquise por **"Registos de aplicações"** (App registrations)
3. Clique em **"+ Novo registo"**
4. Preencha:
   - **Nome**: `Auditoria Power BI` (ou o nome que preferir)
   - **Tipos de conta suportados**: *Contas apenas neste diretório organizacional*
   - **URI de Redirecionamento**: deixe em branco
5. Clique em **Registar**

## 2. Copiar as Credenciais

Após o registo, na página da aplicação:
- Copie o **ID da aplicação (cliente)** → será o `AZURE_CLIENT_ID`
- Copie o **ID do diretório (inquilino)** → será o `AZURE_TENANT_ID`

## 3. Adicionar Permissões Power BI

1. No menu lateral, clique em **"Permissões de API"**
2. Clique em **"+ Adicionar uma permissão"**
3. Selecione **"Power BI Service"**
4. Escolha **"Permissões delegadas"**
5. Selecione as seguintes permissões:
   - `Dashboard.Read.All`
   - `Report.Read.All`
   - `Dataset.Read.All`
   - `Workspace.Read.All`
6. Clique em **"Adicionar permissões"**
7. Clique em **"Conceder consentimento de administrador"** (se tiver permissão)

## 4. Obter Chave da API Anthropic

1. Aceda a [console.anthropic.com](https://console.anthropic.com)
2. Crie uma conta ou faça login
3. Vá a **API Keys** e crie uma nova chave

## 5. Configurar o Ficheiro .env

1. Copie o ficheiro de exemplo:
   ```bash
   cp .env.example .env
   ```
2. Edite o ficheiro `.env` com os seus valores:
   ```
   AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   AZURE_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ANTHROPIC_API_KEY=sk-ant-...
   ```

## 6. Instalar Dependências e Executar

```bash
pip install -r requirements.txt
python main.py
```

Na primeira execução, o programa pedirá para autenticar com a sua conta Microsoft:
1. Abrirá um URL no browser
2. Introduza o código mostrado no terminal
3. Faça login com a sua conta Microsoft/Power BI
4. A sessão fica guardada para usos futuros

## Resolução de Problemas

**"AADSTS50011: The redirect URI..."**
→ Certifique-se que não adicionou URI de redirecionamento no Azure AD, ou use `http://localhost`

**"Insufficient privileges"**
→ Peça ao administrador do tenant para conceder consentimento às permissões

**"Dataset does not support..."**
→ Nem todos os datasets suportam queries DAX via API (ex: datasets em modo DirectQuery com algumas fontes)
