# Digital Twin - Frontend Interface

Welcome! This package contains the frontend files for the **Digital Twin for Students** website interface. You can edit the UI, styling, and client-side interactions here.

## Project Structure

- `D Twin .html`: The main HTML interface. It contains the core page layout, structure, and built-in vanilla CSS styles.
- `app.js`: Client-side logic, routing, features, and interactive student tools.
- `ux-engine.js`: Handles advanced UI transitions, interactions, and visual effects.
- `dist/`: Contains pre-built/hashed copies of the JavaScript files for caching.
- `models/`: Asset files and 3D/structural models used by the interface.
- `service-worker.js`: Handles offline caching and performance optimizations.

---

## How to Run Locally

To view and test your edits, you can run the frontend using any of the following methods:

### Method 1: VS Code Live Server (Recommended)
1. Open this folder in **VS Code**.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Click **Go Live** in the bottom-right corner of VS Code to start a development server and auto-refresh on save.

### Method 2: Node.js (npx)
If you have Node.js installed, run this command in your terminal inside this directory:
```bash
npx serve
```
Then open the provided URL (usually `http://localhost:3000` or `http://localhost:5000`).

### Method 3: Python
If you have Python installed, run:
```bash
# Python 3
python -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## Editing the Interface

- **Styles**: All styling is defined in the `<style>` block in the head of `D Twin .html` (Line 15 onwards).
- **Interactions**: Edit `app.js` and `ux-engine.js` to modify client-side features, state, and dashboard interactions.
