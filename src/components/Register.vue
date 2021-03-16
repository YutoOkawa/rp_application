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
export default {
  name: 'Register',
  props: {
    msg: String
  },
  data () {
      return {
          name: 'test',
          attributes: ['IS', 'STUDENT'],
          baseURL: 'localhost',
          request: '',
          response: '',
          gotInfo: false
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
      onReceiveData(event) {
          this.gotInfo = false;
          var chara = event.target;
          var value = chara.value;
          this.response = CBOR.decodeCBOR(value);
          console.log(this.response);
          this.gotInfo = true;
      },
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
      async register(username, attributes, baseURL) {
          var attestation = await this.attestationOptions(username, attributes, baseURL);
          console.log(attestation);
          var clientDataJSON = webAuthUtil.generateClientDataJSON(attestation.challenge, 'webauthn.get', 'localhost');
          console.log(clientDataJSON);
          var clientDataHash = webAuthUtil.generateClientDataHash(clientDataJSON);
          console.log(clientDataHash);
          var makeCredentialParam = webAuthUtil.generateMakeCredentialParameter(attestation, clientDataHash);
          console.log(makeCredentialParam);
          var parameter_cbor = CBOR.encodeCBOR(makeCredentialParam);
          console.log(parameter_cbor);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);
          console.log(parameter_cborHex);
          this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex);
          console.log(this.request);
          await this.writeControlPoint(this.request);
        //   await this.writeControlPoint(request);
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
