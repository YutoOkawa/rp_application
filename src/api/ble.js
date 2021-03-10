const SERVICE_UUID = "0000fffd-0000-1000-8000-00805f9b34fa";
const CHARACTERISTIC_CONTROLPOINT_UUID = "f1d0fff1-deaa-ecee-b42f-c9ba7ed623bb";
const CHARACTERISTIC_STATUS_UUID = "f1d0fff2-deaa-ecee-b42f-c9ba7ed623bb";
const CHARACTERISTIC_CONTROLPOINTLENGTH_UUID = "f1d0fff3-deaa-ecee-b42f-c9ba7ed623bb";
const CHARACTERISTIC_SERVICEREVISIONBITFIELD_UUID = "f1d0fff4-deaa-ecee-b42f-c9ba7ed623bb";
const CHARACTERISTIC_SERVICEREVISION_UUID = "00002a28-0000-1000-8000-00805f9b34fb";

var device;
var pCpCharacteristic;
var pStatusCharacteristic;
var pCpLengthCharacteristic;
var pSrbBitCharacteristic;
var pSrbCharacteristic;
var decoder = new TextDecoder("utf-8");

export default {
    fromHexString(hexString) {
        return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    },
    onReceiveData(event) {
        var chara = event.target;
        var value = chara.value;
        console.log(value);
    },
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
    async disconnect() {
        device.gatt.disconnect();
    },
    async startNotify(characteristic) {
        characteristic.addEventListener('characteristicvaluechanged', this.onReceiveData);
        characteristic.startNotifications();
    },
    async stopNotify(characteristic) {
        characteristic.stopNotifications();
        characteristic.removeEventListener('characteristicvaluechanged', this.onReceiveData);
    },
    /* in/out function */
    async readValue(characteristic) {
        var response = await characteristic.readValue();
        var str = decoder.decode(response);
        console.log(str);
    },
    async writeValue(characteristic, request) {
        characteristic.writeValue(this.fromHexString(request));
        console.log("FIDO Control Point");
    },
    /* characteristic method. */
    async writeControlPoint(request) {
        this.writeValue(pCpCharacteristic, request);
    },
    async startStatus() {
        this.startNotify(pStatusCharacteristic);
        console.log("FIDO Status Registered.");
    },
    async stopStatus() {
        this.stopNotify(pStatusCharacteristic);
        console.log("FIDO Status Unregistered.");
    },
    async readControlPointLength() {
        this.readValue(pCpLengthCharacteristic);
        console.log("FIDO Control Point Length");
    },
    async readServiveRevisionBitfield() {
        this.readValue(pSrbBitCharacteristic);
        console.log("FIDO Service Revision Bitfield - read");
    },
    async writeServiceRevisionBitfield() {
        this.writeValue(pSrbBitCharacteristic);
        console.log("FIDO Service Revision Bitfield - write");
    },
    async readServiceRevision() {
        this.readValue(pSrbCharacteristic);
        console.log("FIDO Service Revision");
    }
}