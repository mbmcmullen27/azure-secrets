const { SecretClient, DefaultSecretPolicy } = require("@azure/keyvault-secrets");
const { DefaultAzureCredential } = require("@azure/identity");
const { Octokit } = require("@octokit/core");

const sodium = require('libsodium-wrappers')
const fs = require('fs');

const token = fs.readFileSync('/home/mmcmullen/.gh_pat', 'utf-8')
const octokit = new Octokit({ auth:  token });

async function gh_api(endpoint, parameters) {
    if (parameters === undefined) parameters = {}
    local_parameters = {
        ...parameters
    }

    local_parameters["owner"] = 'mbmcmullen27'
    local_parameters["repo"] = 'azure-secrets'

    return await octokit.request(endpoint, local_parameters)
}


const credential = new DefaultAzureCredential()
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

    let {key, key_id} = key_response.data

    secrets.forEach(secret=> {
        console.log(secret)
        sodium.ready.then(() => {
            let binkey = sodium.from_base64(key, sodium.base64_variants.ORIGINAL)
            let binsec = sodium.from_string(secret.value)
    
            let encBytes = sodium.crypto_box_seal(binsec, binkey)
    
            let output = sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL)
            let params = {
                secret_name: secret.name,
                encrypted_value: output,
                key_id: key_id
            }

            gh_api('PUT /repos/{owner}/{repo}/actions/secrets/{secret_name}', params)
        });
    })
})();