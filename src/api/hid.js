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
     * @param {ArrayBuffer} report 
     */
    async sendReport(report) {
        await device.sendReport(outputReportId, report);
    },
    /* -------------------HID Util Method.------------------- */
    /**
     * 認証器からのResponseとfragmentを繋ぎ合わせる
     * @param {ArrayBuffer} f_segment 
     * @param {ArrayBuffer} b_segment 
     * @param {int} maxsize
     */
    concentenation(f_segment, b_segment, maxsize) {
        // 連結後配列サイズの計算
        var sumLength = 0;
        sumLength += f_segment.byteLength;
        b_segment = b_segment.slice(5);
        if (sumLength + b_segment.byteLength > maxsize) { // パケットの最大サイズを超えた場合
            let huyou = sumLength + b_segment.byteLength - maxsize;
            b_segment = b_segment.slice(0, -1*huyou);
            sumLength = maxsize;
        } else {
            sumLength += b_segment.byteLength;
        }
        // 連結配列の作成
        var whole = new Uint8Array(sumLength);
        var pos = 0;
        whole.set(new Uint8Array(f_segment), pos);
        pos += f_segment.byteLength;
        whole.set(new Uint8Array(b_segment), pos);
        return whole;
    },
    /**
     * HIDに対応したRequestデータを生成する
     * @param {ArrayBuffer} channelID 
     * @param {ArrayBuffer} cmd_hid
     * @param {int} length
     * @param {ArrayBuffer} cmd_authapi
     * @param {ArrayBuffer} parameter
     * @returns ArrayBuffer
     */
    generateRequest(channelID, cmd_hid, length, cmd_authapi, parameter) {
        var pos = 0;
        var request = new Uint8Array(64);
        // channelID
        request.set(new Uint8Array(channelID), pos);
        pos += channelID.byteLength;
        // CMD_HID
        request.set(new Uint8Array(cmd_hid), pos);
        pos += cmd_hid.byteLength;
        // BCNTH
        var bcnth = new ArrayBuffer(1);
        var bcnth_buf = new Uint8Array(bcnth);
        bcnth_buf[0] = 0x00;
        request.set(new Uint8Array(bcnth), pos);
        pos += bcnth.byteLength;
        // BCNTL
        var bcntl = new ArrayBuffer(2);
        var bcntl_buf = new Uint8Array(bcntl);
        bcntl_buf[0] = length/256;
        bcntl_buf[1] = length%256;
        request.set(new Uint8Array(bcntl), pos);
        pos += bcntl.byteLength;
        // CMD_AUTHAPI
        request.set(new Uint8Array(cmd_authapi), pos);
        pos += cmd_authapi.byteLength;
        // parameter
        request.set(new Uint8Array(parameter), pos);
        return request.buffer;
    },
    /**
     * 
     * @param {ArrayBuffer} channelID 
     * @param {ArrayBuffer} seq 
     * @param {ArrayBuffer} parameter 
     * @returns 
     */
    generateContinuation(channelID, seq, parameter) {
        var pos = 0;
        var continuatnion = new Uint8Array(64);
        // channelID
        continuatnion.set(new Uint8Array(channelID), pos);
        pos += channelID.byteLength;
        // seq
        continuatnion.set(new Uint8Array(seq), pos);
        pos += seq.byteLength;
        // parameter
        continuatnion.set(new Uint8Array(parameter), pos);
        return continuatnion.buffer;
    }
}