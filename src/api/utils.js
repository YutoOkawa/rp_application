export default {
    async concentenation(f_segment, b_segment) {
        var sumLength = 0;
        sumLength += f_segment.byteLength;
        sumLength += b_segment.byteLength;
        var whole = new Uint8Array(sumLength);
        var pos = 0;
        whole.set(new Uint8Array(f_segment), pos);
        pos += f_segment.byteLength;
        whole.set(new Uint8Array(b_segment), pos);
        return whole.buffer;
    }
}