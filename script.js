const HEIGHTMAP_SIZE = 512;
const statusEl = document.getElementById('status');
const metadataPreview = document.getElementById('metadataPreview');
const previewSection = document.getElementById('previewSection');
const previewCanvas = document.getElementById('previewCanvas');
const downloadBtn = document.getElementById('downloadBtn');
const metadataBtn = document.getElementById('metadataBtn');

let map;
let drawnItems;
let selectedBounds = null;
let currentMetadata = {};
let currentHeightmapUrl = '';

function initMap() {
  map = L.map('map').setView([48.137, 11.575], 10);

  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap-Mitwirkende',
    maxZoom: 19,
  });

  const googleLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 19,
    attribution: 'Google',
  });

  const baseLayers = {
    OpenStreetMap: osmLayer,
    'Google Maps (Satellit)': googleLayer,
  };

  osmLayer.addTo(map);
  L.control.layers(baseLayers).addTo(map);

  drawnItems = new L.FeatureGroup();
  map.addLayer(drawnItems);

  const drawControl = new L.Control.Draw({
    position: 'topright',
    draw: {
      polygon: false,
      polyline: false,
      circle: false,
      circlemarker: false,
      marker: false,
      rectangle: {
        shapeOptions: {
          color: '#38bdf8',
          weight: 2,
        },
      },
    },
    edit: {
      featureGroup: drawnItems,
      edit: true,
      remove: true,
    },
  });

  map.addControl(drawControl);

  map.on(L.Draw.Event.CREATED, (e) => {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    selectedBounds = e.layer.getBounds();
    updateStatus();
  });

  map.on(L.Draw.Event.EDITED, (e) => {
    const layer = Object.values(e.layers._layers)[0];
    selectedBounds = layer ? layer.getBounds() : null;
    updateStatus();
  });

  map.on(L.Draw.Event.DELETED, () => {
    selectedBounds = null;
    updateStatus();
  });

  document.getElementById('layerSelect').addEventListener('change', (event) => {
    const value = event.target.value;
    if (value === 'google') {
      googleLayer.addTo(map);
      map.removeLayer(osmLayer);
    } else {
      osmLayer.addTo(map);
      map.removeLayer(googleLayer);
    }
  });
}

function updateStatus() {
  if (!selectedBounds) {
    statusEl.textContent = 'Kein Bereich ausgewählt.';
    downloadBtn.disabled = true;
    metadataBtn.disabled = true;
    previewSection.hidden = true;
    return;
  }

  const sizeKm = boundsToKm(selectedBounds);
  statusEl.textContent = `Bereit: ${sizeKm.toFixed(2)} km × ${sizeKm.toFixed(2)} km ausgewählt.`;
}

function boundsToKm(bounds) {
  const latDiff = bounds.getNorth() - bounds.getSouth();
  const lngDiff = bounds.getEast() - bounds.getWest();
  // Näherung: 1 Längengrad ≈ 111 km, Skala für Breite berücksichtigen
  const kmLat = latDiff * 111;
  const kmLng = lngDiff * 111 * Math.cos((bounds.getNorth() + bounds.getSouth()) / 2 * (Math.PI / 180));
  return Math.max(kmLat, kmLng);
}

function seededNoise(x, y) {
  // Einfache deterministische Rauschfunktion, abgeleitet von Taylor-Sinusoiden
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function generateHeightmap(bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = HEIGHTMAP_SIZE;
  canvas.height = HEIGHTMAP_SIZE;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(HEIGHTMAP_SIZE, HEIGHTMAP_SIZE);

  const north = bounds.getNorth();
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const east = bounds.getEast();

  let min = 1;
  let max = 0;

  for (let y = 0; y < HEIGHTMAP_SIZE; y++) {
    const lat = north - (y / HEIGHTMAP_SIZE) * (north - south);
    for (let x = 0; x < HEIGHTMAP_SIZE; x++) {
      const lng = west + (x / HEIGHTMAP_SIZE) * (east - west);
      const elevation = proceduralElevation(lat, lng);
      min = Math.min(min, elevation);
      max = Math.max(max, elevation);

      const color = Math.round(elevation * 255);
      const idx = (y * HEIGHTMAP_SIZE + x) * 4;
      imageData.data[idx] = color;
      imageData.data[idx + 1] = color;
      imageData.data[idx + 2] = color;
      imageData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return { canvas, min, max };
}

function proceduralElevation(lat, lng) {
  // Kombiniert mehrere Frequenzen, um Hügel/Flüsse anzudeuten
  const base = seededNoise(lat * 0.1, lng * 0.1);
  const medium = seededNoise(lat * 0.5, lng * 0.5) * 0.35;
  const fine = seededNoise(lat * 2.0, lng * 2.0) * 0.1;
  const gradient = (Math.sin((lat + lng) * 0.05) + 1) * 0.1;
  let elevation = base * 0.55 + medium + fine + gradient;
  return Math.min(1, Math.max(0, elevation));
}

function convertToHeightmap() {
  if (!selectedBounds) {
    statusEl.textContent = 'Bitte zuerst ein Rechteck auf der Karte markieren.';
    return;
  }

  statusEl.textContent = 'Erzeuge Heightmap …';
  const { canvas, min, max } = generateHeightmap(selectedBounds);
  const dataUrl = canvas.toDataURL('image/png');
  currentHeightmapUrl = dataUrl;

  previewSection.hidden = false;
  const previewCtx = previewCanvas.getContext('2d');
  previewCtx.clearRect(0, 0, HEIGHTMAP_SIZE, HEIGHTMAP_SIZE);
  previewCtx.drawImage(canvas, 0, 0);

  currentMetadata = buildMetadata(selectedBounds, min, max);
  metadataPreview.textContent = JSON.stringify(currentMetadata, null, 2);
  statusEl.textContent = 'Heightmap erstellt. Du kannst PNG und Metadaten speichern.';
  downloadBtn.disabled = false;
  metadataBtn.disabled = false;
}

function buildMetadata(bounds, min, max) {
  const center = bounds.getCenter();
  const sizeKm = boundsToKm(bounds);
  return {
    center: { lat: center.lat, lng: center.lng },
    bounds: {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    },
    estimatedSizeKm: sizeKm,
    heightmap: {
      resolution: `${HEIGHTMAP_SIZE}x${HEIGHTMAP_SIZE}`,
      minValue: min.toFixed(3),
      maxValue: max.toFixed(3),
    },
    instructions: [
      'PNG als 8-Bit-Graustufen speichern und in Cities: Skylines als Heightmap importieren.',
      'Die Metadaten helfen, die Kartenmitte und Skalierung im Map-Editor nachzustellen.',
    ],
  };
}

function downloadPng() {
  if (!currentHeightmapUrl) return;
  const link = document.createElement('a');
  link.href = currentHeightmapUrl;
  link.download = 'cities-skylines-heightmap.png';
  link.click();
}

function downloadMetadata() {
  if (!currentMetadata || !selectedBounds) return;
  const blob = new Blob([JSON.stringify(currentMetadata, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cities-skylines-metadata.json';
  link.click();
  URL.revokeObjectURL(url);
}

initMap();

document.getElementById('convertBtn').addEventListener('click', convertToHeightmap);
downloadBtn.addEventListener('click', downloadPng);
metadataBtn.addEventListener('click', downloadMetadata);
