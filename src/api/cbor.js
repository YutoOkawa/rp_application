const cbor = require('cbor');

export default {
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