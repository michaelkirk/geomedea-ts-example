import { FeatureCollection, Feature } from 'geojson';
import initWasm, { HttpReader } from 'geomedea/geomedea.js';

// Initialize WASM
let wasmLoaded = false;
export async function initGeomedea(): Promise<void> {
  if (!wasmLoaded) {
    await initWasm();
    wasmLoaded = true;
  }
}

// Helper to ensure WASM is loaded
export function assertWasmLoaded(): void {
  if (!wasmLoaded) {
    throw new Error('WASM module not initialized. Call initGeomedea() first.');
  }
}

// Make absolute path from relative path
export function makeAbsolutePath(relativePath: string): string {
  const siteOrigin = window.location.href;
  const absolute = siteOrigin + relativePath;
  return new URL(absolute).toString();
}

// Add sequential IDs to features
export function addIdsToFeatures(featureCollection: FeatureCollection): FeatureCollection {
  let i = 1;
  for (const feature of featureCollection.features) {
    i += 1;
    feature.id = i;
  }
  return featureCollection;
}