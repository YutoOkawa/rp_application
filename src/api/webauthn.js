import axios from 'axios'

function Api(baseURL) {
    return axios.create({
        baseURL: baseURL
    })
}

function combine_attributes(attributes) {
    var attributeStr = ''
    for (var i in attributes) {
      attributeStr += attributes[i]
      attributeStr += ','
    }
    attributeStr = attributeStr.slice(0, -1)
    return attributeStr
}

export default {
    /**
     * attestationOptionsのリクエストを送信する
     * @param {string} username 
     * @param {string} attributes 
     * @param {string} FIDO_URL 
     * @returns options
     */
    attestationOptions(username, attributes, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            username: username,
            attributes: combine_attributes(attributes)
        }
        return Api(baseURL).post('/attestation/options', param);
    },
    attestationResult(attestation, userid, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            userid: userid,
            attestation: attestation
        };
        return Api(baseURL).post('/attestation/result', param);
    },
    /**
     * assertionOptionsのリクエストを送信する
     * @param {String} username 
     * @param {String} policy 
     * @param {String} FIDO_URL 
     * @returns options
     */
    asserionOptions(username, policy, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            username: username,
            policy: policy
        };
        return Api(baseURL).post('/assertion/options', param);
    },
    assertionResult(assertion, userid, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            userid: userid, 
            assertion: assertion
        };
        return Api(baseURL).post('/assertion/result', param);
    },
    delegatedOptions(username, delegatedUsername, attributes, policy, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            username: username,
            delegatedUsername: delegatedUsername,
            attributes: combine_attributes(attributes),
            policy: policy
        };
        return Api(baseURL).post('/delegated/options', param);
    },
    delegatedResult(attestation, username, delegatedUsername, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            attestation: attestation,
            username: username,
            delegatedUsername: delegatedUsername,
        };
        return Api(baseURL).post('/delegated/result', param);
    },
    /**
     * kgcのセットアップを行う
     * @param {string} userid ユーザID
     * @param {string} KGC_URL KGCのURL
     * @returns setupID
     */
    setupKgc(userid, KGC_URL) {
        const baseURL = 'http://' + KGC_URL + ':4000';
        const param = {
            userid: userid
        };
        console.log(param);
        return Api(baseURL).post('/setup', param);
    },
    /**
     * KGCに鍵発行を依頼する
     * @param {string} credentialId 発行したsetupID
     * @param {*} attributes 鍵を発行する属性集合
     * @param {*} KGC_URL KCGのURL
     * @returns 鍵情報
     */
    attrgen(credentialId, attributes, KGC_URL) {
        const baseURL = 'http://' + KGC_URL + ':4000';
        const param = {
            credentialId: credentialId,
            attributes: attributes
        }
        return Api(baseURL).post('/attrgen', param);
    } 
}