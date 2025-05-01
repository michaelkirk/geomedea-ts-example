import { BoundingBox } from '../types';
import { initGeomedea } from '../utils';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  createMap,
  getFeaturesInBoundingBox,
  setupBoundingBoxFilteredMap,
  US_COUNTIES_FILE_PATH
} from './maplibre-common';

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the WASM module
  await initGeomedea();
  
  // Create MapLibre map centered on Colorado
  const map = createMap("map", {
    style: "https://demotiles.maplibre.org/style.json",
    center: [-104, 39] as [number, number],
    zoom: 5,
    maxZoom: 8,
  });

  // Get a rect around the map center for filtering
  function getBoundingBox(): BoundingBox {
    const { lng, lat } = map.getCenter();
    const size = 4;
    return { 
      minX: lng - size, 
      minY: lat - size, 
      maxX: lng + size, 
      maxY: lat + size 
    };
  }

  // Setup the filtered map with bounding box
  setupBoundingBoxFilteredMap(
    map,
    "counties",
    getBoundingBox,
    US_COUNTIES_FILE_PATH,
    true
  );
});