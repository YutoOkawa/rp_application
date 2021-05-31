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
export default {
  name: 'Authenticate',
  props: {
    msg: String
  },
  data () {
      return {
          name: 'test',
          policy: 'Aqours OR AZALEA',
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
      async writePacket(packet) {
        console.log(packet);
        await this.writeControlPoint(packet);
        return 1;
      },
      /**
       * 認証を実行する
       * @param username 登録するユーザ名
       * @param policy 属性条件
       * @param baseURL FIDOサーバのURL
       */
      async authenticate(username, policy, baseURL) {
          console.log('a');
          var assertion = await this.assertionOptions(username, policy, baseURL);
          console.log(assertion);
          var clientDataJSON = webAuthUtil.generateClientDataJSON(assertion.challenge, 'webauthn.get', 'localhost');
          console.log(clientDataJSON);
          var clientDataHash = webAuthUtil.generateClientDataHash(clientDataJSON);
          console.log(clientDataHash);
          /* TODO;GetAssertionの作成 */
          var getAssertionParam = webAuthUtil.generateGetAssertionParameter(assertion, clientDataHash, policy);
          console.log(getAssertionParam);
          var parameter_cbor = CBOR.encodeCBOR(getAssertionParam);
          console.log(parameter_cbor);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);
          console.log(parameter_cborHex);
          console.log(parameter_cbor.length/this.maxsize);
          if (parameter_cbor.length > this.maxsize) { /* 分割パケットの場合 */
            this.request = webAuthUtil.generateRequest('83', '02', parameter_cborHex.slice(0, this.maxsize*2));
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
            this.request = webAuthUtil.generateRequest('83', '02', parameter_cborHex);
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