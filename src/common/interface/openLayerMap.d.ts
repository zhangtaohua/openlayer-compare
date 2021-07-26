import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

declare interface OpenlayerVectorLayerDataInfo {
  style: any;
  feature: any;
  source: VectorSource;
  vectorLayer: VectorLayer;
  meta:any;
}

declare interface OpenlayerVectorLayersDataInfo {
  [propName: string]: OpenlayerVectorLayerDataInfo
}

declare interface StaticImageDataInfo {
  id: string | number;
  name:string;
  longitude:number;
  longitudeText?:string;
  latitude:number;
  latitudeText?:string;
  url: string;
  extents:Array<number>;
}


declare interface PathLineDataInfo {
  id: string | number;
  name:string;
  longitude:number;
  longitudeText?:string;
  latitude:number;
  latitudeText?:string;
  paths: any;
  rollerType?: string;
  coordinate?:any;
}
