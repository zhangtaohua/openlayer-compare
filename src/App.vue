<template>
  <OpenLayerCompare :imageInfos="imageInfos"></OpenLayerCompare>
</template>

<script lang="ts">
import jaImageUrl from '/@/assets/images/ja.jpg'
import gymImageUrl from '/@/assets/images/gym.jpg'

import OpenLayerCompare from '/@/components/openlayer/OpenLayerCompare.vue';
import { defineComponent } from 'vue'

export default defineComponent({
  name: "App",
  components: {
    OpenLayerCompare
  },
  setup() {

    const jaImageInfo:StaticImageDataInfo = {
      id: 'jaId',
      name: 'jaNmae',
      longitude: 100,
      longitudeText: '100E',
      latitude: 20,
      latitudeText: '20N',
      url: jaImageUrl,
      extents: [99.96171847746696, 19.96402713576325, 100.03828152253304, 20.03597286423675]
    }

    const gymImageInfo:StaticImageDataInfo = {
      id: 'gymId',
      name: 'gymNmae',
      longitude: 100.05,
      longitudeText: '100.05E',
      latitude: 20.02,
      latitudeText: '20.02N',
      url: gymImageUrl,
      extents:[100.01171361086487, 19.98402713576325, 100.08828638913512, 20.05597286423675]
    }

    const imageInfos = [
      jaImageInfo,
      gymImageInfo
    ]

    return {
      imageInfos
    }

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
