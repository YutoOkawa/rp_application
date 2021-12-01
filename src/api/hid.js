let deviceFilter = {
    vendorId: 0x2e8a,
    productId: 0x00c0,
    usagePage: 0xf1d1,
    usage: 0x01
};

let requestParams = {
    filters: [deviceFilter]
};

let outputReportId = 0x00;

/**
 * HID Device
 */
var device;

export default {
    /* -------------------HID Device Method.------------------- */
    /**
     * HID Deviceと接続してDevice情報を取得する
     */
    async connect() {
        device = await navigator.hid.requestDevice(requestParams);
        if (device.length == 0) {
            console.log('error');
        }
        device = device[0];
        await device.open();
        console.log('device.open()');
    },
    /**
     * HID Deviceと切断する
     */
    disconnect() {
        device.close();
        console.log('device.close()')
    },
    /**
     * handleInputReportを設定する
     * @param {function} event_function 
     */
    setInputReport(event_function) {
        device.oninputreport = event_function;
        console.log('FIDO handleInputReport Registered.');
    },
    /**
     * HID DeviceにReportを送信する
     * @param {String} report 
     */
    async sendReport(report) {
        await device.sendReport(outputReportId, report);
    }
}