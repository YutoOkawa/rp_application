const fs = require("fs");

module.exports = {
    devServer: {
        disableHostCheck: true,
        https: {
            key: fs.readFileSync("./cert/server_key.pem"),
            cert: fs.readFileSync("./cert/server_crt.pem")
        }
    },
}