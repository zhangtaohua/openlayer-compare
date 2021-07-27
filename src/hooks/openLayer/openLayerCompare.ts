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

import MousePosition from 'ol/control/MousePosition';
import {createStringXY} from 'ol/coordinate';


import '/@/assets/style/openlayer.css';

import {getLngLatFromText, calibrateOpenLayerLngLat, geoMeter2Lat, geoMeter2Lng } from '/@/utils/common/geoCommon'

export class OpenLayerStaticImages {
  openLayersHandler:Map;
  openLayerStaticImages:OpenlayerVectorLayersDataInfo = {}

  constructor(openLayersHandler:Map) {
    this.openLayersHandler = openLayersHandler
  }

  add(image: StaticImageDataInfo) {
    this.remove(image)
    const { extents } = image

    const imageExtents = olProj.transformExtent(extents, 'EPSG:4326', 'EPSG:3857')
    const staticImagesVectorSource = new ImageStatic({
      // attributions: '© <a href="http://xkcd.com/license.html">xkcd</a>',
      url: image.url,
      imageSmoothing: true,
      imageExtent: imageExtents
    })

    staticImagesVectorSource.setProperties({ 
      customize: true,
      isCanSize: image.isCanSize,
      meta: image 
    });

    const staticImagesVectorLayer = new Image({
      source: staticImagesVectorSource,
      extent: imageExtents
    })

    if (this.openLayersHandler) {
      this.openLayersHandler.addLayer(staticImagesVectorLayer)
    }

    this.openLayerStaticImages[image.id] = {
      style: '',
      feature: '',
      source: staticImagesVectorSource,
      vectorLayer: staticImagesVectorLayer,
      olDefaultExtends: imageExtents,
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

  // extends: 'EPSG: 3857'
  resizeX(iamge:StaticImageDataInfo, extents: any) {
    const imageLayer = this.openLayerStaticImages[iamge.id]
    if (this.openLayersHandler && imageLayer) {
      const olDefaultExtends = imageLayer.olDefaultExtends
      let extentsNew:Array<number> = []
      if(extents[0] >= olDefaultExtends[2]) {
        extentsNew = [
          olDefaultExtends[2],
          olDefaultExtends[3],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      } else {
        extentsNew = [
          extents[0],
          olDefaultExtends[1],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      }
      imageLayer.vectorLayer.setExtent(extentsNew)
    }
  }

  resizeY(iamge:StaticImageDataInfo, extents: any) {
    const imageLayer = this.openLayerStaticImages[iamge.id]
    if (this.openLayersHandler && imageLayer) {
      const olDefaultExtends = imageLayer.olDefaultExtends
      let extentsNew:Array<number> = []
      if(extents[1] >= olDefaultExtends[3]) {
        extentsNew = [
          olDefaultExtends[2],
          olDefaultExtends[3],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      } else {
        extentsNew = [
          olDefaultExtends[0],
          extents[1],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      }
      imageLayer.vectorLayer.setExtent(extentsNew)
    }
  }

  resizeXY(iamge:StaticImageDataInfo, extents: any) {
    const imageLayer = this.openLayerStaticImages[iamge.id]
    if (this.openLayersHandler && imageLayer) {
      const olDefaultExtends = imageLayer.olDefaultExtends
      let extentsNew:Array<number> = []
      if(extents[1] >= olDefaultExtends[3]) {
        extentsNew = [
          olDefaultExtends[2],
          olDefaultExtends[3],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      } else {
        extentsNew = [
          extents[0],
          extents[1],
          olDefaultExtends[2],
          olDefaultExtends[3],
        ]
      }
      imageLayer.vectorLayer.setExtent(extentsNew)
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

  fitView(extents:any) {
    let extentsNew = olProj.transformExtent(extents, 'EPSG:4326', 'EPSG:3857');
    const resolution = this.openLayersViewer.getResolutionForExtent(extentsNew)
    this.openLayersViewer.setResolution(resolution)
    this.openLayersViewer.fit(extentsNew, {
      // constrainResolution: false,
      // earest:true,
      nearest:true
    })
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

  getDefaultSize() {
    const arrSize = this.openLayersHandler.getSize()
    const arrViewSize = this.openLayersViewer.calculateExtent(arrSize)
    const center = [
      (arrViewSize[0] + arrViewSize[2]) / 2,
      (arrViewSize[1] + arrViewSize[3]) / 2,
    ]
    return {
      viewSize: arrViewSize,
      viewCenter: center
    }
  }

  getPopupCoordinate() {
    const arrSize = this.openLayersHandler.getSize()
    const arrViewSize = this.openLayersViewer.calculateExtent(arrSize)
    return[(arrViewSize[0] + arrViewSize[2]) / 2, arrViewSize[1]]
  }

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
      zoom: 12,
      minZoom: minMapLevel,
      maxZoom: maxMapLevel
    })
  })

  return openLayersHandler;
}

export function getLngLatFromEvent(event:MapBrowserEvent<UIEvent>) {
  const coordinate = event.coordinate;
  const lngLat = olProj.toLonLat(coordinate);
  const {longitude, latitude} = calibrateOpenLayerLngLat(lngLat[0], lngLat[1]);
  const lngLatRes = getLngLatFromText(String(longitude), String(latitude));
  return lngLatRes;
}
