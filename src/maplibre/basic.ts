import { FeatureCollection } from 'geojson';
import { initGeomedea } from '../utils';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  createMap, 
  getAllFeatures, 
  DEFAULT_US_MAP_CONFIG,
  setupBasicCountiesMap,
  US_COUNTIES_FILE_PATH
} from './maplibre-common';

// Simple wrapper to get all features
async function getFeatureCollection(): Promise<FeatureCollection> {
  return getAllFeatures(US_COUNTIES_FILE_PATH);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the WASM module
  await initGeomedea();
  
  // Create MapLibre map
  const map = createMap("map", DEFAULT_US_MAP_CONFIG);

  // Setup the basic counties map with all features
  setupBasicCountiesMap(map, getFeatureCollection);
});