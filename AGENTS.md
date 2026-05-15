# AGENTS.md

## Cursor Cloud specific instructions

This is a JavaScript (Vite + D3.js) interactive probability distribution visualizer.

### Running the application

```bash
npm run dev       # Starts Vite dev server on port 5173
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

### Project structure

- `index.html` — Entry point
- `src/main.js` — App bootstrap, sidebar, navigation
- `src/distributions.js` — Math engine: 26 distributions with PDF/PMF/CDF + relationships
- `src/charts.js` — D3.js chart rendering (PDF/CDF)
- `src/graph.js` — D3.js force-directed relationship graph
- `src/styles.css` — Dark theme styling

### Notes

- No linter or test framework is currently configured.
- The `main.py` file in the root is a leftover from the initial repo scaffold and is unrelated.
- Uses D3.js v7 for all visualizations. No other runtime dependencies.
- The site is designed to be embeddable into an existing website (self-contained, no framework).
