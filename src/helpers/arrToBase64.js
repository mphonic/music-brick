export default function arrToBase64(arr) {
    var buf = new Uint8Array(arr);
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');
    return btoa(binstr);
}