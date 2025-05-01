# Geomedea TypeScript Example

This project demonstrates how to use the Geomedea library with TypeScript. Geomedea is an experimental cloud optimized geospatial format. A client can self-serve small slices of even potentially very large data sets using a built-in index and HTTP Range requests.

See [the geomedea repository](https://github.com/michaelkirk/geomedea) for more details.

## Features

- TypeScript implementation for better type safety and development experience
- MapLibre GL integration for interactive map visualization
- Examples of basic feature rendering, spatial filtering, and large dataset handling
- Webpack for bundling and development

## Project Structure

```
├── dist/                 # Build output directory
├── files/                # Data files
│   └── test_fixtures/    # Geomedea test data
├── public/               # Static HTML files
│   ├── maplibre/         # MapLibre example pages
│   └── site.css          # Styles
├── src/                  # TypeScript source code
│   ├── maplibre/         # MapLibre example implementations
│   ├── types.ts          # TypeScript type definitions
│   ├── utils.ts          # Utility functions
│   └── index.ts          # Main entry point
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── webpack.config.js     # Webpack configuration
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This starts the webpack development server at http://localhost:9000.

### Production Build

```bash
npm run build
```

### Running the Production Build

```bash
npm start
```

This starts an HTTP server for the production build at http://localhost:8080.

## Examples

1. **Basic Example**  
   Demonstrates loading a full Geomedea file and rendering it on a map.

2. **Filter By Rect**  
   Shows how to use Geomedea's spatial index to fetch only features within a bounding box.

3. **Large Dataset**  
   Demonstrates the efficiency of Geomedea when working with large spatial datasets.