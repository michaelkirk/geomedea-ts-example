import { FeatureCollection } from 'geojson';
import * as maplibregl from 'maplibre-gl';
import { GeoJSONSource } from 'maplibre-gl';
import { HttpReader } from 'geomedea/geomedea.js';
import { BoundingBox } from '../types';
import { assertWasmLoaded, makeAbsolutePath, addIdsToFeatures } from '../utils';
import * as _ from 'underscore';

// Common constants
export const DEFAULT_STYLE_URL = "https://demotiles.maplibre.org/style.json";
export const DEFAULT_MAX_ZOOM = 8;
export const US_COUNTIES_FILE_PATH = "../../../files/test_fixtures/USCounties-compressed.geomedea";
export const POPULATION_DATA_URL = "https://d3imsg4yynhh83.cloudfront.net/test-data/population_areas.geomedea";

// Common map configuration options
export interface MapConfig {
  style: string;
  center: [number, number];
  zoom: number;
  maxZoom?: number;
  minZoom?: number;
}

export const DEFAULT_US_MAP_CONFIG: MapConfig = {
  style: DEFAULT_STYLE_URL,
  center: [-98, 39],
  zoom: 3,
  maxZoom: DEFAULT_MAX_ZOOM,
};

export const DEFAULT_NYC_MAP_CONFIG: MapConfig = {
  style: DEFAULT_STYLE_URL,
  center: [-73.98, 40.766],
  zoom: 13,
  maxZoom: 18,
  minZoom: 12,
};

// Common function to create a map with container ID
export function createMap(containerId: string, options: MapConfig = DEFAULT_US_MAP_CONFIG): maplibregl.Map {
  return new maplibregl.Map({
    container: containerId,
    style: options.style,
    center: options.center,
    zoom: options.zoom,
    maxZoom: options.maxZoom,
    minZoom: options.minZoom,
  });
}

// Common function to get all features
export async function getAllFeatures(filePath: string = US_COUNTIES_FILE_PATH): Promise<FeatureCollection> {
  assertWasmLoaded();
  
  const input = makeAbsolutePath(filePath);
  const httpReader = new HttpReader(input);
  const featureCollectionString = await httpReader.select_all();
  const featureCollection = JSON.parse(featureCollectionString) as FeatureCollection;
  
  return addIdsToFeatures(featureCollection);
}

// Common function to get features within a bounding box
export async function getFeaturesInBoundingBox(
  bbox: BoundingBox, 
  filePath: string = US_COUNTIES_FILE_PATH
): Promise<FeatureCollection> {
  assertWasmLoaded();
  
  const input = filePath.startsWith("http") ? filePath : makeAbsolutePath(filePath);
  const httpReader = new HttpReader(input);
  const featureCollectionString = await httpReader.select_bbox(
    bbox.maxY, bbox.maxX, bbox.minY, bbox.minX
  );
  const featureCollection = JSON.parse(featureCollectionString) as FeatureCollection;
  
  return addIdsToFeatures(featureCollection);
}

// Create a rectangle for visualization
export function getRectangleFeature(bbox: BoundingBox): FeatureCollection {
  const coords = [[
    [bbox.minX, bbox.minY],
    [bbox.maxX, bbox.minY],
    [bbox.maxX, bbox.maxY],
    [bbox.minX, bbox.maxY],
    [bbox.minX, bbox.minY],
  ]];
  
  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      geometry: { type: "Polygon", coordinates: coords },
      properties: {}
    }]
  };
}

// Set up hover behavior for a layer
export function setupHoverBehavior(
  map: maplibregl.Map, 
  layerId: string, 
  sourceId: string
): void {
  let hoveredStateId: number | null = null;

  map.on("mousemove", layerId, (e: any) => {
    if (e.features.length > 0) {
      if (hoveredStateId !== null) {
        map.setFeatureState(
          { source: sourceId, id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = e.features[0].id;
      map.setFeatureState(
        { source: sourceId, id: hoveredStateId! },
        { hover: true }
      );
    }
  });
  
  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
    if (hoveredStateId !== null) {
      map.setFeatureState(
        { source: sourceId, id: hoveredStateId },
        { hover: false }
      );
    }
    hoveredStateId = null;
  });
}

// Set up click behavior for showing popups
export function setupClickForPopup(
  map: maplibregl.Map, 
  layerId: string, 
  popupContentFn: (properties: any) => string
): void {
  map.on("click", layerId, (e: any) => {
    const props = e.features[0].properties;
    const html = popupContentFn(props);
    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });
}

// Add standard county layers
export function addCountyLayers(map: maplibregl.Map, sourceId: string = "counties"): void {
  map.addLayer({
    id: `${sourceId}-fill`,
    type: "fill",
    source: sourceId,
    paint: {
      "fill-color": "#0000FF",
      "fill-opacity": [
        "case",
        ["boolean", ["feature-state", "hover"], false],
        1,
        0.5
      ],
    },
  });
  
  map.addLayer({
    id: `${sourceId}-line`,
    type: "line",
    source: sourceId,
    paint: {
      "line-color": "#0000FF",
      "line-opacity": 0.9,
      "line-width": 2,
    },
  });
}

// Create a throttled update function for map data
export function createThrottledMapUpdater(
  map: maplibregl.Map,
  sourceId: string,
  getBoundingBoxFn: () => BoundingBox,
  getFeaturesFn: (bbox: BoundingBox) => Promise<FeatureCollection>,
  throttleInterval: number = 1000
): () => void {
  let updateFunction = async function() {
    const bbox = getBoundingBoxFn();
    console.log("updating results with bbox", bbox);
    const featureCollection = await getFeaturesFn(bbox);
    (map.getSource(sourceId) as GeoJSONSource)!.setData(featureCollection);
  };
  
  return _.throttle(updateFunction, throttleInterval);
}

// Setup basic map for counties
export function setupBasicCountiesMap(
  map: maplibregl.Map,
  getFeaturesFn: () => Promise<FeatureCollection>
): void {
  map.on("load", async () => {
    const featureCollection = await getFeaturesFn();
    
    map.addSource("counties", {
      type: "geojson",
      data: featureCollection,
    });
    
    addCountyLayers(map);
    
    setupHoverBehavior(map, "counties-fill", "counties");
    setupClickForPopup(map, "counties-fill", (props) => {
      return `<h1>${props.NAME} ${props.LSAD}, ${props.STATE}</h1>`;
    });
  });
}

// Setup a bounding box based map with viewport filtering
export function setupBoundingBoxFilteredMap(
  map: maplibregl.Map,
  sourceId: string,
  getBoundingBoxFn: () => BoundingBox,
  filePath: string = US_COUNTIES_FILE_PATH,
  showRectangle: boolean = true
): void {
  map.on("load", () => {
    // Add empty source
    map.addSource(sourceId, {
      type: "geojson",
      data: {type: "FeatureCollection", features: []},
    });
    
    // Add standard layers
    addCountyLayers(map, sourceId);
    
    // Setup interactive behaviors
    setupHoverBehavior(map, `${sourceId}-fill`, sourceId);
    setupClickForPopup(map, `${sourceId}-fill`, (props) => {
      return `<h1>${props.NAME} ${props.LSAD}, ${props.STATE}</h1>`;
    });
    
    if (showRectangle) {
      // Add rectangle source
      map.addSource("rectangle", {
        type: "geojson",
        data: {type: "FeatureCollection", features: []},
      });
      
      map.addLayer({
        id: "rectangle",
        type: "line",
        source: "rectangle",
        paint: {
          "line-color": "#0000FF",
          "line-opacity": 0.9,
          "line-width": 3,
        },
      });
      
      // Show initial rectangle
      (map.getSource("rectangle") as GeoJSONSource)!.setData(getRectangleFeature(getBoundingBoxFn()));
    }
    
    // Create update function
    const updateResults = createThrottledMapUpdater(
      map,
      sourceId,
      getBoundingBoxFn,
      (bbox) => getFeaturesInBoundingBox(bbox, filePath)
    );
    
    // Initial update
    updateResults();
    
    // Update on map move
    if (showRectangle) {
      map.on("moveend", () => {
        (map.getSource("rectangle") as GeoJSONSource)!.setData(getRectangleFeature(getBoundingBoxFn()));
        updateResults();
      });
    } else {
      map.on("moveend", updateResults);
    }
  });
}