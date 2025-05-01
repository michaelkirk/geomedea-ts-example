export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Feature {
  type: string;
  geometry: {
    type: string;
    coordinates: any;
  };
  properties: any;
  id?: number;
}

export interface FeatureCollection {
  type: string;
  features: Feature[];
}