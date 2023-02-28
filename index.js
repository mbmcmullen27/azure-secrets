const { SecretClient } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const { Octokit } = require("@octokit/core");
const core = require("@actions/core")
const github = require("@actions/github")
const sodium = require('libsodium-wrappers')

// github vars
const token = core.getInput('token')
const octokit = new Octokit({ auth:  token })
const context = github.context

// keyvault vars
const credential = new DefaultAzureCredential()
const keyVaultName = core.getInput('keyvault')
const url = "https://" + keyVaultName + ".vault.azure.net"
const client = new SecretClient(url, credential)

async function gh_api(endpoint, parameters) {
    if (parameters === undefined) parameters = {}
    local_parameters = {
        ...parameters
    }

    local_parameters["owner"] = context.repo.owner
    local_parameters["repo"] = context.repo.repo

    return await octokit.request(endpoint, local_parameters)
}

async function create_secret(name, value, public_key) {
    sodium.ready.then(() => {
        let binkey = sodium.from_base64(public_key.key, sodium.base64_variants.ORIGINAL)
        let binsec = sodium.from_string(value)

        let encBytes = sodium.crypto_box_seal(binsec, binkey)

        let output = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)
        let params = {
            secret_name: name,
            encrypted_value: output,
            key_id: public_key.key_id
        }

        gh_api('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', params)
    });
}

;(async () => {
    let secrets = []
    for await (let properties of client.listPropertiesOfSecrets()) {
        let secret = await client.getSecret(properties.name)
        secrets.push({
            name: `AZ_${secret.name.replace(/-/g, "_").toUpperCase()}`,
            value: secret.value
        })
    }

    const key_response = await gh_api('GET /repos/{owner}/{repo}/actions/secrets/public-key')
    let key = key_response.data

    secrets.forEach(secret=> {
        create_secret(secret.name, secret.value, key)
    })
})();