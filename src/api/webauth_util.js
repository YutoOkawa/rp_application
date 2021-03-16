const base64url = require('base64url');
const crypto = require('crypto');

function strToBuffer(src) {
    return (new Uint8Array([].map.call(src,function(c) {
        return c.charCodeAt(0)
    }))).buffer;
}

export default {
    /**
     * clientDataJSONを生成する
     * @param {ArrayBuffer} challenge fidoServerから送信されたランダムな文字列
     * @param {String} type 登録や認証のType
     * @param {String} origin サイトのorigin
     * @returns clientDataJSON
     */
    generateClientDataJSON(challenge, type, origin) {
        var clientDataJSON = {};
        this.setOpt(clientDataJSON, "challenge", base64url.encode(challenge));
        this.setOpt(clientDataJSON, "type", type);
        this.setOpt(clientDataJSON, "origin", origin);
        return clientDataJSON;
    },
    /**
     * clientDataJSONをHash化して返す
     * @param {dict} clientDataJSON 
     * @returns Hash化したclientDataJSON
     */
    generateClientDataHash(clientDataJSON) {
        var clientDataHash = JSON.stringify(clientDataJSON);
        clientDataHash = strToBuffer(clientDataHash);
        clientDataHash = this.generateSha256(clientDataHash);
        return clientDataHash
    },
    /**
     * attestationMakeCredentialに必要なパラメータを返す
     * @param {*} attestation 
     * @param {*} clientDataHash 
     * @returns attestationMakeCredentialのパラメータ
     */
    generateMakeCredentialParameter(attestation, clientDataHash) {
        var makeCredentialParam = new Map();
        makeCredentialParam.set(0x01, clientDataHash);
        makeCredentialParam.set(0x02, attestation.rp);
        makeCredentialParam.set(0x03, attestation.user);
        makeCredentialParam.set(0x04, attestation.pubKeyCredParams);
        return makeCredentialParam;
    },
    generateRequest(commandID, commandValue, parameter) {
        var request = commandID + '00' + (parameter.length/2).toString(16) + commandValue + parameter;
        return request;
    },
    /**
     * Sha256エンコードした値を返す
     * @param {*} data 
     * @returns Sha256エンコードした値
     */
    generateSha256(data) {
        var sha256 = crypto.createHash('sha256');
        sha256.update(data);
        var encodedData = sha256.digest();
        return encodedData;
    },
    /**
     * dictionary型にKeyとvalueを登録する
     * @param {dict} obj 登録するObject
     * @param {String} prop Key
     * @param {String} val Value
     */
    setOpt(obj,prop,val) {
        if (val !== undefined) {
            obj[prop] = val;
        }
    },
    /**
     * base64urlでencodeする
     * @param {Buffer} buf base64urlエンコードするBuffer
     * @returns base64urlでエンコードされた
     */
    encodeBase64url(buf) {
        return base64url.encode(buf)
    },
    /**
     * base64url文字列をデコードする
     * @param {Buffer} buf base64urlエンコードされたBuffer
     * @returns base64urlデコードしたBuffer
     */
    decodeBase64url(buf) {
        return base64url.decode(buf)
    },
    /**
     * base64urlBuffer化する
     * @param {Buffer} buf 
     * @returns Buffer
     */
    toBufferBase64url(buf) {
        return base64url.toBuffer(buf)
    },
    convertHex(buf) {
        var hex = Buffer.from(buf).toString("hex");
        return hex;
    },
    /**
     * ArrayBufferをBufferに変換する
     * @param {ArrayBuffer} buf ArrayBufer
     * @returns Buffer
     */
    toBuffer(buf) {
        if (buf instanceof ArrayBuffer) {
            buf = Buffer.from(new Uint8Array(buf))
        }
        return buf
    },
    /**
     * ArrayBufferに変換する
     * @param {Buffer} buf 
     * @returns ArrayBuffer
     */
    toArrayBuffer (buf) {
        if (typeof buf === 'string') {
            // base64url to base64
            // console.log("base64url to base64")
            buf = buf.replace(/-/g, '+').replace(/_/g, '/')
            // base64 to Buffer
            buf = Buffer.from(buf, 'base64')
        }
        // Buffer or Array to Uint8Array
        if (buf instanceof Buffer || Array.isArray(buf)) {
            // console.log("Buffer or Array to Uint8Array")
            buf = new Uint8Array(buf)
        }
        // Uint8Array to ArrayBuffer
        if (buf instanceof Uint8Array) {
            // console.log("Uint8Array to ArrayBuffer")
            buf = buf.buffer
        }
        // error if none of the above worked
        if (!(buf instanceof ArrayBuffer)) {
            throw new TypeError(`could not coerce '${name}' to ArrayBuffer`)
        }
        return buf
    },
}