<template>
  <div class="authenticate">
    <Authenticate msg="Authenticate Page."/>
  </div>
</template>

<script>
// @ is an alias to /src
import Authenticate from '@/components/Authenticate.vue'

export default {
  name: 'AuthenticatePage',
  components: {
    Authenticate
  }
}
</script>
