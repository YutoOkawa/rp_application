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
    attestationOptions(username, attributes, FIDO_URL) {
        const baseURL = 'https://' + FIDO_URL + ':3000';
        const param = {
            username: username,
            attributes: combine_attributes(attributes)
        }
        return Api(baseURL).post('/attestation/options', param);
    }
}