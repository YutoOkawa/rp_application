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
          attributes: ['Aqours'],
          baseURL: 'localhost',
          request: '',
          response: '',
          credentialId: '',
          gotInfo: false,
          maxsize: 255,
          fragmentCount: 0,
          fragment: ''
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
      async attrgen(username, attributes, baseURL) {
          var setupData = await webauthn.setupKgc(username, baseURL);
          setupData = setupData.data;
          this.credentialId = setupData.credentialId;
          var keydata = await webauthn.attrgen(this.credentialId, attributes, baseURL);
          return keydata;
      },
      async writePacket(packet) {
        console.log(packet);
        await this.writeControlPoint(packet);
        return 1;
      },
      /**
       * 登録を実行する
       * @param username 登録するユーザ名
       * @param attributes 登録する属性
       * @param baseURL FIDOサーバのURL
       */
      async register(username, attributes, baseURL) {
          var attestation = await this.attestationOptions(username, attributes, baseURL);
          console.log(attestation);
          var clientDataJSON = webAuthUtil.generateClientDataJSON(attestation.challenge, 'webauthn.get', 'localhost');
          console.log(clientDataJSON);
          var clientDataHash = webAuthUtil.generateClientDataHash(clientDataJSON);
          console.log(clientDataHash);
          var keydata = await this.attrgen(username, attributes, baseURL);
          keydata = keydata.data;
          var makeCredentialParam = webAuthUtil.generateMakeCredentialParameter(attestation, clientDataHash, keydata);
          console.log(makeCredentialParam);
          var parameter_cbor = CBOR.encodeCBOR(makeCredentialParam);
          console.log(parameter_cbor);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);
          console.log(parameter_cborHex);
          console.log(parameter_cbor.length/this.maxsize);
          if (parameter_cbor.length > this.maxsize) { /* 分割パケットの場合 */
            this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex.slice(0, this.maxsize*2));
            console.log(this.request);
            // await this.writePacket(this.request);
            var first = await ble.writeControlPoint(this.request);
            console.log(first);
            /* 試しに1fragmentのみの送信 */
            for(this.fragmentCount=0; this.fragmentCount+1<parameter_cborHex.length/(2*this.maxsize); this.fragmentCount++) {
              if (this.fragmentCount+1>parameter_cborHex.length/(2*this.maxsize)) {
                this.fragment = webAuthUtil.generateContinuationFragment(webAuthUtil.makeSeqNumber(this.fragmentCount), parameter_cborHex.slice(2*this.maxsize*(this.fragmentCount+1), parameter_cborHex.length));
              } else {
                this.fragment = webAuthUtil.generateContinuationFragment(webAuthUtil.makeSeqNumber(this.fragmentCount), parameter_cborHex.slice(2*this.maxsize*(this.fragmentCount+1), 2*this.maxsize*(this.fragmentCount+2)));
              }
              console.log(this.fragment);
              // await this.writePacket(this.fragment);
              var second = await ble.writeControlPoint(this.fragment);
              console.log(second);
            }
          } else { /* 分割パケットを必要としない場合 */
            this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex);
            console.log(this.request);
            await this.writeControlPoint(this.request);
          }
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
