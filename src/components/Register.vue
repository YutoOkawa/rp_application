<template>
  <div class="register">
    <h1>{{ msg }}</h1>
    <div class="connect">
        <button @click="connect()">接続</button>
        <button @click="disconnect()">切断</button>
    </div>
    <div class="user">
        <input v-model="name">
    </div>
    <div class="controlpoint">
        <button @click="register(name, attributes, baseURL)">ControlPoint</button>
    </div>
    <div class="getinfo_response" v-if="gotInfo">
        <div v-for="[key, val] in Array.from(response)" :key="key">
          {{key}}:{{val}}
        </div>
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
  name: 'Register',
  props: {
    msg: String
  },
  data () {
      return {
          name: 'test',
          attributes: ['GUARDIANSHIP'],
          baseURL: 'localhost',
          clientDataJSON: '',
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
            this.atteRe(this.baseURL, this.clientDataJSON);
            this.gotInfo = true;
            this.encodeResponse = new Uint8Array(0);
          }
      },
      /**
       * attestationOptionsを実行する
       * @param username 登録するユーザ名
       * @param attributes 登録する属性
       * @param baseURL FIDOサーバのURL
       * @returns attestation
       */
      async attestationOptions(username, attributes, baseURL) {
          var attestation = await webauthn.attestationOptions(username, attributes, baseURL);
          attestation = attestation.data;
          if (attestation.status == 'failed') {
              alert(attestation.message);
          } else {
              attestation.challenge = webAuthUtil.toArrayBuffer(attestation.challenge);
              attestation.user.id = webAuthUtil.toArrayBuffer(attestation.user.id);
          }
          return attestation;
      },
      async attestationResult(attestation, userid, baseURL) {
          var response = await webauthn.attestationResult(attestation, userid, baseURL);
          this.endTime = performance.now();
          console.log(this.endTime - this.startTime);
          response = response.data;
          console.log(response);
      },
      async attrgen(username, attributes, baseURL) {
          var setupData = await webauthn.setupKgc(username, baseURL);
          setupData = setupData.data;
          this.credentialId = setupData.credentialId;
          var keydata = await webauthn.attrgen(this.credentialId, attributes, baseURL);
          return keydata;
      },
      /**
       * 登録を実行する
       * @param username 登録するユーザ名
       * @param attributes 登録する属性
       * @param baseURL FIDOサーバのURL
       */
      async register(username, attributes, baseURL) {
          this.startTime = performance.now();
          var attestation = await this.attestationOptions(username, attributes, baseURL);
          this.clientDataJSON = webAuthUtil.generateClientDataJSON(attestation.challenge, 'webauthn.create', 'https://localhost:3000');
          var clientDataHash = webAuthUtil.generateClientDataHash(this.clientDataJSON);
          var keydata = await this.attrgen(username, attributes, baseURL);
          keydata = keydata.data;
          var makeCredentialParam = webAuthUtil.generateMakeCredentialParameter(attestation, clientDataHash, keydata);
          var parameter_cbor = CBOR.encodeCBOR(makeCredentialParam);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);
          if (parameter_cbor.length > this.maxsize) { /* 分割パケットの場合 */
            this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex.slice(0, this.maxsize*2));
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
            this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex);
            await this.writeControlPoint(this.request);
          }
      },
      async atteRe(baseURL, clientDataJSON) {
          /* json -> buffer -> base64url */
          clientDataJSON = JSON.stringify(clientDataJSON);
          clientDataJSON = webAuthUtil.strToBuffer(clientDataJSON);
          clientDataJSON = webAuthUtil.encodeBase64url(clientDataJSON);
          /* CBOR -> base64url */
          var response = CBOR.decodeCBOR(this.encodeResponse);
          var authData = response.get(2);
          var credentialIdLength = authData.slice(53, 55);
          credentialIdLength = Buffer.from(credentialIdLength).readUInt16BE(0,false);
          var credentialId = authData.slice(55, 55+credentialIdLength);
          var attestationObject = webAuthUtil.encodeBase64url(this.encodeResponse);
          /* attestationデータの作成 */
          var attestation = {
              id: webAuthUtil.encodeBase64url(credentialId),
              rawId: webAuthUtil.encodeBase64url(credentialId),
              response: {
                  attestationObject: attestationObject,
                  clientDataJSON: clientDataJSON
              },
              type: 'abs'
          };
          this.attestationResult(attestation, this.name, baseURL);
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
