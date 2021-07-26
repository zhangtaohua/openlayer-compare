<template>
  <OpenLayerCompare></OpenLayerCompare>
</template>

<script lang="ts">
import OpenLayerCompare from '/@/components/openlayer/OpenLayerCompare.vue';
import { defineComponent } from 'vue'

export default defineComponent({
  name: "App",
  components: {
    OpenLayerCompare
  },
  setup() {

  }

});

</script>

<style lang="scss">
  @import "assets/style/base.scss";
  @import "assets/style/generalVariable.scss";
  @import "assets/style/generalStyle.scss";
  @import "assets/style/generalRang.scss";
  @import "assets/style/flex.scss";

</style>
