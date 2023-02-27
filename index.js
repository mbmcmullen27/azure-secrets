const { SecretClient, DefaultSecretPolicy } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const core = require('@actions/core');
const github = require('@actions/github');

const sodium = require('libsodium-wrappers')
const fs = require('fs');

const token = fs.readFileSync('/home/mmcmullen/.gh_pat', 'utf-8')

async function gh_api(endpoint, parameters) {
    if (parameters === undefined) parameters = {}
    local_parameters = {
        ...parameters
    }

    local_parameters["owner"] = 'mbmcmullen27'
    local_parameters["repo"] = 'azure-secrets'

    return await github.request(endpoint, local_parameters)
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

const credential = new DefaultAzureCredential({
    managedIdentityClientId: "97859913-7708-4d7d-b743-620ce006d945"
})
const keyVaultName = "gh-secrets-awaited-quail"
const url = "https://" + keyVaultName + ".vault.azure.net"
const client = new SecretClient(url, credential)


;(async () => {
    let secrets = []
    for await (let properties of client.listPropertiesOfSecrets()) {
        // console.log("Secret properties: ", properties)
        let secret = await client.getSecret(properties.name)
        secrets.push({
            name: `AZ_${secret.name.replace(/-/g, "_").toUpperCase()}`,
            value: secret.value
        })
    }

    console.log(secrets)

    const key_response = await gh_api('GET /repos/{owner}/{repo}/actions/secrets/public-key')
    const repo_secrets = await gh_api('GET /repos/{owner}/{repo}/actions/secrets')

    console.log(repo_secrets.data)

    let key = key_response.data

    secrets.forEach(secret=> {
        console.log(secret)
        create_secret(secret.name, secret.value, key)
    })
})();