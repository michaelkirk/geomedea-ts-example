import { initGeomedea } from './utils';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the WASM module for Geomedea
  await initGeomedea();
  console.log('Geomedea WASM module initialized');
});