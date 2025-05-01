import { HttpReader } from 'geomedea/geomedea.js';
import { FeatureCollection } from 'geojson';
import { BoundingBox } from '../types';
import { initGeomedea, assertWasmLoaded, makeAbsolutePath, addIdsToFeatures } from '../utils';
import * as maplibregl from 'maplibre-gl';
import { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as _ from 'underscore';

async function getFeatureCollection(bbox: BoundingBox): Promise<FeatureCollection> {
  assertWasmLoaded();
  
  const relativeInput = "../../../files/test_fixtures/USCounties-compressed.geomedea";
  const input = makeAbsolutePath(relativeInput);

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
    center: [-104, 39],
    zoom: 5,
    maxZoom: 8,
  });

  // Get a rect around the map center
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

  let updateResults = async function() {
    const bbox = getBoundingBox();
    console.log("updating results with bbox", bbox);
    const featureCollection = await getFeatureCollection(bbox);
    const countiesSource = (map.getSource("counties") as GeoJSONSource)!;
    countiesSource.setData(featureCollection);
  };

  map.on("load", () => {
    // Add empty counties source
    map.addSource("counties", {
      type: "geojson",
      data: {type: "FeatureCollection", features: []},
    });
    
    // Add counties layers
    map.addLayer({
      id: "counties-fill",
      type: "fill",
      source: "counties",
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
      id: "counties-line",
      type: "line",
      source: "counties",
      paint: {
        "line-color": "#0000FF",
        "line-opacity": 0.9,
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
      type: "fill",
      source: "rectangle",
      paint: {
        "fill-color": "#FFFF00",
        "fill-opacity": 0.7,
      },
    });

    // Handle click events
    map.on("click", "counties-fill", (e: any) => {
      const props = e.features[0].properties;
      const html = `<h1>${props.NAME} ${props.LSAD}, ${props.STATE}</h1>`;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map);
    });

    // Handle hover events
    let hoveredStateId: number | null = null;
    
    map.on("mousemove", "counties-fill", (e: any) => {
      if (e.features.length > 0) {
        if (hoveredStateId !== null) {
          map.setFeatureState(
            { source: "counties", id: hoveredStateId },
            { hover: false }
          );
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState(
          { source: "counties", id: hoveredStateId! },
          { hover: true }
        );
      }
    });
    
    map.on("mouseenter", "counties-fill", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    
    map.on("mouseleave", "counties-fill", () => {
      map.getCanvas().style.cursor = "";
      if (hoveredStateId !== null) {
        map.setFeatureState(
          { source: "counties", id: hoveredStateId },
          { hover: false }
        );
      }
      hoveredStateId = null;
    });

    // Throttle updates to max once per second
    updateResults = _.throttle(updateResults, 1000);

    // Show rectangle for bounding box
    (map.getSource("rectangle") as GeoJSONSource)!.setData(getRect(getBoundingBox()));

    // Initial update
    updateResults();

    // Update on map move
    map.on("moveend", () => {
      (map.getSource("rectangle") as GeoJSONSource)!.setData(getRect(getBoundingBox()));
      updateResults();
    });
  });
});
