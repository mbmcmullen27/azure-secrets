# azure-secrets
Javascript action for pulling secrets from Azure keyvault and storing them as repo secrets
- example:
    ```yaml
    jobs:
    azure:
        runs-on: ubuntu-latest
        steps:

        - name: Azure Login
            uses: Azure/login@v1
            with:
            creds: ${{ secrets.AZURE_CREDENTIALS }}

        - name: Secret Sync
            uses: mbmcmullen27/azure-secrets@v1.0
            id: secrets
            with:
            keyvault: gh-secrets-awaited-quail
            token: ${{ secrets.GH_PAT }}
            pattern: '[1-4].*'

    ```
- requires logging into azure first with [Azure/login@v1](https://github.com/marketplace/actions/azure-login) action
- optional pattern parameter allows for selecting secrets with regex