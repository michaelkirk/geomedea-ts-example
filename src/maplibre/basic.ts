import { HttpReader } from 'geomedea/geomedea.js';
import { FeatureCollection } from '../types';
import { initGeomedea, assertWasmLoaded, makeAbsolutePath, addIdsToFeatures } from '../utils';

// Import maplibregl type without importing the library (already loaded in HTML)
declare const maplibregl: any;

async function getFeatureCollection(): Promise<FeatureCollection> {
  assertWasmLoaded();
  
  const relativeInput = "/../files/test_fixtures/USCounties-compressed.geomedea";
  const input = makeAbsolutePath(relativeInput);

  const httpReader = new HttpReader(input);
  const featureCollectionString = await httpReader.select_all();
  const featureCollection = JSON.parse(featureCollectionString) as FeatureCollection;
  
  return addIdsToFeatures(featureCollection);
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize the WASM module
  await initGeomedea();
  
  // Create MapLibre map
  const map = new maplibregl.Map({
    container: "map",
    style: "https://demotiles.maplibre.org/style.json",
    center: [-98, 39],
    zoom: 3,
    maxZoom: 8,
  });

  map.on("load", async () => {
    const featureCollection = await getFeatureCollection();
    
    map.addSource("counties", {
      type: "geojson",
      data: featureCollection,
    });
    
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
          { source: "counties", id: hoveredStateId },
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
  });
});