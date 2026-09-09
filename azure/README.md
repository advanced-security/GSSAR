# GSSAR - Azure Deployment Guide

This guide covers deploying the GitHub Secret Scanner Auto Remediator (GSSAR) to **Microsoft Azure** using [Azure Bicep](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/overview).

## Architecture Overview

The Azure deployment maps the AWS architecture to equivalent Azure services:

| AWS Service | Azure Equivalent | Purpose |
|---|---|---|
| AWS Lambda | Azure Functions | Compute (authorizers, helpers, remediators) |
| Amazon API Gateway | Azure Function App HTTP Trigger | Ingress from GitHub webhooks |
| AWS Step Functions | Azure Logic App | Workflow orchestration |
| Amazon EventBridge | Azure Event Grid | Event routing |
| AWS Systems Manager (Parameter Store) | Azure Key Vault | Secrets and configuration storage |
| Amazon CloudWatch | Azure Application Insights | Logging and monitoring |
| Amazon SQS (Dead Letter Queue) | Azure Storage Queue | Dead-letter handling |
| AWS IAM Roles | Azure Managed Identity + RBAC | Identity and access management |

## Pre-Requisites

1. An [Azure Subscription](https://azure.microsoft.com/en-us/free/).
2. [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed and authenticated.
3. Access to a GitHub environment.
4. A repository where the code for this solution will live.

## Initial Installation

### Step One: Create Azure Resources

First, log in to Azure and create a resource group:

```bash
az login
az group create --name gssar-rg --location eastus
```

### Step Two: Create and Configure GitHub App

Create a [GitHub Application](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app). You will need to be an administrator of your GitHub organization.

1. **GitHub App Name**: GSSAR
2. **Homepage URL**: `https://placeholder.com` (updated after deployment)
3. **Webhook URL**: `https://placeholder.com` (updated after deployment)
4. **Webhook Secret**: Enter a secret of your choice — keep it safe
5. **Permissions**:
   - Secret scanning alerts (Read & Write)
   - Issues (Read & Write)
6. **Subscribe to events**: Secret scanning alert
7. **Where can this integration be installed**: Only on this account

Install the GitHub App on your organization and select the repositories for auto-remediation.

Collect the following information:

- **App ID**
- **Client ID**
- **Client Secret**
- **Installation ID** (found in the URL when configuring the installed app)
- **Private Key** ([generate one](https://docs.github.com/en/developers/apps/building-github-apps/authenticating-with-github-apps#generating-a-private-key))

### Step Three: Deploy Infrastructure with Bicep

Deploy the Bicep template to create all Azure resources:

```bash
az deployment group create \
  --resource-group gssar-rg \
  --template-file azure/main.bicep
```

Note the outputs from the deployment, especially the `functionAppUrl`.

### Step Four: Populate Key Vault Secrets

After deployment, store the GitHub App credentials in Azure Key Vault. Use the Key Vault name from the deployment outputs:

```bash
KV_NAME=$(az deployment group show \
  --resource-group gssar-rg \
  --name main \
  --query properties.outputs.keyVaultName.value -o tsv)

az keyvault secret set --vault-name $KV_NAME --name "APP-CLIENT-ID" --value "<your-app-client-id>"
az keyvault secret set --vault-name $KV_NAME --name "APP-CLIENT-SECRET" --value "<your-app-client-secret>"
az keyvault secret set --vault-name $KV_NAME --name "APP-ID" --value "<your-app-id>"
az keyvault secret set --vault-name $KV_NAME --name "APP-INSTALLATION-ID" --value "<your-app-installation-id>"
az keyvault secret set --vault-name $KV_NAME --name "APP-PRIVATE-KEY" --value "<your-app-private-key>"
az keyvault secret set --vault-name $KV_NAME --name "GITHUB-WEBHOOKS-SECRET" --value "<your-webhook-secret>"
```

> **Note**: These secrets are the Azure Key Vault equivalents of the AWS Systems Manager Parameter Store values:
> - `/GSSAR/APP_CLIENT_ID` → `APP-CLIENT-ID`
> - `/GSSAR/APP_CLIENT_SECRET` → `APP-CLIENT-SECRET`
> - `/GSSAR/APP_ID` → `APP-ID`
> - `/GSSAR/APP_INSTALLATION_ID` → `APP-INSTALLATION-ID`
> - `/GSSAR/APP_PRIVATE_KEY` → `APP-PRIVATE-KEY`
> - `/GSSAR/GITHUB_WEBHOOKS_SECRET` → `GITHUB-WEBHOOKS-SECRET`

### Step Five: Deploy Function Code

Build and deploy the function code to the Azure Function App:

```bash
# Build each function
for dir in \
  functions/authorizers/githubWebhookIPValidator \
  functions/authorizers/githubWebhookSecretValidator \
  functions/helpers/getSecretDetails \
  functions/helpers/closeSecret \
  functions/helpers/githubIssueNotifier \
  functions/remediators/remediateAWSAccessKey \
  functions/remediators/remediateGoogleAPIKey; do
    (cd "$dir" && yarn install --frozen-lockfile && yarn run build)
done

# Deploy to Azure Functions
FUNC_APP_NAME=$(az deployment group show \
  --resource-group gssar-rg \
  --name main \
  --query properties.outputs.functionAppName.value -o tsv)

func azure functionapp publish $FUNC_APP_NAME
```

> **Note**: You will need the [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) installed for the `func` CLI.

### Step Six: Update GitHub App Webhook URL

Go back to the GitHub App settings and update the **Webhook URL** to point to the Function App URL from the deployment output:

```
https://<your-function-app-name>.azurewebsites.net/api/github/webhook/validate
```

Click **Save**.

## Configuring Remediators

Adding new remediators follows the same pattern as the AWS deployment. See the root [README.md](../README.md#configuring-remediators) for details on creating remediator functions.

For Azure, the additional steps when adding a new remediator are:

1. Create a new directory within `functions/remediators/`.
2. Add a new case to the Logic App's `Find_Secret_Type_To_Remediate` switch action in `azure/main.bicep`.
3. Deploy the updated infrastructure and function code.

## CI/CD with GitHub Actions

To deploy via GitHub Actions, create a workflow that uses the [Azure Login](https://github.com/Azure/login) action. You can authenticate using:

- A [service principal with a secret](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure?tabs=azure-cli%2Clinux#use-the-azure-login-action-with-a-service-principal-secret)
- A [service principal with OpenID Connect](https://learn.microsoft.com/en-us/azure/developer/github/connect-from-azure?tabs=azure-cli%2Clinux#use-the-azure-login-action-with-openid-connect) (recommended)

Example workflow snippet:

```yaml
- name: Azure Login
  uses: azure/login@v2
  with:
    client-id: ${{ secrets.AZURE_CLIENT_ID }}
    tenant-id: ${{ secrets.AZURE_TENANT_ID }}
    subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

- name: Deploy Bicep Template
  uses: azure/arm-deploy@v2
  with:
    resourceGroupName: gssar-rg
    template: azure/main.bicep

- name: Deploy Function App
  uses: Azure/functions-action@v1
  with:
    app-name: ${{ steps.deploy.outputs.functionAppName }}
    package: .
```
