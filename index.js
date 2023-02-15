const { SecretClient, DefaultSecretPolicy } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const { Octokit } = require("@octokit/core");


(async () => {
    const octokit = new Octokit({ auth: `personal-access-token123` });

    const credential = new DefaultAzureCredential()
    const keyVaultName = "gh-secrets-awaited-quail"
    const url = "https://" + keyVaultName + ".vault.azure.net"
    const client = new SecretClient(url, credential)

    let secrets = []
    for await (let properties of client.listPropertiesOfSecrets()) {
        // console.log("Secret properties: ", properties)
        let secret = await client.getSecret(properties.name)
        secrets.push({
            key: secret.name,
            value: secret.value
        })
    }

    console.log(secrets)

    const repo_secrets = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets', {
        owner: 'OWNER',
        repo: 'REPO'
    })
})();