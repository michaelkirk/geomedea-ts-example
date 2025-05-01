import { HttpReader } from 'geomedea/geomedea.js';
import { BoundingBox, FeatureCollection } from '../types';
import { initGeomedea, assertWasmLoaded, makeAbsolutePath, addIdsToFeatures } from '../utils';

// Import maplibregl and underscore types without importing the libraries (already loaded in HTML)
declare const maplibregl: any;
declare const _: any;

// This example is similar to filtered.ts but demonstrates working with a larger dataset
// For this example, we're still using the same dataset but simulating a larger one

async function getFeatureCollection(bbox: BoundingBox): Promise<FeatureCollection> {
  assertWasmLoaded();
  
  // Use a remotely hosted large dataset
  const input = "https://d3imsg4yynhh83.cloudfront.net/test-data/population_areas.geomedea";

  const httpReader = new HttpReader(input);
  const featureCollectionString = await httpReader.select_bbox(
    bbox.maxY, bbox.maxX, bbox.minY, bbox.minX
  );
  const featureCollection = JSON.parse(featureCollectionString) as FeatureCollection;
  
  return addIdsToFeatures(featureCollection);
}

function getRect(bbox: BoundingBox): FeatureCollection {
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

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the WASM module
  await initGeomedea();
  
  // Create MapLibre map
  const map = new maplibregl.Map({
    container: "map",
    style: "https://demotiles.maplibre.org/style.json",
    center: [-73.98, 40.766],
    zoom: 13,
    maxZoom: 18,
    minZoom: 12,
  });

  // Get a rect around the map center
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

  let updateResults = async function() {
    const bbox = getBoundingBox();
    console.log("updating results with bbox", bbox);
    const featureCollection = await getFeatureCollection(bbox);
    map.getSource("blocks").setData(featureCollection);
  };

  map.on("load", () => {
    // Add empty blocks source for census data
    map.addSource("blocks", {
      type: "geojson",
      data: {type: "FeatureCollection", features: []},
    });
    
    // Population-based coloring
    const pop = ["to-number", ["get", "population"], 0];
    const color = [
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

    // Handle click events
    map.on("click", "blocks-fill", (e: any) => {
      const props = e.features[0].properties;
      const html = `${props.population} people live in this census block.`;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    // Handle hover events
    let hoveredStateId: number | null = null;
    
    map.on("mousemove", "blocks-fill", (e: any) => {
      if (e.features.length > 0) {
        if (hoveredStateId !== null) {
          map.setFeatureState(
            { source: "blocks", id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState(
          { source: "blocks", id: hoveredStateId },
          { hover: true }
        );
      }
    });
    
    map.on("mouseenter", "blocks-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    
    map.on("mouseleave", "blocks-fill", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredStateId !== null) {
        map.setFeatureState(
          { source: "blocks", id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = null;
    });

    // Throttle updates to max once per second
    updateResults = _.throttle(updateResults, 1000);

    // Show rectangle for bounding box
    map.getSource("rectangle").setData(getRect(getBoundingBox()));

    // Initial update
    updateResults();

    // Update on map move
    map.on("moveend", () => {
      map.getSource("rectangle").setData(getRect(getBoundingBox()));
      updateResults();
    });
  });
});