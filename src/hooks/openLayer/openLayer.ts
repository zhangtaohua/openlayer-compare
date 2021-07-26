import {Map, View, MapBrowserEvent, Overlay } from 'ol';
import {defaults as defaultInteractions, DragPan as DragPanInteraction, 
  MouseWheelZoom as MouseWheelZoomInteraction} from 'ol/interaction.js';

// import Overlay from 'ol/Overlay';
import * as olProj from 'ol/proj';
import * as olControl from 'ol/control';

import Feature from 'ol/Feature';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import Text from 'ol/style/Text';
import Fill from 'ol/style/Fill';
import {Stroke, Circle} from 'ol/style';
import {ImageStatic, WMTS} from 'ol/source';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Image, Tile } from 'ol/layer';
import {toStringHDMS} from 'ol/coordinate';
import {Polygon, LineString, Point, Circle as CircleGeom} from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import WTMSTileGrid from 'ol/tilegrid/WMTS'
import { getWidth, getTopLeft } from 'ol/extent'

// import OSM from 'ol/source/OSM';
// import olms from 'ol-mapbox-style';
import {apply} from 'ol-mapbox-style';

import { computed } from 'vue';
import store from '/@/store/index';

import '/@/assets/style/openlayer.css';

import devicePositionImageUrl from '/@/assets/images/position.png'
import orderClickImageUrl from '/@/assets/images/orderClickPoints.svg'
import mapHomeImageUrl from '/@/assets/images/mapHome.svg'

import mapGreenMarkImageUrl from '/@/assets/images/greenMark.svg'
import mapBlueMarkImageUrl from '/@/assets/images/blueMark.svg'
import mapRedMarkImageUrl from '/@/assets/images/redMark.svg'

import { CREATEORDER, ORDERLIST, TARGETLIB, IMAGELIST,
  HOMEROUTE, ORDERROUTE, SATELLITEORIBIT, ORDERDETAIL,
  FROMLEFTSIDERBAR, FROMRIGHTSIDERBAR, OLMAPPOPUPINFO,
  OLMAPPOPUPINFOEVENT } from '/@/common/constant/constant'

import { updateOpenLayerMapClickAction } from '/@/hooks/openlayer/openLayerStore'
import { updateLeftSiderbar, updateNavbar } from '/@/hooks/layout/layoutStore'

import {getLngLatFromText, calibrateOpenLayerLngLat, geoMeter2Lat, geoMeter2Lng } from '/@/utils/common/geoCommon'

export class OpenLayerStaticImages {
  openLayersHandler:Map;
  openLayerStaticImages:OpenlayerVectorLayersDataInfo = {}

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(image: StaticImageDataInfo) {
    const { extent } = getRectanglePathExtent(image.longitude, image.latitude, Number(image.areaUnitM))
    console.log("image",image)

    const staticImagesVectorSource = new ImageStatic({
      // attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
      url: image.url,
      imageSmoothing: true,
      imageExtent: olProj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857')
    })

    staticImagesVectorSource.setProperties({ 
      customize: false,
      meta: image 
    });

    const staticImagesVectorLayer = new Image({
      source: staticImagesVectorSource,
      extent: olProj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857'),
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(staticImagesVectorLayer)
    }

    this.openLayerStaticImages[image.id] = {
      style: '',
      feature: '',
      source: staticImagesVectorSource,
      vectorLayer: staticImagesVectorLayer,
      meta:image
    }
  }

  addAll(imageArr: Array<StaticImageDataInfo>) {
    imageArr.forEach((image) => {
      this.add(image)
    })
  }

  remove(image:StaticImageDataInfo) {
    const imageLayer = this.openLayerStaticImages[image.id]
    if (this.openLayersHandler && imageLayer) {
      this.openLayersHandler.removeLayer(imageLayer.vectorLayer)
    }
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.openLayerStaticImages) {
        if (Object.hasOwnProperty.call(this.openLayerStaticImages, key)) {
          const imageLayer = this.openLayerStaticImages[key]
          this.openLayersHandler.removeLayer(imageLayer.vectorLayer)
        }
      }
    }
  }
}

export class OpenLayerPathLine {
  openLayersHandler:Map;
  openLayerPathLines:OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(pathLine:CreateOrderPathLineDataInfo) {
    if(!pathLine.paths.length) {
      return
    }

    this.clear()

    const paths = new LineString(pathLine.paths)

    paths.applyTransform(olProj.getTransform('EPSG:4326', 'EPSG:3857'))

    const pathLineFeature = new Feature({
      geometry: paths,
      name: pathLine.name,
      id:pathLine.id
    })

    const styleLine = new Style({
      stroke: new Stroke({
        color: '#0078d4',
        width: 5
      })
    })
    const styleHighLine = new Style({
      stroke: new Stroke({
        color: '#ffaa44',
        width: 5
      })
    })
    if (pathLine.isActive) {
      pathLineFeature.setStyle(styleHighLine)
    } else {
      pathLineFeature.setStyle(styleLine)
    }

    pathLineFeature.setId(pathLine.id)
    pathLineFeature.setProperties({
      customize: true,
      meta: pathLine
    })

    const pathLineSource = new VectorSource({
      features: [pathLineFeature],
      wrapX: false
    })

    const pathLineVectorLayer = new VectorLayer({
      source: pathLineSource,
      zIndex: 1
    })
    // pathLineVectorLayer.setZIndex(1)

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(pathLineVectorLayer)
    }

    this.openLayerPathLines[pathLine.id] = {
      style: pathLine.isActive? styleHighLine: styleLine,
      feature: pathLineFeature,
      source: pathLineSource,
      vectorLayer: pathLineVectorLayer,
      meta:pathLine
    }
  }

  remove(pathLine:CreateOrderPathLineDataInfo) {
    const pathLineLayer = this.openLayerPathLines[pathLine.id]
    if (this.openLayersHandler && pathLineLayer) {
      this.openLayersHandler.removeLayer(pathLineLayer.vectorLayer)
    }
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.openLayerPathLines) {
        if (Object.hasOwnProperty.call(this.openLayerPathLines, key)) {
          const pathLineLayer = this.openLayerPathLines[key]
          this.openLayersHandler.removeLayer(pathLineLayer.vectorLayer)
        }
      }
    }
  }
}
export class OpenLayerRectangele {
  openLayersHandler:Map;
  openLayerRectangles:OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(rectangle:CreateOrderPointDataInfo) {
    this.remove(rectangle)
    let polygonArr:any;
    if(rectangle.path) {
      polygonArr = rectangle.path
    } else {
      const { path } = getRectanglePathExtent(rectangle.longitude, rectangle.latitude, Number(rectangle.areaUnitM))
      polygonArr = path
    }

    const polygons = new Polygon([polygonArr])
    // this.polygons.rotate(8.4117, [lnglat.lng, lnglat.lat]);
    polygons.applyTransform(olProj.getTransform('EPSG:4326', 'EPSG:3857'))

    const polygonsFeature = new Feature({
      geometry: polygons,
      name: rectangle.name,
      id:rectangle.id
    })

    const colors = ['#0000FF', '#FF0000', '#409EFF', '#FF9E00', '#FF9EFF', '#0000FF', '#00FF00']
    const choseColor = Math.floor((Math.random() * colors.length))

    const polygonsStyle = new Style({
      fill: new Fill({
        color: 'rgba(255,255,255,0.6)'
      }),
      stroke: new Stroke({
        color: '#409EFF',
        width: 2
      })
    })
    polygonsFeature.setStyle(polygonsStyle)
    polygonsFeature.setId(rectangle.id)

    const properties = {
      customize: true,
      meta: rectangle
    }
    polygonsFeature.setProperties(properties, true);

    const polygonVectorSource = new VectorSource()
    polygonVectorSource.addFeature(polygonsFeature)

    const polygonsVectorLayer = new VectorLayer({
      source: polygonVectorSource
    })
    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(polygonsVectorLayer)
    }

    this.openLayerRectangles[rectangle.id] = {
      style: polygonsStyle,
      feature: polygonsFeature,
      source: polygonVectorSource,
      vectorLayer: polygonsVectorLayer,
      meta: rectangle
    }
  }

  remove(rectangle:CreateOrderPointDataInfo) {
    const rectangleLayer = this.openLayerRectangles[rectangle.id]
    if (this.openLayersHandler && rectangleLayer) {
      this.openLayersHandler.removeLayer(rectangleLayer.vectorLayer)
    }
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.openLayerRectangles) {
        if (Object.hasOwnProperty.call(this.openLayerRectangles, key)) {
          const rectangleLayer = this.openLayerRectangles[key]
          this.openLayersHandler.removeLayer(rectangleLayer.vectorLayer)
        }
      }
    }
  }
}

export class OpenLayerDeviceMarks {
  openLayersHandler:Map;
  deviceMarkVectorLayers:any = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(device: DeviceMarkDataInfo) {
    const deviceMarkOption = {
      // type: 'icon',
      geometry: new Point(olProj.fromLonLat([device.longitude, device.latitude])),
      name: device.name,
      id: device.id
    }

    const deviceMarkFeature = new Feature(deviceMarkOption)
    const deviceIconStyle = new Style({
      image: new Icon({
        anchor: [0.5, 1],
        src: devicePositionImageUrl,
        size: [64, 64], // [width, height]
        scale: 0.5
      }),
      'text': new Text({
        font: 'bold 12px serif',
        text: '设备位置',
        offsetY: 10,
        padding: [3, 5, 3, 5],
        fill: new Fill({
          color: [255, 255, 255, 1]
        }),
        // stroke : new Stroke({
        // 	color: [255,255,0,1],
        // 	width: 2
        // }),
        backgroundFill: new Fill({
          color: [255, 12, 15, 1]
        })
      })
    })

    deviceMarkFeature.setStyle(deviceIconStyle)
    deviceMarkFeature.setId(device.id)
    const properties = {
      customize: false,
      meta: device
    }
    deviceMarkFeature.setProperties(properties, true);

    const deviceMarkVectorSource = new VectorSource({
      features: [deviceMarkFeature],
      wrapX: false
    })

    const deviceMarkVectorLayer = new VectorLayer({
      source: deviceMarkVectorSource,
      zIndex: 1
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(deviceMarkVectorLayer);
    }

    this.deviceMarkVectorLayers[device.id] = {
      style: deviceIconStyle,
      feature: deviceMarkFeature,
      source: deviceMarkVectorSource,
      vectorLayer: deviceMarkVectorLayer,
      meta: device
    }
  }

  remove(device: DeviceMarkDataInfo) {
    const deviceLayer = this.deviceMarkVectorLayers[device.id]
    if (this.openLayersHandler && deviceLayer) {
      this.openLayersHandler.removeLayer(deviceLayer.vectorLayer)
    }
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.deviceMarkVectorLayers) {
        if (Object.hasOwnProperty.call(this.deviceMarkVectorLayers, key)) {
          const deviceLayer = this.deviceMarkVectorLayers[key]
          this.openLayersHandler.removeLayer(deviceLayer.vectorLayer)
        }
      }
    }
  }
}

export class OpenLayerOrderMarks {
  openLayersHandler:Map;
  orderMarkVectorLayers:any = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(point:CreateOrderPointDataInfo) {
    this.remove(point)
    const orderMarkOption = {
      // type: 'icon',
      geometry: new Point(olProj.fromLonLat([point.longitude, point.latitude])),
      name: point.name,
      id: point.id
    }

    const orderMarkFeature = new Feature(orderMarkOption)
    const orderIconStyle = new Style({
      image: new Icon({
        src: orderClickImageUrl,
        scale: 0.05,
      }),
    })

    orderMarkFeature.setStyle(orderIconStyle)
    orderMarkFeature.setId(point.id)
    const properties = {
      customize: true,
      meta: point
    }
    orderMarkFeature.setProperties(properties, true);

    const orderMarkVectorSource = new VectorSource({
      features: [orderMarkFeature],
      wrapX: false
    })

    const orderMarkVectorLayer = new VectorLayer({
      source: orderMarkVectorSource,
      zIndex: 1
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(orderMarkVectorLayer);
    } 

    this.orderMarkVectorLayers[point.id] = {
      style: orderIconStyle,
      feature: orderMarkFeature,
      source: orderMarkVectorSource,
      vectorLayer: orderMarkVectorLayer,
      meta: point
    }
  }

  remove(point: CreateOrderPointDataInfo) {
    const pointLayer = this.orderMarkVectorLayers[point?.id]
    if (this.openLayersHandler && pointLayer) {
      this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
      this.orderMarkVectorLayers[point.id] = null  //??????
    }
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.orderMarkVectorLayers) {
        if (Object.hasOwnProperty.call(this.orderMarkVectorLayers, key)) {
          const pointLayer = this.orderMarkVectorLayers[key]
          this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
        }
      }
    }
  }

}

export class OpenLayerMapControl {
  openLayersHandler:Map;
  openLayersViewer:View;
  maxMapLevel:number = 21
  minMapLevel:number = 3 // 2.8657332708517589
  zoomInIsDisable:boolean = false;
  zoomOutIsDisable:boolean =false;
  isLocked:boolean = false;
  maxHeightFeets:number = 60000;

  constructor(openLayersHandler:Map, minMapLevel:number, maxMapLevel:number) {
    this.openLayersHandler = openLayersHandler
    this.openLayersViewer = this.openLayersHandler.getView()
    this.minMapLevel = minMapLevel
    this.maxMapLevel = maxMapLevel
  }

  lockMap() {
    this.isLocked = true
    return { isLocked: this.isLocked}
  }

  unLockMap() {
    this.isLocked = false
    return { isLocked: this.isLocked}
  }

  getZoom() {
    let current_level: number|undefined =  this.openLayersViewer.getZoom()// 2.8657332708517589
    return current_level? current_level : this.minMapLevel
  }

  setZoom(zoom: number) {
    this.openLayersViewer.setZoom(zoom)
  }

  setRotation(rotation: number) {
    this.openLayersViewer.setRotation(rotation)
  }

  flytoPoint(longitude:number, latitude:number) {
    const center = olProj.fromLonLat([longitude, latitude])
    this.openLayersViewer.setCenter(center)
  }

  gotoLocation(longitude:number, latitude:number) {
    this.flytoPoint(longitude, latitude)
    this.setRotation(0)
    this.setZoom(10)
    this.disEnableZoomControl(10)
  }

  gotoDevLocation() {
    this.gotoLocation(116.345152, 39.946504)
  }

  zoomInOutEarth(zoom:boolean = true) {
    const maxLevel = this.maxMapLevel
    const minLevel = this.minMapLevel

    if (this.openLayersViewer) {
      let current_level: number|undefined =  this.openLayersViewer.getZoom()// 2.8657332708517589
      if (zoom && current_level) {
        if (current_level < maxLevel) {
          current_level++
        }
        if (current_level > maxLevel) {
          current_level = maxLevel
        }
      } else if (current_level) {
        if (current_level > minLevel) {
          current_level--
        }
        if (current_level < minLevel) {
          current_level = minLevel
        }
      }
      this.openLayersViewer.setZoom(current_level? current_level : minLevel)
      this.disEnableZoomControl(current_level? current_level : minLevel)
    }
    return {
      zoomInIsDisable: this.zoomInIsDisable, 
      zoomOutIsDisable: this.zoomOutIsDisable
    }
  }

  disEnableZoomControl(level:Number) {
    const maxLevel = this.maxMapLevel
    const minLevel = this.minMapLevel
    if (level <= minLevel) {
      this.zoomInIsDisable = false
      this.zoomOutIsDisable = true
    } else if (level >= maxLevel) {
      this.zoomInIsDisable = true
      this.zoomOutIsDisable = false
    } else {
      this.zoomInIsDisable = false
      this.zoomOutIsDisable = false
    }

    return {
      zoomInIsDisable: this.zoomInIsDisable, 
      zoomOutIsDisable: this.zoomOutIsDisable
    }
  }

  getCenterInfo() {
    let lnglat = [0, 0]
    let heightFeets = this.maxHeightFeets
    const currentCenter = this.openLayersViewer.getCenter()

    if(currentCenter) {
      lnglat = olProj.transform(currentCenter, 'EPSG:3857', 'EPSG:4326')
    }
    const zoomLever = this.openLayersViewer.getZoom()
    if(zoomLever) {
      heightFeets = this.maxHeightFeets / zoomLever
    }

    let calLnglat = calibrateOpenLayerLngLat(lnglat[0], lnglat[1]);
    const {longitude, longitudeText, latitude, latitudeText} = getLngLatFromText(String(calLnglat.longitude), String(calLnglat.longitude));

    const center = {
      longitude,
      longitudeText,
      latitude,
      latitudeText,
      heightFeets,
      zoomLever
    }
    return center
  }

  getSizeInfo() {
    const arrSize = this.openLayersHandler.getSize()
    const arrViewSize = this.openLayersViewer.calculateExtent(arrSize)
    const lnglatLeftBottomOrigin = olProj.transform([arrViewSize[0], arrViewSize[1]], 'EPSG:3857', 'EPSG:4326')
    const lnglatRightUpOrigin = olProj.transform([arrViewSize[2], arrViewSize[3]], 'EPSG:3857', 'EPSG:4326')
    const lnglatLeftBottomCalib = calibrateOpenLayerLngLat(lnglatLeftBottomOrigin[0], lnglatLeftBottomOrigin[1]);
    const lnglatRightUpCalib = calibrateOpenLayerLngLat(lnglatRightUpOrigin[0], lnglatRightUpOrigin[1]);

    const lnglatLeftBottom = getLngLatFromText(String(lnglatLeftBottomCalib.longitude), String(lnglatLeftBottomCalib.latitude));
    const lnglatRightUp = getLngLatFromText(String(lnglatRightUpCalib.longitude), String(lnglatRightUpCalib.latitude));
    const center = this.getCenterInfo();
    const size = {
      leftBottom: lnglatLeftBottom,
      rightUp: lnglatRightUp,
      center,
      minlonglat: [lnglatLeftBottom.longitude, lnglatLeftBottom.latitude],
      maxlonglat: [lnglatRightUp.longitude, lnglatRightUp.latitude],
      mapcenter: [center.longitude, center.latitude]
    }

    return size
  }

}

export class OpenLayerPopup {
  openLayersHandler:Map;
  mapDomContainner:HTMLElement | null;
  overlayDomContainner:HTMLElement | null;
  overlayDomCloser:HTMLElement | null;
  overlayDomContent:HTMLElement | null;
  openLayerOverlay:Overlay;

  addTargetDom:HTMLElement | null;
  createOrderDom:HTMLElement | null;


  constructor(openLayersHandler:Map, containner:string, overlayId:string) {
    this.openLayersHandler = openLayersHandler
    this.mapDomContainner = document.getElementById(containner);
    
    this.overlayDomContainner = document.createElement('div')
    this.overlayDomContainner.className = 'ol_popup'
    
    this.overlayDomCloser = document.createElement('div')
    this.overlayDomCloser.className = 'ol_popup_closer'
    this.overlayDomContainner.appendChild(this.overlayDomCloser)


    this.overlayDomContent = document.createElement('div')
    this.overlayDomContent.className = 'ol_popup_content'
    this.overlayDomContainner.appendChild(this.overlayDomContent)

    this.mapDomContainner?.appendChild(this.overlayDomContainner)

    this.openLayerOverlay = new Overlay({
      id: overlayId,
      element: this.overlayDomContainner,
      autoPan: true,
      autoPanAnimation: {
        duration: 250,
      },
    });

    this.overlayDomCloser.addEventListener('click', this.close, false)
  }

  constructor2(openLayersHandler:Map, containner:string, 
        pupupContainner:string, pupupCloser:string, pupupContent:string,
        overlayId:string) {
    this.openLayersHandler = openLayersHandler
    this.mapDomContainner = document.getElementById(containner);
    
    this.overlayDomContainner = document.getElementById(pupupContainner);
    this.overlayDomCloser = document.getElementById(pupupCloser);
    this.overlayDomContent = document.getElementById(pupupContent);

    if(this.overlayDomContainner) {
      this.openLayerOverlay = new Overlay({
        id: overlayId,
        element: this.overlayDomContainner,
        autoPan: true,
        autoPanAnimation: {
          duration: 250,
        },
      });
    }

    this.overlayDomCloser?.addEventListener('click', this.close, false)
  }

  destructor() {
    this.overlayDomCloser?.removeEventListener('click', this.close, false)
    if(this.overlayDomContainner) {
      this.mapDomContainner?.removeChild(this.overlayDomContainner)
    }
    this.overlayDomContainner = null
  }

  // need arrow funcion!!!
  close = () => {
    this.addTargetDom?.removeEventListener('click', this.popupAddTarget, false)
    this.createOrderDom?.removeEventListener('click', this.popupCreateOrder, false)
    this.openLayerOverlay.setPosition(undefined);
    this.overlayDomCloser?.blur();
    return false;
  };

  add() {
    this.openLayersHandler?.addOverlay(this.openLayerOverlay)
  }

  remove() {
    this.openLayersHandler?.addOverlay(this.openLayerOverlay)
  }

  showDefaultPopup(htmlModule: string, event:DefaultPopupDataInfo) {
    const coordinate = event.coordinate;
    if(htmlModule === OLMAPPOPUPINFOEVENT) {
      if(this.overlayDomContent) {
        this.overlayDomContent.innerHTML = `
          <div class="row_nw_fs_center ol_popup_lnglat">经度:${event.longitudeText}</div>
          <div class="row_nw_fs_center ol_popup_lnglat">纬度:${event.latitudeText}</div>
          <div class="hgap_15"></div>
          <div class="row_nw_sb_center ol_popup_action_box">

            <div class="row_nw_fs_center ol_popup_sm_action_box">
              <div class="row_nw_fs_center ol_popup_sm_action_image_box">
                <img class="ol_popup_sm_action_image" src=${mapHomeImageUrl} alt="T">
              </div>
              <div id="ol_popup_add_target" class="row_nw_fs_center ol_popup_sm_action_title">加入目标库</div>
            </div>
            <div class="row_nw_fs_center ol_popup_sm_action_box">
              <div class="row_nw_fs_center ol_popup_sm_action_image_box">
                <img class="ol_popup_sm_action_image" src=${mapHomeImageUrl} alt="C">
              </div>
              <div id="ol_popup_create_order" class="row_nw_fs_center ol_popup_sm_action_title">创建订单</div>
            </div>

          </div>
        `;

        this.addTargetDom = document.getElementById('ol_popup_add_target');
        this.createOrderDom = document.getElementById('ol_popup_create_order');
        this.addTargetDom?.addEventListener('click', this.popupAddTarget, false)
        this.createOrderDom?.addEventListener('click', this.popupCreateOrder, false)

      }
    } else if(htmlModule === OLMAPPOPUPINFO) {
      const hdms = toStringHDMS(olProj.toLonLat(coordinate));
      if(this.overlayDomContent) {
        this.overlayDomContent.innerHTML = '<p>You clicked here:</p><code>' + hdms + '</code>';
      }
    }
    this.openLayerOverlay.setPosition(coordinate);
  }

  popupAddTarget = () => {
    const mapClickAction = computed( () => store.state.openLayers.mapClickAction );
    const mapClickActionNew = {
      source: mapClickAction.value.source,
      action: mapClickAction.value.action, 
      data: {
        ...mapClickAction.value.data,
        useTo: "createTarget"
      }
    }
    updateOpenLayerMapClickAction(mapClickActionNew)
    updateNavbar(TARGETLIB)
  };

  popupCreateOrder = () => {
    const mapClickAction = computed( () => store.state.openLayers.mapClickAction );
    const mapClickActionNew = {
      source: mapClickAction.value.source,
      action: mapClickAction.value.action, 
      data: {
        ...mapClickAction.value.data,
        useTo: "createOrder"
      }
    }
    updateOpenLayerMapClickAction(mapClickActionNew)

    updateNavbar(CREATEORDER)
  };

  // showPopup(event:MapBrowserEvent<UIEvent> ) {
  showPopup(event:DefaultPopupDataInfo) {
    const coordinate = event.coordinate;
    if(this.overlayDomContent && event.html) {
      this.overlayDomContent.innerHTML = event.html;
    }
    this.openLayerOverlay.setPosition(coordinate);
  }
}
export class OpenLayerTargetMarks {
  openLayersHandler:Map;
  targetIconStyle: Style;
  targetIconActiveStyle: Style;
  targetMarkVectorLayers: OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler,
    this.targetIconStyle = new Style({
      image: new Circle({
        fill: new Fill({ color: '#5ACC00' }),
        stroke: new Stroke({ color: '#333333', width: 1.5 }),
        radius: 6
      })
    })

    this.targetIconActiveStyle = new Style({
      image: new Circle({
        fill: new Fill({ color: '#00FFFF' }), // 荧光蓝
        stroke: new Stroke({ color: '#333333', width: 1.5 }), // 黑圈
        radius: 6
      })
    })
  }

  add(targetPoint: TargetPointDataInfo) {
    if(!targetPoint.isChanged) {
      return
    }
    this.remove(targetPoint)
    const orderMarkOption = {
      geometry: new Point(olProj.fromLonLat([targetPoint.longitude, targetPoint.latitude])),
      name: targetPoint.name,
      id: targetPoint.id
    }

    let targetMarkFeature = new Feature(orderMarkOption)
    if(targetPoint.isActive) {
      targetMarkFeature.setStyle(this.targetIconActiveStyle)
    } else {
      targetMarkFeature.setStyle(this.targetIconStyle)
    }
    
    targetMarkFeature.setId(targetPoint.id)
    const properties = {
      customize: true,
      meta: targetPoint
    }
    targetMarkFeature.setProperties(properties, true);

    const targetMarkVectorSource = new VectorSource({
      features: [targetMarkFeature],
      wrapX: false
    })

    const targetMarkVectorLayer = new VectorLayer({
      source: targetMarkVectorSource,
      zIndex: 1
    })

    if(targetPoint.isActive) {
      targetMarkVectorLayer.setZIndex(2)
    }

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(targetMarkVectorLayer);
    }

    this.targetMarkVectorLayers[targetPoint.id] = {
      style: targetPoint.isActive ? this.targetIconActiveStyle : this.targetIconStyle ,
      feature: targetMarkFeature,
      source: targetMarkVectorSource,
      vectorLayer: targetMarkVectorLayer,
      meta: targetPoint
    }
  }

  remove(targetPoint: TargetPointDataInfo) {
    const id = targetPoint.id
    const targetLayer = this.targetMarkVectorLayers[id]
    if (this.openLayersHandler && targetLayer) {
      this.openLayersHandler.removeLayer(targetLayer.vectorLayer)
    }
  }

  update(targetPoint: TargetPointDataInfo) {
    const id = targetPoint.id
    const targetLayer = this.targetMarkVectorLayers[id]
    if (this.openLayersHandler && targetLayer) {
      if(targetPoint.isActive) {
        targetLayer.feature.setStyle(this.targetIconActiveStyle)
      } else {
        targetLayer.feature.setStyle(this.targetIconStyle)
      }
    }
  }

  addAll(targetPointArr: Array<TargetPointDataInfo>) {
    targetPointArr.forEach((targetPoint) => {
      this.add(targetPoint)
    })
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.targetMarkVectorLayers) {
        if (Object.hasOwnProperty.call(this.targetMarkVectorLayers, key)) {
          const targetLayer = this.targetMarkVectorLayers[key]
          this.openLayersHandler.removeLayer(targetLayer.vectorLayer)
        }
      }
    }
  }
}

export class OpenLayerCircleGeom {
  openLayersHandler:Map;
  circleGeomIconStyle: Style;
  circleGeomIconActiveStyle: Style;
  circleGeomVectorLayers: OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler,
    this.circleGeomIconStyle = new Style({
      fill: new Fill({ color: '#5ACC0000' }),
      stroke: new Stroke({ color: '#333333', width: 4 }),
    })

    this.circleGeomIconActiveStyle = new Style({
      fill: new Fill({ color: [255, 255, 255, 0] }),
      stroke: new Stroke({ color: '#00FFFF', width: 4 }),
    })
  }

  add(targetPoint: TargetPointDataInfo) {
    if(!targetPoint.isChanged) {
      return
    }
    this.remove(targetPoint)
    const radius = targetPoint.areaUnitM ? targetPoint.areaUnitM : 8000
    const orderMarkOption = {
      geometry: new CircleGeom(olProj.fromLonLat([targetPoint.longitude, targetPoint.latitude]), radius),
      name: targetPoint.name,
      id: targetPoint.id
    }

    let circleGeomFeature = new Feature(orderMarkOption)
    if(targetPoint.isActive) {
      circleGeomFeature.setStyle(this.circleGeomIconActiveStyle)
    } else {
      circleGeomFeature.setStyle(this.circleGeomIconStyle)
    }
    
    circleGeomFeature.setId(targetPoint.id)
    const properties = {
      customize: true,
      meta: targetPoint
    }
    circleGeomFeature.setProperties(properties, true);

    const circleGeomVectorSource = new VectorSource({
      features: [circleGeomFeature],
      wrapX: false
    })

    const circleGeomVectorLayer = new VectorLayer({
      source: circleGeomVectorSource,
      zIndex: 1
    })
    
    if(targetPoint.isActive) {
      circleGeomVectorLayer.setZIndex(2)
    }

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(circleGeomVectorLayer);
    }

    this.circleGeomVectorLayers[targetPoint.id] = {
      style: targetPoint.isActive ? this.circleGeomIconActiveStyle : this.circleGeomIconStyle ,
      feature: circleGeomFeature,
      source: circleGeomVectorSource,
      vectorLayer: circleGeomVectorLayer,
      meta: targetPoint
    }
  }

  remove(targetPoint: TargetPointDataInfo) {
    const id = targetPoint.id
    const targetLayer = this.circleGeomVectorLayers[id]
    if (this.openLayersHandler && targetLayer) {
      this.openLayersHandler.removeLayer(targetLayer.vectorLayer)
    }
  }

  update(targetPoint: TargetPointDataInfo) {
    const id = targetPoint.id
    const targetLayer = this.circleGeomVectorLayers[id]
    if (this.openLayersHandler && targetLayer) {
      if(targetPoint.isActive) {
        targetLayer.feature.setStyle(this.circleGeomIconActiveStyle)
      } else {
        targetLayer.feature.setStyle(this.circleGeomIconStyle)
      }
    }
  }

  addAll(targetPointArr: Array<TargetPointDataInfo>) {
    targetPointArr.forEach((targetPoint) => {
      this.add(targetPoint)
    })
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.circleGeomVectorLayers) {
        if (Object.hasOwnProperty.call(this.circleGeomVectorLayers, key)) {
          const targetLayer = this.circleGeomVectorLayers[key]
          this.openLayersHandler.removeLayer(targetLayer.vectorLayer)
        }
      }
    }
  }
}

export class OpenLayerImagesMarks {
  openLayersHandler:Map;
  imagesMarkVectorLayers: OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(point:OrderImagePointDataInfo) {
    this.remove(point)
    const imageMarkOption = {
      // type: 'icon',
      geometry: new Point(olProj.fromLonLat([point.longitude, point.latitude])),
      name: point.name,
      id: point.id
    }

    const imageMarkFeature = new Feature(imageMarkOption)
    let iconUrl = mapGreenMarkImageUrl
    if(point.isObservedTarget) {
      iconUrl = mapBlueMarkImageUrl
    } else if (point.isActive) {
      iconUrl = mapBlueMarkImageUrl
    }
    const imageIconStyle = new Style({
      image: new Icon({
        anchor: [0.5, 0.5],
        src: iconUrl,
        scale: 0.2
      }),
      'text': new Text({
        font: 'bold 12px serif',
        text: String(point.counter ? point.counter: 1),
        offsetY: 0, // -20
        padding: [3, 5, 3, 5],
        fill: new Fill({
          color: '#FFF'
        })

      })
    })

    imageMarkFeature.setStyle(imageIconStyle)
    imageMarkFeature.setId(point.id)
    const properties = {
      customize: true,
      meta: point
    }
    imageMarkFeature.setProperties(properties, true);

    const imageMarkVectorSource = new VectorSource({
      features: [imageMarkFeature],
      wrapX: false
    })

    const imageMarkVectorLayer = new VectorLayer({
      source: imageMarkVectorSource,
      zIndex: 1
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(imageMarkVectorLayer);
    } 

    this.imagesMarkVectorLayers[point.id] = {
      style: imageIconStyle,
      feature: imageMarkFeature,
      source: imageMarkVectorSource,
      vectorLayer: imageMarkVectorLayer,
      meta: point
    }
  }

  remove(point: OrderImagePointDataInfo) {
    const pointLayer = this.imagesMarkVectorLayers[point?.id]
    if (this.openLayersHandler && pointLayer) {
      this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
      this.imagesMarkVectorLayers[point.id] = null  //??????
    }
  }

  
  addAll(imagePointArr: Array<OrderImagePointDataInfo>) {
    imagePointArr.forEach((targetPoint) => {
      this.add(targetPoint)
    })
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.imagesMarkVectorLayers) {
        if (Object.hasOwnProperty.call(this.imagesMarkVectorLayers, key)) {
          const pointLayer = this.imagesMarkVectorLayers[key]
          this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
        }
      }
    }
  }

}

export class OpenLayerCustomImageMarks {
  openLayersHandler:Map;
  imagesMarkVectorLayers: OpenlayerVectorLayersDataInfo = {};

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(point:any, counter:number=0, imageUrl:string=mapRedMarkImageUrl) {
    this.remove(point)
    const imageMarkOption = {
      geometry: new Point(olProj.fromLonLat([point.longitude, point.latitude])),
      name: point.name,
      id: point.id
    }

    const imageMarkFeature = new Feature(imageMarkOption)
    let imageIconStyle = new Style({
      image: new Icon({
        // anchor: [0.5, 1],
        anchor: [0.5, 0.5],
        src: imageUrl,
        scale: 0.2
      })
    })
    if(counter) {
      imageIconStyle = new Style({
        image: new Icon({
          anchor: [0.5, 0.5],
          src: imageUrl,
          scale: 0.2
        }),
        'text': new Text({
          font: 'bold 12px serif',
          text: String(counter),
          offsetY: 0, // -20
          padding: [3, 5, 3, 5],
          fill: new Fill({
            color: '#FFF'
          })
  
        })
      })
    }

    imageMarkFeature.setStyle(imageIconStyle)
    imageMarkFeature.setId(point.id)
    const properties = {
      customize: true,
      meta: point
    }
    imageMarkFeature.setProperties(properties, true);

    const imageMarkVectorSource = new VectorSource({
      features: [imageMarkFeature],
      wrapX: false
    })

    const imageMarkVectorLayer = new VectorLayer({
      source: imageMarkVectorSource,
      zIndex: 1
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(imageMarkVectorLayer);
    } 

    this.imagesMarkVectorLayers[point.id] = {
      style: imageIconStyle,
      feature: imageMarkFeature,
      source: imageMarkVectorSource,
      vectorLayer: imageMarkVectorLayer,
      meta: point
    }
  }

  remove(point: any) {
    const pointLayer = this.imagesMarkVectorLayers[point?.id]
    if (this.openLayersHandler && pointLayer) {
      this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
      this.imagesMarkVectorLayers[point.id] = null  //??????
    }
  }

  
  addAll(imagePointArr: Array<any>) {
    imagePointArr.forEach((targetPoint) => {
      this.add(targetPoint)
    })
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.imagesMarkVectorLayers) {
        if (Object.hasOwnProperty.call(this.imagesMarkVectorLayers, key)) {
          const pointLayer = this.imagesMarkVectorLayers[key]
          this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
        }
      }
    }
  }

}


export class OpenLayerImageTileWMTS {
  openLayersHandler:Map;
  imagesTileWMTSVectorLayers: OpenlayerVectorLayersDataInfo = {};
  projection = olProj.get('EPSG:4326')
  // matrixIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
  matrixIds = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 
                '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21']
  resolutions = [0.703125, 0.3515625, 0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 6.866455078125E-4, 3.4332275390625E-4, 1.71661376953125E-4, 8.58306884765625E-5,
    4.291534423828125E-5, 2.1457672119140625E-5, 1.0728836059570312E-5, 5.364418029785156E-6, 2.682209014892578E-6, 1.341104507446289E-6, 6.705522537231445E-7, 3.3527612686157227E-7]

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(point:any) {
    this.remove(point)
    const projectionExtent = this.projection.getExtent()
    const size = getWidth(projectionExtent) / 256
    const orderID = point.orderId
    const wmtsOption = {
      url: `http://192.168.3.248:9002/geoServer/wmts/${orderID}/`,
      layer: '',
      matrixSet: 'EPSG:4326',
      format: 'image/png',
      style:'default',
      projection: this.projection,
      tileGrid: new WTMSTileGrid({
        origin: getTopLeft(projectionExtent),
        resolutions: this.resolutions,
        matrixIds: this.matrixIds
      })
    }

    const imagetileSource = new WMTS(wmtsOption)
    
    const imagetileVectorLayer = new TileLayer({
      source: imagetileSource
    })
    imagetileVectorLayer.setZIndex(5)    

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(imagetileVectorLayer);
    } 

    this.imagesTileWMTSVectorLayers[point.id] = {
      style: '',
      feature: '',
      source: imagetileSource,
      vectorLayer: imagetileVectorLayer,
      meta: point
    }
  }

  remove(point: any) {
    const pointLayer = this.imagesTileWMTSVectorLayers[point?.id]
    if (this.openLayersHandler && pointLayer) {
      this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
    }
  }

  
  addAll(imagePointArr: Array<any>) {
    imagePointArr.forEach((targetPoint) => {
      this.add(targetPoint)
    })
  }

  clear() {
    if (this.openLayersHandler) {
      for (const key in this.imagesTileWMTSVectorLayers) {
        if (Object.hasOwnProperty.call(this.imagesTileWMTSVectorLayers, key)) {
          const pointLayer = this.imagesTileWMTSVectorLayers[key]
          this.openLayersHandler.removeLayer(pointLayer.vectorLayer)
        }
      }
    }
  }

}

export function initOpenLayerMap(minMapLevel:number, maxMapLevel: number) {
  const controls = olControl.defaults({
    attribution: false,
    zoom: false,
    rotate: false
  }).extend([]);

  // const interactions = defaultInteractions({
  //   dragPan: false
  //   // mouseWheelZoom: false
  // })

  const mapExtent = olProj.transformExtent([-180, -84.5, 180, 84.5], 'EPSG:4326', 'EPSG:3857');

  const maptilerStyleJson = 'http://192.168.3.248:58787/styles/basic/style.json'

  const openLayersHandler = new Map({
    controls: controls,
    target: 'openLayersMapBaseBox',
    // layers: [
    //   new TileLayer({
    //     source: new OSM()
    //   })
    // ],
    // interactions: interactions,
    view: new View({
      extent: mapExtent,
      center: olProj.fromLonLat([116.345152, 39.946504]),
      constrainResolution: true,
      zoom: minMapLevel,
      minZoom: minMapLevel,
      maxZoom: maxMapLevel
    })
  })

  apply(openLayersHandler, maptilerStyleJson)
  const deviceMarkHandler = new OpenLayerDeviceMarks(openLayersHandler)
  const deviceMarkDataInfo:DeviceMarkDataInfo = {
    longitude: 116.345152,
    longitudeText: '116.345152E',
    latitude: 39.946504,
    latitudeText:'39.946504S',
    name: 'deviceReceiver',
    id: 'deviceReceiver_1',
    isChanged: true
  }
  deviceMarkHandler.add(deviceMarkDataInfo);
  // deviceMarkHandler.remove(deviceMarkDataInfo);

  return openLayersHandler;
}

export function getLngLatFromEvent(event:MapBrowserEvent<UIEvent>) {
  const coordinate = event.coordinate;
  const lngLat = olProj.toLonLat(coordinate);
  const {longitude, latitude} = calibrateOpenLayerLngLat(lngLat[0], lngLat[1]);
  const lngLatRes = getLngLatFromText(String(longitude), String(latitude));
  return lngLatRes;
}

export function getRectanglePathExtent(lng:number, lat:number, areaUnitM:number=30000) {
  let areaHalf = areaUnitM / 2
  const latStep = geoMeter2Lat(areaHalf)  // 0.13489824088780958 // 0.141085761771115935
  let lngStep:number = 0
  if(lat) {
    lngStep = geoMeter2Lng(areaHalf, lat)
  } else {
    lngStep = geoMeter2Lng(areaHalf, 0.01)
  }

  const lnglat = {
    lngLeft: lng - lngStep,
    lngRight: lng + lngStep,
    latUp: lat - latStep,
    latDown: lat + latStep
  }

  let lnglatTemp = 0
  if (lnglat.lngLeft > lnglat.lngRight) {
    lnglatTemp = lnglat.lngLeft
    lnglat.lngLeft = lnglat.lngRight
    lnglat.lngRight = lnglatTemp
  }

  if (lnglat.latDown > lnglat.latUp) {
    lnglatTemp = lnglat.latDown
    lnglat.latDown = lnglat.latUp
    lnglat.latUp = lnglatTemp
  }

  const path = [
    [lnglat.lngLeft, lnglat.latUp],
    [lnglat.lngRight, lnglat.latUp],
    [lnglat.lngRight, lnglat.latDown],
    [lnglat.lngLeft, lnglat.latDown],
    [lnglat.lngLeft, lnglat.latUp]
  ]
  const extent = [lnglat.lngLeft, lnglat.latDown, lnglat.lngRight, lnglat.latUp]

  return { path, extent }
}


export function initOpenLayerCampareMap(minMapLevel:number, maxMapLevel: number) {
  const controls = olControl.defaults({
    attribution: false,
    zoom: false,
    rotate: false
  }).extend([]);

  const mapExtent = olProj.transformExtent([-180, -84.5, 180, 84.5], 'EPSG:4326', 'EPSG:3857');

  const openLayersHandler = new Map({
    controls: controls,
    target: 'openLayersMapBaseBox',
    layers: [],
    view: new View({
      extent: mapExtent,
      center: olProj.fromLonLat([116.345152, 39.946504]),
      constrainResolution: true,
      zoom: 15,
      minZoom: minMapLevel,
      maxZoom: maxMapLevel
    })
  })

  return openLayersHandler;
}