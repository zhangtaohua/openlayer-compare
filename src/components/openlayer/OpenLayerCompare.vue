<template>
  <div id="openLayersMapContainner" class="map_base_containner">
    <div class="map_box">
      <div
        id="openLayersMapBaseBox"
        class="map_view"
      />
    </div>

    <div
      v-if="isLocked"
      class="mask_view"
    />

    <div v-if="imageDomControl.isShowMainBox" id="image_containner" class="row_nw_sb_center image_containner">
      <div v-if="imageDomControl.isShowLeftBox" class="row_nw_center_center image_left_box"
        @dragenter.prevent="leftBoxDragEnterHandle"
        @dragover.prevent="leftBoxDragoverHandle"
        @drop.prevent="leftBoxDropHandle"
        @dragleave.prevent="leftBoxDragleaveHandle"
      ></div>
      <div v-else class="row_nw_center_center image_left_box image_box_hidden">
        <div class="row_nw_center_center image_list_show_box">
          <img class="image" :src="leftImageInfo.imageInfo.url">
        </div>
      </div>


      <div v-if="imageDomControl.isShowRightBox" class="row_nw_center_center image_right_box"
        @dragenter.prevent="rightBoxDragEnterHandle"
        @dragover.prevent="rightBoxDragoverHandle"
        @drop.prevent="rightBoxDropHandle"
        @dragleave.prevent="rightBoxDragleaveHandle"
      ></div>
      <div v-else class="row_nw_center_center image_right_box image_box_hidden">
        <div class="row_nw_center_center image_list_show_box">
          <img class="image" :src="rightImageInfo.imageInfo.url">
        </div>
      </div>

      <div class="col_nw_fs_center image_list_box">
        <div v-for="image in imageInfos" :key="'ol_image_' + image.id"
          class="row_nw_center_center image_list_show_box">
          <img class="image" :src="image.url" draggable="true"
            @dragstart="imageDragstartHandle(image)"
            @drag="imageDragHandle"
            @dragend="imageDragendHandle"
          >
        </div>
      </div>
    </div>

    <div v-show="rollerControl.isShowRoller"
      id="roller_mouse" 
      class="roller_line"  
    >
    </div>

  </div>
</template>

<script lang="ts">
import 'ol/ol.css';
import { Map} from 'ol';
import * as olProj from 'ol/proj';
import PointerInteraction from 'ol/interaction/Pointer';

import { defineComponent, onMounted, reactive, toRefs, ref, computed, watch } from 'vue';

import {  OpenLayerMapControl,
          OpenLayerStaticImages, OpenLayerPathLine, 
          initOpenLayerCampareMap,
          getLngLatFromEvent, getRectanglePathExtent, getMousePositionControl
        } from '/@/hooks/openLayer/openLayerCompare'

import {getLngLatFromText, calibrateOpenLayerLngLat, geoMeter2Lat, geoMeter2Lng } from '/@/utils/common/geoCommon'

export default defineComponent({
  name: 'OpenLayerCompare',
  props:{
    imageInfos: {
      type: Array,
      default() {
        return []
      }
    },
    rollerType: {
      type:String,
      default:"horizontalLine"   // "horizontalLine" "verticalLine" "fullAngle"
    }
  },
  setup(props, ctx) {
    const {innerHeight: windowInnerHeight, innerWidth: windowInnerWidth } = window

    const maxMapLevel:number = 21;
    const minMapLevel:number = 3; // 2.8657332708517589

    const mapControlStatus = reactive({
      isShowControl: true,
      isShowSearch: false,
      isLocked: false,
      zoomInIsDisable: false,
      zoomOutIsDisable: true,
    });

    const imageDomControl = reactive({
      isShowMainBox: true,
      isShowLeftBox: true,
      isShowRightBox: true,
      isShowListBox: true
    })

    const rollerControl = reactive({
      isShowRoller: false
    })

    let openLayersHandler:Map;
    let pointerInteraction:PointerInteraction;
    let mapControlHandler:OpenLayerMapControl;
    
    const cursor:string ='pointer';
    let previousCursor: string | undefined | null;

    let coordinateOld;
    let FeatureOld;
    let FeatureDeltaLngLatOld;
    let pointFeatureMarkFeature;

    let staticImageLeftHandler: OpenLayerStaticImages;
    let staticImageRightHandler: OpenLayerStaticImages;
    
    let staticRollerHandler: OpenLayerPathLine;

    let leftImageInfo:any = reactive({
      isDroped: false,
      imageInfo: {}
    });
    let rightImageInfo:any = reactive({
      isDroped: false,
      imageInfo: {}
    });

    let staticImageViewInfo = reactive({
      extents: [],
      center: []
    })

    let dropedImageCounter = ref(0)

    onMounted(() => {
      init()
    })

    watch(()=>dropedImageCounter , 
      (dropedImageCounterNew, dropedImageCounterOld) => {
        if(dropedImageCounter.value >= 2) {
          console.log("开始绘图")
          hiddenAllImageBox()
          addSimulateImage()
        }
      }, 
      {
        deep:true,
        immediate:false
      }
    )

    function hiddenAllImageBox() {
      imageDomControl.isShowMainBox = false
      rollerControl.isShowRoller = true
    }

    function init() {
      openLayersHandler = initOpenLayerCampareMap(minMapLevel, maxMapLevel)
      addMapControlHandler()
    }

    function addMapControlHandler() {
      mapControlHandler = new OpenLayerMapControl(openLayersHandler, minMapLevel, maxMapLevel)
      staticImageLeftHandler = new OpenLayerStaticImages(openLayersHandler);
      staticImageRightHandler = new OpenLayerStaticImages(openLayersHandler);

      if(props.rollerType === "fullAngle") { 

      } else {
        staticRollerHandler = new OpenLayerPathLine(openLayersHandler)
      }
      

      pointerInteraction = new PointerInteraction({
        handleDownEvent: pointerDownEventHandle,
        handleDragEvent: pointerDragEventHandle,
        handleMoveEvent: pointerMoveEventHandle,
        handleUpEvent: pointerUpEventHandle
      })
      openLayersHandler.addInteraction(pointerInteraction)
    }

    function addSimulateImage() {
      staticImageLeftHandler.add(leftImageInfo.imageInfo)
      staticImageRightHandler.add(rightImageInfo.imageInfo)
      getImageExtents();
      addRooler();
      mapControlHandler.flytoPoint(staticImageViewInfo.center[0], staticImageViewInfo.center[1])
    }

    function addRooler() {
      const {
        longitude,
        longitudeText, 
        latitude,
        latitudeText } = getLngLatFromText(String(staticImageViewInfo.center[0]), String(staticImageViewInfo.center[1]));

      if(props.rollerType === "horizontalLine") { 
        let pathStart = [longitude, -84.5]
        pathStart = olProj.transform(pathStart, 'EPSG:4326', 'EPSG:3857')
        let pathEnd = [longitude, 84.5]
        pathEnd = olProj.transform(pathEnd, 'EPSG:4326', 'EPSG:3857')

        const pathLineInfo = {
          id: 'pathline',
          name:'pathline',
          longitude,
          longitudeText,
          latitude,
          latitudeText, 
          paths: [ pathStart, pathEnd],
          rollerType: 'horizontalLine',
          coordinate: [] 
        }
        staticRollerHandler.add(pathLineInfo)
      } else if(props.rollerType === "verticalLine") { 
        staticRollerHandler.add()
      } else  if(props.rollerType === "fullAngle") { 

      }
    }

    function getImageExtents() {
      let longitudeArr = [
        leftImageInfo.imageInfo.extents[0],
        leftImageInfo.imageInfo.extents[2],
        rightImageInfo.imageInfo.extents[0],
        rightImageInfo.imageInfo.extents[2],
      ]
      longitudeArr.sort((a, b) => a - b)
      

      let latitudeArr = [
        leftImageInfo.imageInfo.extents[1],
        leftImageInfo.imageInfo.extents[3],
        rightImageInfo.imageInfo.extents[1],
        rightImageInfo.imageInfo.extents[3],
      ]
      latitudeArr.sort((a, b) => a - b)

      const viewExtents = [
        longitudeArr[0], latitudeArr[0], longitudeArr[3], latitudeArr[3], 
      ]

      const viewCenter = [
        (longitudeArr[0] + longitudeArr[3]) / 2,
        (latitudeArr[0] + latitudeArr[3]) / 2,
      ]

      console.log(longitudeArr, latitudeArr, viewExtents, viewCenter)
      staticImageViewInfo.extents = viewExtents
      staticImageViewInfo.center = viewCenter
      return {
        viewExtents,
        viewCenter
        }
    }

    function pointerDownEventHandle(event:any) {
      const map = event.map
      const feature = map.forEachFeatureAtPixel(event.pixel, function(feature:any) {
        if (feature.getId() === 'createOrderPoint') {
          return feature
        }
      })
      if (feature) {

      }
      return !!feature
    }

    function pointerDragEventHandle(event:any) {
    }

    function pointerMoveEventHandle(event:any) {
      // console.log("move",event.coordinate)
      staticImageRightHandler.resizeX(rightImageInfo.imageInfo, event.coordinate)
      // staticImageRightHandler.resizeY(rightImageInfo.imageInfo, event.coordinate)
      // if (cursor) {
      //   const map = event.map
      //   var feature = map.forEachFeatureAtPixel(event.pixel, function(feature:any) {
      //   const featureProperties = feature.getProperties()
      //   const featureId = feature.getId()
      //     if (featureProperties && featureProperties.customize ) {
      //       return feature
      //     }
      //   })
      //   var element = event.map.getTargetElement()
      //   if (feature) {
      //     const popupData = feature.values_.meta
      //     if (element.style.cursor != cursor) {
      //       previousCursor = element.style.cursor
      //       element.style.cursor = cursor
      //     }
      //   } else if (previousCursor !== undefined) {
      //     element.style.cursor = previousCursor
      //     previousCursor = undefined
      //   }
      // }
    }

    let currentImageInfo:any;
    function pointerUpEventHandle(event:any) {
      const lnglat = olProj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326')
      coordinateOld = null;
      FeatureOld = null;
      return false
    }

    function leftBoxDragEnterHandle() {
      // console.log("leftBoxDragEnterHandle")
      return true;
    }
    function leftBoxDragoverHandle() {
      // console.log("leftBoxDragoverHandle")
      return true;
    }
    function leftBoxDropHandle(event) {
      leftImageInfo.isDroped = true;
      leftImageInfo.imageInfo = currentImageInfo;
      imageDomControl.isShowLeftBox = false;
      dropedImageCounter.value++
    }
    function leftBoxDragleaveHandle() {
      // console.log("leftBoxDragleaveHandle")
      return true;
    }
    function rightBoxDragEnterHandle() {
      // console.log("rightBoxDragEnterHandle")
      return true;
    }
    function rightBoxDragoverHandle() {
      // console.log("rightBoxDragoverHandle")
      return true;
    }
    function rightBoxDropHandle() {
      rightImageInfo.isDroped = true;
      rightImageInfo.imageInfo = currentImageInfo;
      imageDomControl.isShowRightBox = false;
      dropedImageCounter.value++
    }
    function rightBoxDragleaveHandle() {
      // console.log("rightBoxDragleaveHandle")
      return true;
    }

    function imageDragstartHandle(image) {
      currentImageInfo = image
      return true;
    }
    function imageDragHandle() {
      return true;
    }
    function imageDragendHandle() {
      return true;
    }

      
    return {
      imageDomControl,
      rollerControl,
      ...toRefs(mapControlStatus),
      leftImageInfo,
      rightImageInfo,
      leftBoxDragEnterHandle,
      leftBoxDragoverHandle,
      leftBoxDropHandle,
      leftBoxDragleaveHandle,
      rightBoxDragEnterHandle,
      rightBoxDragoverHandle,
      rightBoxDropHandle,
      rightBoxDragleaveHandle,
      imageDragstartHandle,
      imageDragHandle,
      imageDragendHandle,
    }
  }
});
</script>

<style scoped lang="scss">
  .map_base_containner {
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1
  }

  .map_box {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    flex: 1
  }

  .map_view {
    width: 100%;
    height: 100%;
    background-color: #f0f0f0;
    display: flex;
    flex: 1
  }

  .mask_view {
    width: 100%;
    height: 100%;
    background-color: black;
    z-index: 2;
  }

  .image_containner {
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    bottom: 0;
  }

  .image_left_box {
    width: 40%;
    height: 100%;
    border-radius: 12px;
    border: 1px solid burlywood;
  }

  .image_right_box {
    width: 40%;
    height: 100%;
    border-radius: 12px;
    border: 1px solid skyblue;
  }

  .image_box_hidden {
    border: 1px solid red;
  }

  .image_list_box {
    width: 15%;
    height: 100%;
    border-radius: 12px;
    border: 1px solid paleturquoise;
  }

  .image_list_show_box {
    width: 100%;
    height: auto;
    margin: 10px 0;
  }

  .image {
    width: 98%;
    height: auto;
    border-radius: 12px;
  }

  .roller_line {
    width: 10px;
    height: 100vh;
    border: 1px solid red;
    background-color: red;
    position: fixed;
    top: 0;
    left: 50%;
  }



</style>

