<template>
  <div class="getinfo">
    <h1>{{ msg }}</h1>
    <div class="connect">
        <button @click="connect()">接続</button>
        <button @click="disconnect()">切断</button>
    </div>
    <div class="controlpoint">
        <input v-model="request">
        <button @click="writeControlPoint(request)">ControlPoint</button>
    </div>
  </div>
</template>

<script>
import ble from '@/api/ble'
export default {
  name: 'GetInfo',
  props: {
    msg: String
  },
  data () {
      return {
          request: '83000104'
      }
  },
  methods: {
      async connect() {
          await ble.connect();
          console.log("BLE connect!");
          await ble.startStatus();
      },
      async disconnect() {
          await ble.stopStatus();
          await ble.disconnect();
          console.log("BLE disconnect.");
      },
      async writeControlPoint(request) {
          await ble.writeControlPoint(request);
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
