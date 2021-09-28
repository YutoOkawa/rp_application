<template>
  <div class="authenticate">
    <h1>{{ msg }}</h1>
    <div class="connect">
        <button @click="connect()">接続</button>
        <button @click="disconnect()">切断</button>
    </div>
    <div class="user">
        <input v-model="name">
    </div>
    <div class="controlpoint">
        <button @click="authenticate(name, policy, baseURL)">ControlPoint</button>
    </div>
  </div>
</template>

<script>
import ble from '@/api/ble'
import CBOR from '@/api/cbor'
import webAuthUtil from '@/api/webauth_util'
import webauthn from '@/api/webauthn'
import utils from '@/api/utils'
export default {
  name: 'Authenticate',
  props: {
    msg: String
  },
  data () {
      return {
          name: 'test',
          policy: 'AZALEA OR Aqours ',
          baseURL: 'localhost',
          request: '',
          response: '',
          encodeResponse: new Uint8Array(0),
          credentialId: '',
          gotInfo: false,
          maxsize: 255,
          fragmentCount: 0,
          fragment: '',
          startTime: 0,
          endTime: 0
      }
  },
  methods: {
      /**
       * BLE機器を接続してNotifyを登録する
       */
      async connect() {
          await ble.connect();
          console.log("BLE connect!");
          await ble.startStatus(this.onReceiveData);
      },
      /**
       * BLE機器のNotifyを削除して接続解除する
       */
      async disconnect() {
          await ble.stopStatus(this.onReceiveData);
          await ble.disconnect();
          console.log("BLE disconnect.");
      },
      /**
       * Control Pointに値を書き込む
       */
      async writeControlPoint(request) {
          await ble.writeControlPoint(request);
      },
      /**
       * @param event 発火したイベント
       * @returns cborからデコードされた値
       */
      async onReceiveData(event) {
          this.gotInfo = false;
          var chara = event.target;
          var value = chara.value;
          this.encodeResponse = await utils.concentenation(this.encodeResponse, value.buffer);
          if (this.maxsize > value.byteLength) {
            // this.response = CBOR.decodeCBOR(this.encodeResponse);
            this.asserRe(this.baseURL, this.clientDataJSON);
            this.gotInfo = true;
            this.encodeResponse = new Uint8Array(0);
          }
      },
      /**
       * assertionOptionsを実行する
       * @param username 登録するユーザ名
       * @param policy 属性条件
       * @param baseURL FIDOサーバのURL
       * @returns assertion
       */
      async assertionOptions(username, policy, baseURL) {
          var assertion = await webauthn.asserionOptions(username, policy, baseURL);
          assertion = assertion.data;
          if (assertion.status == 'failed') {
              alert(assertion.errorMessage);
          } else {
              assertion.challenge = webAuthUtil.toArrayBuffer(assertion.challenge);
          }
          return assertion;
      },
      async assertionResult(assertion, userid, baseURL) {
          var response = await webauthn.assertionResult(assertion, userid, baseURL);
          this.endTime = performance.now();
          console.log(this.endTime - this.startTime);
          response = response.data;
          console.log(response);
      },
      /**
       * 認証を実行する
       * @param username 登録するユーザ名
       * @param policy 属性条件
       * @param baseURL FIDOサーバのURL
       */
      async authenticate(username, policy, baseURL) {
          this.startTime = performance.now();
          var assertion = await this.assertionOptions(username, policy, baseURL);
          this.clientDataJSON = webAuthUtil.generateClientDataJSON(assertion.challenge, 'webauthn.get', 'https://localhost:3000');
          var clientDataHash = webAuthUtil.generateClientDataHash(this.clientDataJSON);
          /* TODO;GetAssertionの作成 */
          var getAssertionParam = webAuthUtil.generateGetAssertionParameter(assertion, clientDataHash, policy);
          var parameter_cbor = CBOR.encodeCBOR(getAssertionParam);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);
          if (parameter_cbor.length > this.maxsize) { /* 分割パケットの場合 */
            this.request = webAuthUtil.generateRequest('83', '02', parameter_cborHex.slice(0, this.maxsize*2));
            await ble.writeControlPoint(this.request);
            /* 試しに1fragmentのみの送信 */
            for(this.fragmentCount=0; this.fragmentCount+1<parameter_cborHex.length/(2*this.maxsize); this.fragmentCount++) {
              if (this.fragmentCount+1>parameter_cborHex.length/(2*this.maxsize)) {
                this.fragment = webAuthUtil.generateContinuationFragment(webAuthUtil.makeSeqNumber(this.fragmentCount), parameter_cborHex.slice(2*this.maxsize*(this.fragmentCount+1), parameter_cborHex.length));
              } else {
                this.fragment = webAuthUtil.generateContinuationFragment(webAuthUtil.makeSeqNumber(this.fragmentCount), parameter_cborHex.slice(2*this.maxsize*(this.fragmentCount+1), 2*this.maxsize*(this.fragmentCount+2)));
              }
              await ble.writeControlPoint(this.fragment);
            }
          } else { /* 分割パケットを必要としない場合 */
            this.request = webAuthUtil.generateRequest('83', '02', parameter_cborHex);
            await this.writeControlPoint(this.request);
          }
      },
      async asserRe(baseURL, clientDataJSON) {
          /* json -> buffer -> base64url */
          clientDataJSON = JSON.stringify(clientDataJSON);
          clientDataJSON = webAuthUtil.strToBuffer(clientDataJSON);
          clientDataJSON = webAuthUtil.encodeBase64url(clientDataJSON);
          /* CBOR -> base64url */
          /* TODO:一度デコードして値を取り出す！ */
          var response = CBOR.decodeCBOR(this.encodeResponse);
          var authData = new Map();
          authData.set(0x02, response.get(2));
          authData = CBOR.encodeCBOR(authData);
          authData = webAuthUtil.encodeBase64url(authData);
          var signature = response.get(3);
          var signature_map = new Map();
          signature_map.set("Y", webAuthUtil.encodeBase64url(signature["Y"]));
          signature_map.set("W", webAuthUtil.encodeBase64url(signature["W"]));
          for (var i=0; i<4; i++) {
            signature_map.set("S"+String(i+1), webAuthUtil.encodeBase64url(signature["S"+String(i+1)]));
          }
          for (var j=0; j<1; j++) {
            signature_map.set("P"+String(j+1), webAuthUtil.encodeBase64url(signature["P"+String(j+1)]));
          }
          signature = CBOR.encodeCBOR(signature_map);
          signature = webAuthUtil.encodeBase64url(signature);
          var assertion = {
              response: {
                  authenticatorData: authData,
                  clientDataJSON: clientDataJSON,
                  signature: signature
              },
              type: 'abs'
          }
          this.assertionResult(assertion, this.name, baseURL);
      }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>