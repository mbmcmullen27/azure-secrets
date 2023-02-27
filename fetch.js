const { SecretClient, DefaultSecretPolicy } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");

const sodium = require('libsodium-wrappers')

const credential = new DefaultAzureCredential()
const keyVaultName = "gh-secrets-awaited-quail"
const url = "https://" + keyVaultName + ".vault.azure.net"
const client = new SecretClient(url, credential)

;(async () => {
    let secrets = []
    for await (let properties of client.listPropertiesOfSecrets()) {
        console.log("Secret properties: ", properties)
        let secret = await client.getSecret(properties.name)
        secrets.push({
            name: `AZ_${secret.name.replace(/-/g, "_").toUpperCase()}`,
            value: secret.value
        })
    }

    console.log(secrets)

    secrets.forEach(secret=> {
        console.log(secret)
    })
})();