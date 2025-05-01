import { BoundingBox } from '../types';
import { initGeomedea } from '../utils';
import * as maplibregl from 'maplibre-gl';
import { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
  createMap,
  getFeaturesInBoundingBox,
  POPULATION_DATA_URL,
  DEFAULT_NYC_MAP_CONFIG,
  getRectangleFeature
} from './maplibre-common';

// This example is similar to filtered.ts but demonstrates working with a larger dataset

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the WASM module
  await initGeomedea();
  
  // Create MapLibre map
  const map = createMap("map", DEFAULT_NYC_MAP_CONFIG);

  // Get a rect around the map center based on current bounds
  function getBoundingBox(): BoundingBox {
    const { lng, lat } = map.getCenter();
    const { _sw, _ne } = map.getBounds();
    const size = Math.min(_ne.lng - lng, _ne.lat - lat) * 0.8;
    return { 
      minX: lng - size, 
      minY: lat - size, 
      maxX: lng + size, 
      maxY: lat + size 
    };
  }

  // Use a custom layer setup for population data visualization
  map.on("load", () => {
    // Add empty blocks source for census data
    map.addSource("blocks", {
      type: "geojson",
      data: {type: "FeatureCollection", features: []},
    });
    
    // Population-based coloring
    const pop: maplibregl.ExpressionSpecification = ["to-number", ["get", "population"], 0];
    const color: maplibregl.DataDrivenPropertyValueSpecification<string> = [
      "case",
      [">", pop, 750], "#800026",
      [">", pop, 500], "#BD0026",
      [">", pop, 250], "#E31A1C",
      [">", pop, 100], "#FC4E2A",
      [">", pop, 50], "#FD8D3C",
      [">", pop, 25], "#FEB24C",
      [">", pop, 10], "#FED976",
      "#FF0000",
    ];
    
    // Add blocks layers
    map.addLayer({
      id: "blocks-fill",
      type: "fill",
      source: "blocks",
      paint: {
        "fill-color": color,
        "fill-opacity": [
          "case",
          ["boolean", ["feature-state", "hover"], false],
          0.8,
          0.4
        ],
      },
    });
    
    map.addLayer({
      id: "blocks-line",
      type: "line",
      source: "blocks",
      paint: {
        "line-color": color,
        "line-opacity": 0.8,
        "line-width": 2,
      },
    });

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

    // Setup common interactive behaviors
    map.on("click", "blocks-fill", (e: any) => {
      const props = e.features[0].properties;
      const html = `${props.population} people live in this census block.`;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    // Create update function for population data
    const updateResults = async function() {
      const bbox = getBoundingBox();
      console.log("updating results with bbox", bbox);
      const featureCollection = await getFeaturesInBoundingBox(bbox, POPULATION_DATA_URL);
      (map.getSource("blocks") as GeoJSONSource)!.setData(featureCollection);
    };
    
    // Show rectangle for bounding box
    (map.getSource("rectangle") as GeoJSONSource)!.setData(getRectangleFeature(getBoundingBox()));

    // Initial update
    updateResults();

    // Update on map move
    map.on("moveend", () => {
      (map.getSource("rectangle") as GeoJSONSource)!.setData(getRectangleFeature(getBoundingBox()));
      updateResults();
    });
  });
});