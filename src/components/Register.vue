<template>
  <div class="register">
    <h1>{{ msg }}</h1>
    <div class="selection">
      <input type="radio" id="ble" value="BLE" v-model="platforms">
      <label for="BLE">BLE</label>
      <input type="radio" id="hid" value="HID" v-model="platforms">
      <label for="HID">HID</label>
      <br>
      <span>Picked: {{ platforms }}</span>
    </div>
    <div class="connect">
        <button @click="connect()">connect</button>
        <button @click="disconnect()">disconnect</button>
    </div>
    <div class="user">
        <input v-model="name">
    </div>
    <div class="attribute_list">
      <input type="checkbox" id="user" value="USER" v-model="attributes">
      <label for="USER">USER</label>
      <input type="checkbox" id="parents" value="PARENTS" v-model="attributes">
      <label for="PARENTS">PARENTS</label>
      <input type="checkbox" id="guardianship" value="GUARDIANSHIP" v-model="attributes">
      <label for="GUARDIANSHIP">GUARDIANSHIP</label>
      <br>
      <span>{{ attributes }}</span>
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
import hid from '@/api/hid'
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
          attributes: [],
          platforms: '',
          baseURL: 'localhost',
          clientDataJSON: '',
          request: '',
          response: '',
          encodeResponse: new Uint8Array(0),
          credentialId: '',
          gotInfo: false,
          maxsize: 255,
					hid_maxsize: 64,
          packetsize: 0,
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
          if (this.platforms == "BLE") {
              await ble.connect();
              console.log("BLE connect!");
              await ble.startStatus(this.onReceiveData);
          } else if (this.platforms == "HID") {
              await hid.connect();
              console.log("HID connect!");
              hid.setInputReport(this.handleInputReport);
          } else {
              alert("select device type: BLE or HID.");
          }
      },
      /**
       * BLE機器のNotifyを削除して接続解除する
       */
      async disconnect() {
          if (this.platforms == "BLE") {
            await ble.stopStatus(this.onReceiveData);
            await ble.disconnect();
            console.log("BLE disconnect.");
          } else if (this.platforms == "HID") {
            await hid.disconnect();
          }
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
      async handleInputReport(event) {
          this.gotInfo = false;
          var buffer = event.data.buffer;
          if (this.encodeResponse.byteLength == 0) { // 初回レスポンスでのデータサイズの取得
              let initialResponse = new Uint8Array(buffer);
              this.packetsize = initialResponse[6] * 256
              this.packetsize += initialResponse[7];
              buffer = buffer.slice(9);
              this.encodeResponse = buffer;
          } else {
              this.encodeResponse = hid.concentenation(this.encodeResponse, buffer, this.packetsize);
          }

          if (this.encodeResponse.byteLength == this.packetsize) { //登録レスポンスの作成
              console.log(this.encodeResponse);
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
          /* Requestデータの取得と作成 */
          // rp_application -> FIDOServer optionsの取得
          var attestation = await this.attestationOptions(username, attributes, baseURL);
          // clientDataJSONの作成
          this.clientDataJSON = webAuthUtil.generateClientDataJSON(attestation.challenge, 'webauthn.create', 'https://localhost:3000');
          var clientDataHash = webAuthUtil.generateClientDataHash(this.clientDataJSON);
          // 鍵データの取得
          var keydata = await this.attrgen(username, attributes, baseURL);
          keydata = keydata.data;
          // rp_application -> Authenticator Requestデータ部の作成
          var makeCredentialParam = webAuthUtil.generateMakeCredentialParameter(attestation, clientDataHash, keydata);
          var parameter_cbor = CBOR.encodeCBOR(makeCredentialParam);
          var parameter_cborHex = webAuthUtil.convertHex(parameter_cbor);

          /* rp_application -> Authenticator Requestデータの送信 */
					if (this.platforms == "BLE") { /* BLEの場合の処理 */
						if (parameter_cbor.length > this.maxsize) { /* 分割パケットの場合 */
							// 初期パケットの送信
							this.request = webAuthUtil.generateRequest('83', '01', parameter_cborHex.slice(0, this.maxsize*2));
							await ble.writeControlPoint(this.request);
							// 継続パケットの送信
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
					} else if (this.platforms == "HID") {
						// TODO:channelIDとcmdの作成をうまく関数化したい
            // channelIDの設定
						var channelID = new ArrayBuffer(4);
						var channelID_buf = new Uint8Array(channelID);
						for (var i=0; i<4; i++) {
							channelID_buf[i] = 0xff;
            }
            // HIDコマンドの設定(HID_CBOR)
						var cmd_hid = new ArrayBuffer(1);
						var cmd_hid_buf = new Uint8Array(cmd_hid);
						cmd_hid_buf[0] = 0x90;
            // AuthenticatorAPIのコマンド設定(MakeCredential:0x01)
            var cmd_authapi = new ArrayBuffer(1);
            var cmd_authapi_buf = new Uint8Array(cmd_authapi);
            cmd_authapi_buf[0] = 0x01;
            // パケット送信
						if (parameter_cbor.length > this.hid_maxsize) { /* 分割パケットの場合 */
              // 切り出し位置の計算
              var pos = 0;
              pos += this.hid_maxsize-9;
              // 継続パケットのパケットナンバー
              var seq = new ArrayBuffer(1);
							this.request = hid.generateRequest(channelID, cmd_hid, parameter_cbor.length, cmd_authapi, parameter_cbor.buffer.slice(0, pos));
							await hid.sendReport(this.request);
              // 継続パケットの送信
              for (this.fragmentCount=0; this.fragmentCount<(parameter_cbor.length-this.hid_maxsize-9)/(this.hid_maxsize-5); this.fragmentCount++) {
                if (this.fragmentCount>(parameter_cbor.length-this.hid_maxsize-9)/(this.hid_maxsize-5)) {
                  this.fragment = hid.generateContinuation(channelID, seq, parameter_cbor.slice(pos, parameter_cbor.length));
                  // await hid.sendReport(this.fragment);
                  await this.sendReport(this.fragment);
                } else {
                  this.fragment = hid.generateContinuation(channelID, seq, parameter_cbor.slice(pos, pos+this.hid_maxsize-5));
                  // await hid.sendReport(this.fragment);
                  await this.sendReport(this.fragment);
                }
                // 切り出し位置更新
                pos += this.hid_maxsize-5;
                // パケットナンバー更新
                var seq_buf = new Uint8Array(seq);
                seq_buf[0]++;
              }
						} else {
							this.request = hid.generateRequest(channelID, cmd_hid, parameter_cbor.length, cmd_authapi, parameter_cbor.buffer);
							await hid.sendReport(this.request);
						}
					}
      },
      async sendReport(report) {
          setTimeout(function(){hid.sendReport(report);}, 20);
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
