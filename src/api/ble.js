/**
 * BLE SERVICEのUUID
 */
const SERVICE_UUID = "0000fffd-0000-1000-8000-00805f9b34fa";

/**
 * FIDO Control PointのUUID
 */
const CHARACTERISTIC_CONTROLPOINT_UUID = "f1d0fff1-deaa-ecee-b42f-c9ba7ed623bb";

/**
 * FIDO StatusのUUID
 */
const CHARACTERISTIC_STATUS_UUID = "f1d0fff2-deaa-ecee-b42f-c9ba7ed623bb";

/**
 * FIDO Control Point LengthのUUID
 */
const CHARACTERISTIC_CONTROLPOINTLENGTH_UUID = "f1d0fff3-deaa-ecee-b42f-c9ba7ed623bb";

/**
 * FIDO Service Revision BitfieldのUUID
 */
const CHARACTERISTIC_SERVICEREVISIONBITFIELD_UUID = "f1d0fff4-deaa-ecee-b42f-c9ba7ed623bb";

/**
 * FIDO Service RevisionのUUID
 */
const CHARACTERISTIC_SERVICEREVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";

/**
 * BLE Device
 */
var device;

/**
 * FIDO Control PointのCharacteristic
 */
var pCpCharacteristic;

/**
 * FIDO StatusのCharacteristic
 */
var pStatusCharacteristic;

/**
 * FIDO Control Point LengthのCharacteristic
 */
var pCpLengthCharacteristic;

/**
 * FIDO Service Revision Bitfieldのcharacteristic
 */
var pSrbBitCharacteristic;

/**
 * FIDO Service Revisionのcharacteristic
 */
var pSrbCharacteristic;

/**
 * utf-8のデコーダー
 */
var decoder = new TextDecoder("utf-8");

export default {
    /**
     * Hex(16進数)からバイナリデータに変換する
     * @param {String} hexString Hexデータ
     * @returns バイナリデータ
     */
    fromHexString(hexString) {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    },
    /* ---------------------BLE Device method.-------------------- */
    /**
     * BLE機器と接続してServiceとCharacteristicを取得する
     */
    async connect() {
        let options = {};
        options.filters = [
            {services: [SERVICE_UUID]},
            {name: "FIDO ABS Authenticator"}
        ];

        device = await navigator.bluetooth.requestDevice(options);
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService(SERVICE_UUID);
        pCpCharacteristic = await service.getCharacteristic(CHARACTERISTIC_CONTROLPOINT_UUID);
        pStatusCharacteristic = await service.getCharacteristic(CHARACTERISTIC_STATUS_UUID);
        pCpLengthCharacteristic = await service.getCharacteristic(CHARACTERISTIC_CONTROLPOINTLENGTH_UUID);
        pSrbBitCharacteristic = await service.getCharacteristic(CHARACTERISTIC_SERVICEREVISIONBITFIELD_UUID);
        pSrbCharacteristic = await service.getCharacteristic(CHARACTERISTIC_SERVICEREVISION_UUID);
    },
    /**
     * BLE機器と切断する
     */
    async disconnect() {
        device.gatt.disconnect();
    },
    /**
     * Notifyを受付する状態にする
     * @param {characteristic} characteristic Notifyを登録するcharacteristic
     * @param {function} event_function Notifyがきたときに発火する関数
     */
    async startNotify(characteristic, event_function) {
        characteristic.addEventListener('characteristicvaluechanged', event_function);
        characteristic.startNotifications();
    },
    /**
     * Notifyを停止する
     * @param {characteritisc} characteristic Notifyを停止するcharacteritstic
     * @param {function} event_function 削除する関数
     */
    async stopNotify(characteristic, event_function) {
        characteristic.stopNotifications();
        characteristic.removeEventListener('characteristicvaluechanged', event_function);
    },
    /* ---------------------I/O function-------------------- */
    /**
     * characteristicからValueを読み取る
     * @param {characteristic} characteristic
     * @returns 読み取ったValue
     */
    async readValue(characteristic) {
        var response = await characteristic.readValue();
        var str = decoder.decode(response);
        return str;
    },
    /**
     * characteristicにValueを書き込む
     * @param {characteritics} characteristic 
     * @param {String} request 
     */
    async writeValue(characteristic, request) {
        characteristic.writeValue(this.fromHexString(request));
        console.log("FIDO Control Point");
    },
    /* ---------------------characteristic method.-------------------- */
    /**
     * FIDO Control PointにValueを書き込む(FIDO Control Pointは書き込み専用)
     * @param {String} request 
     */
    async writeControlPoint(request) {
        this.writeValue(pCpCharacteristic, request);
    },
    /**
     * FIDO Statusからの通知を登録する
     * @param {function} event_function 
     */
    async startStatus(event_function) {
        this.startNotify(pStatusCharacteristic, event_function);
        console.log("FIDO Status Registered.");
    },
    /**
     * FIDO Statusからの通知を解除する
     * @param {function} event_function 
     */
    async stopStatus(event_function) {
        this.stopNotify(pStatusCharacteristic, event_function);
        console.log("FIDO Status Unregistered.");
    },
    /**
     * FIDO Control Point LengthからValueを読み取る
     * @returns 読み取ったValue
     */
    async readControlPointLength() {
        var value = this.readValue(pCpLengthCharacteristic);
        console.log("FIDO Control Point Length");
        return value;
    },
    /**
     * FIDO Serive Revision BitfieldからValueを読み取る
     * @returns 読み取ったValue
     */
    async readServiveRevisionBitfield() {
        var value = this.readValue(pSrbBitCharacteristic);
        console.log("FIDO Service Revision Bitfield - read");
        return value;
    },
    /**
     * FIDO Service Revision BitfieldにValueを書き込む
     */
    async writeServiceRevisionBitfield() {
        this.writeValue(pSrbBitCharacteristic);
        console.log("FIDO Service Revision Bitfield - write");
    },
    /**
     * FIDO Service RevisionからValueを読み取る
     * @returns 読み取ったValue
     */
    async readServiceRevision() {
        var value = this.readValue(pSrbCharacteristic);
        console.log("FIDO Service Revision");
        return value;
    }
}