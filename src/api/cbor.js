const cbor = require('cbor');

export default {
    /**
     * CBORエンコードした値を返す
     * @param {*} value 
     * @returns CBORエンコードした値
     */
    encodeCBOR(value) {
        var encodeObject = cbor.encode(value);
        console.log(encodeObject);
        return encodeObject;
    },
    /**
     * CBORデコードした値を返す
     * @param {*} encoded_cbor CBOREncodeされた値 
     */
    decodeCBOR(encoded_cbor) {
        console.log(encoded_cbor);
        var decodeObject = cbor.decode(encoded_cbor);
        console.log(decodeObject);
        return decodeObject;
    }
}