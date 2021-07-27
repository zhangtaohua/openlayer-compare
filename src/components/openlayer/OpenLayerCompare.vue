<template>
  <div id="openLayersMapContainner" class="map_base_containner"
    @mousemove="rollerMouseMoveHandle"
    @mouseup="rollerMouseUpHandle"
  >
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

    <div v-if="rollerControl.isShow" 
      :class="{roller_box_horizontal: rollerControl.type === 'horizontalLine',
          roller_box_vertical: rollerControl.type === 'verticalLine',
          roller_box_full_angle: rollerControl.type === 'fullAngle',
        }"
      :style="rollerControl.style"
      @mousedown="rollerMouseDownHandle"
      @mousemove="rollerMouseMoveHandle"
      @mouseup="rollerMouseUpHandle"
    >
      <div v-if="rollerControl.type === 'fullAngle'" class="roller_box_full_angle_v"></div>
    </div>

    <div
      v-if="isShowControl"
      class="control_box"
    >
      <div class="control_zoom_box">
        <div
          class="control_zoom"
          @click="gotoDevLocationHandle"
        >
          <img
            class="control_zoom_image"
            :src="mapHomeImageUrl"
          >
        </div>
        <div
          class="control_zoom"
          @click="resetMapCampareHandle"
        >
          <img
            class="control_zoom_image"
            :src="mapBackImageUrl"
          >
        </div>
        <div
          v-if="zoomInIsDisable"
          class="control_zoom"
          @click="zoomInOutMapHandle(true)"
        >
          <img
            class="control_zoom_image"
            :src="mapbigDisableImageUrl"
          >
        </div>
        <div
          v-else
          class="control_zoom"
          @click="zoomInOutMapHandle(true)"
        >
          <img
            class="control_zoom_image"
            :src="mapbigImageUrl"
          >
        </div>
        <div
          v-if="zoomOutIsDisable"
          class="control_zoom"
          @click="zoomInOutMapHandle(false)"
        >
          <img
            class="control_zoom_image"
            :src="mapsamllDisableImageUrl"

          >
        </div>
        <div
          v-else
          class="control_zoom"
          @click="zoomInOutMapHandle(false)"
        >
          <img
            class="control_zoom_image"
            :src="mapsamllImageUrl"
          >
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import mapHomeImageUrl from '/@/assets/images/mapHome.svg'
import mapBackImageUrl from '/@/assets/images/mapBack.png'
import mapbigDisableImageUrl from '/@/assets/images/mapbigDisable.svg'
import mapbigImageUrl from '/@/assets/images/mapbig.png'
import mapsamllDisableImageUrl from '/@/assets/images/mapsamllDisable.svg'
import mapsamllImageUrl from '/@/assets/images/mapsamll.png'

import 'ol/ol.css';
import { Map} from 'ol';
import * as olProj from 'ol/proj';
import PointerInteraction from 'ol/interaction/Pointer';

import { defineComponent, onMounted, reactive, toRefs, ref, computed, watch } from 'vue';

import {  OpenLayerMapControl,
          OpenLayerStaticImages,
          initOpenLayerCampareMap
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
      default:"fullAngle"   // "horizontalLine" "verticalLine" "fullAngle"
    }
  },
  setup(props, ctx) {
    const {innerHeight: windowInnerHeight, innerWidth: windowInnerWidth } = window

    let mapCurrentLevelOld = 0;
    const maxMapLevel:number = 21;
    const minMapLevel:number = 3; // 2.8657332708517589

    const mapControlStatus = reactive({
      isShowControl: false,
      isShowSearch: false,
      isLocked: false,
      zoomInIsDisable: false,
      zoomOutIsDisable: false,
    });

    const imageDomControl = reactive({
      isShowMainBox: true,
      isShowLeftBox: true,
      isShowRightBox: true,
      isShowListBox: true
    })

    const rollerControl = reactive({
      isShow: false,
      type: props.rollerType,
      isClicked: false,
      coordinate: [],
      style: {},
      top: 0,
      left: 0,
    })

    let openLayersHandler:Map;
    let pointerInteraction:PointerInteraction;
    let mapControlHandler:OpenLayerMapControl;
    
    let staticImageLeftHandler: OpenLayerStaticImages;
    let staticImageRightHandler: OpenLayerStaticImages;


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

    const mapCurrentViewSize = {
        viewSize: [],
        viewCenter: [],
    }

    let isMapClickDownMove = false

    onMounted(() => {
      init()
    })

    watch(()=>dropedImageCounter , 
      (dropedImageCounterNew, dropedImageCounterOld) => {
        if(dropedImageCounter.value >= 2) {
          hiddenAllImageDomBox()
          addSimulateImage()
          // show the roller dom
          showRollerBox()
          showMapControlBox()
        }
      }, 
      {
        deep:true,
        immediate:false
      }
    )

    function hiddenMapControlBox() {
      mapControlStatus.isShowControl = false
    }

    function showMapControlBox() {
      mapControlStatus.isShowControl = true
    }

    function hiddenAllImageDomBox() {
      imageDomControl.isShowMainBox = false
    }

    function showAllImageDomBox() {
      imageDomControl.isShowMainBox = true
      imageDomControl.isShowLeftBox = true
      imageDomControl.isShowRightBox = true
    }

    function showRollerBox() {
      rollerControl.isShow = true

      rollerControl.coordinate = olProj.transform(staticImageViewInfo.center, 'EPSG:4326', 'EPSG:3857')

      if(rollerControl.type === "horizontalLine") {
          rollerControl.style = {
            'left' :  windowInnerWidth/2 + 'px',
            'top': '0px'
          }
          rollerControl.left =  windowInnerWidth/2
          rollerControl.top = 0
          staticImageRightHandler.resizeX(rightImageInfo.imageInfo, rollerControl.coordinate)
        } else if(rollerControl.type === "verticalLine") {
          rollerControl.style = {
            'left' : '0px',
            'top' :  windowInnerHeight/2 + 'px'
          }
          rollerControl.left =  0
          rollerControl.top = windowInnerHeight/2
          staticImageRightHandler.resizeY(rightImageInfo.imageInfo, rollerControl.coordinate)
        } else if(rollerControl.type === "fullAngle") {
          rollerControl.style = {
            'left' : windowInnerWidth/2 + 'px',
            'top' :  windowInnerHeight/2 + 'px'
          }
          rollerControl.left = windowInnerWidth/2
          rollerControl.top = windowInnerHeight/2
          staticImageRightHandler.resizeXY(rightImageInfo.imageInfo, rollerControl.coordinate)
        }
    }

    function hiddenRollerBox() {
      rollerControl.isShow = false
    }

    function init() {
      openLayersHandler = initOpenLayerCampareMap(minMapLevel, maxMapLevel)
      addMapControlHandler()
    }

    function addMapControlHandler() {
      mapControlHandler = new OpenLayerMapControl(openLayersHandler, minMapLevel, maxMapLevel)
      staticImageLeftHandler = new OpenLayerStaticImages(openLayersHandler);
      staticImageRightHandler = new OpenLayerStaticImages(openLayersHandler);

      openLayersHandler.on('moveend', (event) => {
        mapRenderCompleteedHandle(event)
      })
      
      pointerInteraction = new PointerInteraction({
        handleDownEvent: pointerDownEventHandle,
        handleDragEvent: pointerDragEventHandle,
        handleMoveEvent: pointerMoveEventHandle,
        handleUpEvent: pointerUpEventHandle
      })
      openLayersHandler.addInteraction(pointerInteraction)
    }

    function mapRenderCompleteedHandle(event:MapBrowserEvent<UIEvent>) {
      const { viewSize, viewCenter } = mapControlHandler.getDefaultSize()
      mapCurrentViewSize.viewSize = viewSize
      mapCurrentViewSize.viewCenter = viewCenter

      const currentLevel = mapControlHandler.getZoom()
      if(mapCurrentLevelOld !== currentLevel) {
        mapCurrentLevelOld = currentLevel
        const zoomInOutISDisable = mapControlHandler.disEnableZoomControl(currentLevel)
        mapControlStatus.zoomInIsDisable = zoomInOutISDisable.zoomInIsDisable
        mapControlStatus.zoomOutIsDisable = zoomInOutISDisable.zoomOutIsDisable
      }

      updateMapCompareShow()
    }

    function addSimulateImage() {
      staticImageLeftHandler.add(leftImageInfo.imageInfo)
      staticImageRightHandler.add(rightImageInfo.imageInfo)

      // fit the views
      getImageExtents();
      mapControlHandler.flytoPoint(staticImageViewInfo.center[0], staticImageViewInfo.center[1])
      mapControlHandler.fitView(staticImageViewInfo.extents)
    }

    function removeSimulateImage() {
      staticImageLeftHandler.remove(leftImageInfo.imageInfo)
      staticImageRightHandler.remove(rightImageInfo.imageInfo)
      dropedImageCounter.value = 0
      leftImageInfo.isDroped = false
      leftImageInfo.imageInfo = {}
      rightImageInfo.isDroped = false
      rightImageInfo.imageInfo = {}
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

      staticImageViewInfo.extents = viewExtents
      staticImageViewInfo.center = viewCenter
      return {
        viewExtents,
        viewCenter
        }
    }

    function pointerDownEventHandle(event:any) {
      isMapClickDownMove = true
      return false
    }

    function pointerDragEventHandle(event:any) {
      // console.log("drag")
      // 知道可不可以删除的
    }

    function pointerMoveEventHandle(event:any) {
      if(isMapClickDownMove) {
        updateMapCompareShow()
      }
    }

    function updateMapCompareShow() {
      rollerControl.coordinate = openLayersHandler.getCoordinateFromPixel([rollerControl.left, rollerControl.top])
      if(rollerControl.type === "horizontalLine") {
        staticImageRightHandler.resizeX(rightImageInfo.imageInfo, rollerControl.coordinate)
      } else if(rollerControl.type === "verticalLine") {
        staticImageRightHandler.resizeY(rightImageInfo.imageInfo, rollerControl.coordinate)
      } else if(rollerControl.type === "fullAngle") {
        staticImageRightHandler.resizeXY(rightImageInfo.imageInfo, rollerControl.coordinate)
      }
    }
    
    function pointerUpEventHandle(event:any) {
      isMapClickDownMove = false
      return false
    }

    let currentImageInfo:any;

    function leftBoxDragEnterHandle() {
      // console.log("leftBoxDragEnterHandle")
      return true;
    }
    function leftBoxDragoverHandle(event:any) {
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

    function rollerMouseDownHandle(event) {
      rollerControl.isClicked = true
    }

    function rollerMouseMoveHandle(event) {
      if(rollerControl.isClicked) {
        rollerControl.coordinate =  openLayersHandler.getEventCoordinate(event)
        if(rollerControl.type === "horizontalLine") {
          rollerControl.style = {
            'left' :  event.clientX + 'px',
            'top': '0px'
          }
          rollerControl.left = event.clientX
          rollerControl.top = 0
          staticImageRightHandler.resizeX(rightImageInfo.imageInfo, rollerControl.coordinate)
        } else if(rollerControl.type === "verticalLine") {
          rollerControl.style = {
            'left' : '0px',
            'top' :  event.clientY + 'px'
          }
          rollerControl.left = 0
          rollerControl.top = event.clientY
          staticImageRightHandler.resizeY(rightImageInfo.imageInfo, rollerControl.coordinate)
        } else if(rollerControl.type === "fullAngle") {
          rollerControl.style = {
            'left' : event.clientX + 'px',
            'top' :  event.clientY + 'px'
          }
          rollerControl.left = event.clientX
          rollerControl.top = event.clientY
          staticImageRightHandler.resizeXY(rightImageInfo.imageInfo, rollerControl.coordinate)
        }
      }
    }

    function rollerMouseUpHandle(event) {
      rollerControl.isClicked = false
      isMapClickDownMove = false
    }

    function gotoDevLocationHandle() {
      mapControlHandler.flytoPoint(staticImageViewInfo.center[0], staticImageViewInfo.center[1])
      mapControlHandler.fitView(staticImageViewInfo.extents)
      showRollerBox()
    }

    function resetMapCampareHandle() {
      removeSimulateImage()
      hiddenRollerBox()
      hiddenMapControlBox()
      showAllImageDomBox()
    }

    function  zoomInOutMapHandle(isZoom:boolean) {
      const zoomInOutISDisable = mapControlHandler.zoomInOutEarth(isZoom)
      mapControlStatus.zoomInIsDisable = zoomInOutISDisable.zoomInIsDisable
      mapControlStatus.zoomOutIsDisable = zoomInOutISDisable.zoomOutIsDisable
    }

      
    return {
      mapHomeImageUrl,
      mapBackImageUrl,
      mapbigDisableImageUrl,
      mapbigImageUrl,
      mapsamllDisableImageUrl,
      mapsamllImageUrl,
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
      rollerMouseDownHandle,
      rollerMouseMoveHandle,
      rollerMouseUpHandle,
      gotoDevLocationHandle,
      resetMapCampareHandle,
      zoomInOutMapHandle,
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

  .roller_box_horizontal {
    position: fixed;
    width: 10px;
    height: 100vh;
    border: 1px solid red;
    background-color: red;
    top: 0;
    left: 50%;
  }

  .roller_box_vertical {
    position: fixed;
    width: 100vw;
    height: 10px;
    border: 1px solid red;
    background-color: red;
    top: 50%;
    left: 0;
  }

  .roller_box_full_angle {
    position: fixed;
    width: 100px;
    height: 10px;
    border: 1px solid red;
    background-color: red;
    top: 50%;
    left: 50%;
  }

  .roller_box_full_angle_v {
    position: relative;
    width: 10px;
    height: 100px;
    border: 1px solid red;
    background-color: red;
    top: -91px;
    left: -10px;
  }

  .control_box {
    width: 40px;
    height: 160px;
    position: fixed;
    /* bottom: 50%; */
    bottom: 120px;
    right: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: transparent;
  }

  .control_zoom_image {
    width: 20px;
    height: 20px;
  }

  .control_zoom_box {
    width: 40px;
    height: 160px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .control_zoom {
    width: 40px;
    height: 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background-color: #FFFFFF;
    border: 1px solid #999999;
  }

  .control_zoom_disable {
    background-color: #999999;
  }

</style>

