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

    <div v-if="isShowImageContainner" id="image_containner" class="row_nw_sb_center image_containner">
      <div class="row_nw_center_center image_left_box"></div>
      <div class="row_nw_center_center image_right_box"></div>
    </div>

    <div v-if="isShowRoller" id="roller" class="roller_shutter"
    :style="rollerRunTimeStyle"
    @mousedown="rollerMouseDownHandle"
    @mousemove="rollerMouseMoveHandle"
    @mouseup="rollerMouserUpHandle"
    ></div>

  </div>
</template>

<script lang="ts">
import jaImageUrl from '/@/assets/images/ja.jpg'
import gymImageUrl from '/@/assets/images/gym.jpg'

import { CREATEORDER, ORDERLIST, TARGETLIB, IMAGELIST, INITLEFTSIDEBAR,
  HOMEROUTE, ORDERROUTE, SATELLITEORIBIT, ORDERDETAIL, OLTARGETLIBSHOWPOINT, OLIMAGELIBLIBSHOWIMAGETILE,
  FROMLEFTSIDERBAR, FROMRIGHTSIDERBAR, OLMAPPOPUPINFO, OLTARGETLIBSHOWALLPOINTS, OLTARGETLIBCREATEEDITPOINT,
  OLMAPPOPUPINFOEVENT, OLCREATEORDERSHOWCLICKPOINT, OLCREATEORDERSHOWPATHLINE, OLIMAGELIBLIBSHOWPOINT,
  OLORDERLISTSHOWDETAIL } from '/@/common/constant/constant'

import 'ol/ol.css';
import { Map} from 'ol';
import * as olProj from 'ol/proj';
import PointerInteraction from 'ol/interaction/Pointer';

import { defineComponent, onMounted, reactive, toRefs, computed, watch } from 'vue';

import {  OpenLayerMapControl,
          OpenLayerStaticImages, 
          initOpenLayerCampareMap,
          getLngLatFromEvent, getRectanglePathExtent
        } from '/@/hooks/openLayer/openLayerCompare'

import {getLngLatFromText, calibrateOpenLayerLngLat, geoMeter2Lat, geoMeter2Lng } from '/@/utils/common/geoCommon'

export default defineComponent({
  name: 'OpenLayerCompare',
  setup() {
    let mapCurrentLevelOld = 0;
    const maxMapLevel:number = 21;
    const minMapLevel:number = 3; // 2.8657332708517589

    let isShowImageContainner:boolean = false;
    let isShowRoller:boolean = true;

    let openLayersHandler:Map;
    let pointerInteraction:PointerInteraction;
    let mapControlHandler:OpenLayerMapControl;
    
    let isInitOpenLayerMapDone = false;
    const cursor:string ='pointer';
    let previousCursor: string | undefined | null;
    
    let mapControlStatus = reactive({
      isShowControl: true,
      isShowSearch: false,
      isLocked: false,
      zoomInIsDisable: false,
      zoomOutIsDisable: true,
    });


    let staticImageLeftHandler: OpenLayerStaticImages;
    let staticImageRightHandler: OpenLayerStaticImages; 

    onMounted(() => {
      init()
    })

    function init() {
      openLayersHandler = initOpenLayerCampareMap(minMapLevel, maxMapLevel)
      addMapControlHandler()
      isInitOpenLayerMapDone = true
    }

    function addMapControlHandler() {
      mapControlHandler = new OpenLayerMapControl(openLayersHandler, minMapLevel, maxMapLevel)
      staticImageLeftHandler = new OpenLayerStaticImages(openLayersHandler);
      staticImageRightHandler = new OpenLayerStaticImages(openLayersHandler);

      pointerInteraction = new PointerInteraction({
        handleDownEvent: pointerDownEventHandle,
        handleDragEvent: pointerDragEventHandle,
        handleMoveEvent: pointerMoveEventHandle,
        handleUpEvent: pointerUpEventHandle
      })
      openLayersHandler.addInteraction(pointerInteraction)
      addSimulateImage()
      mapControlHandler.flytoPoint(100, 20)
    }

    const jaLngLat = getLngLatFromText('100', '20')
    const jaCoordinate = olProj.transform([100, 20], 'EPSG:4326', 'EPSG:3857')

    const gymLngLat = getLngLatFromText('100.05', '20.02')
    const gymCoordinate = olProj.transform([100.05, 20.02], 'EPSG:4326', 'EPSG:3857')

    const jaImageInfo = {
      isChanged: true,
      coordinate: jaCoordinate,
      longitude: jaLngLat.longitude,
      longitudeText: jaLngLat.longitudeText,
      latitude: jaLngLat.latitude,
      latitudeText: jaLngLat.latitudeText,
      name: 'jaNmae',
      id: 'jaId',
      area: 8,
      areaUnitM: 8000,
      areaName: '8km*8km',
      url: jaImageUrl,
      html: '',
      isCanSize: false,
      extents: [99.96171847746696, 19.96402713576325, 100.03828152253304, 20.03597286423675]
    }

    const gymImageInfo = {
      isChanged: true,
      coordinate: gymCoordinate,
      longitude: gymLngLat.longitude,
      longitudeText: gymLngLat.longitudeText,
      latitude: gymLngLat.latitude,
      latitudeText: gymLngLat.latitudeText,
      name: 'gymNmae',
      id: 'gymId',
      area: 8,
      areaUnitM: 8000,
      areaName: '8km*8km',
      url: gymImageUrl,
      html: '',
      isCanSize: true,
      extents:[100.01171361086487, 19.98402713576325, 100.08828638913512, 20.05597286423675]
    }

    function addSimulateImage() {
      staticImageLeftHandler.add(jaImageInfo)
      staticImageRightHandler.add(gymImageInfo)

    }

    let coordinateOld;
    let FeatureOld;
    let FeatureDeltaLngLatOld;
    let pointFeatureMarkFeature;
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
      console.log("move",event.coordinate)
      // staticImageRightHandler.resizeX(gymImageInfo, event.coordinate)
      staticImageRightHandler.resizeY(gymImageInfo, event.coordinate)
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

    function pointerUpEventHandle(event:any) {
      const lnglat = olProj.transform(event.coordinate, 'EPSG:3857', 'EPSG:4326')
      coordinateOld = null;
      FeatureOld = null;
      return false
    }

    const rollerRunTimeStyle = reactive({
      "left": '50%'
    })

    const {innerHeight: windowInnerHeight, innerWidth: windowInnerWidth } = window

    function rollerMouseDownHandle(event:MouseEvent) {
      
    }

    function rollerMouseMoveHandle(event:MouseEvent) {
      console.log("mouseMove", event)
      rollerRunTimeStyle.left = parseInt(windowInnerWidth / 3) + 'px';
    }

    function rollerMouserUpHandle(event:MouseEvent) {

    }

      
    return {
      jaImageUrl,
      gymImageUrl,
      isShowImageContainner,
      isShowRoller,
      ...toRefs(mapControlStatus),
      rollerRunTimeStyle,
      rollerMouseDownHandle,
      rollerMouseMoveHandle,
      rollerMouserUpHandle,
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
    width: 49%;
    height: 100%;
    border-radius: 12px;
    border: 1px solid burlywood;
  }

  .image_right_box {
    width: 50%;
    height: 100%;
    border-radius: 12px;
    border: 1px solid skyblue;
  }

  .roller_shutter {
    width: 10px;
    height: 100%;
    position: fixed;
    top: 0;
    left: 50%;
    border: 1px solid springgreen;
    background-color: springgreen;
  }

</style>

