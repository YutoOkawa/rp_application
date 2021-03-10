<template>
  <div class="info">
    <GetInfo msg="GetInfo Page."/>
  </div>
</template>

<script>
// @ is an alias to /src
import GetInfo from '@/components/GetInfo.vue'

export default {
  name: 'Home',
  components: {
    GetInfo
  }
}
</script>
