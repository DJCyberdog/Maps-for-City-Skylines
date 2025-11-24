# Maps für Cities: Skylines

Eine kleine statische Web-App, mit der du einen Kartenausschnitt aus OpenStreetMap oder Google Maps wählen, als Heightmap umwandeln und für den Import in Cities: Skylines exportieren kannst.

## Funktionen
- Auswahl zwischen OpenStreetMap- und Google-Satellitenkarten (Leaflet).
- Rechteckiges Auswahlwerkzeug, um den exakten Kartenausschnitt festzulegen.
- Generiert eine 512×512-Graustufen-Heightmap (prozedural) sowie begleitende Metadaten (Bounds, Center, Maßstab).
- Download-Buttons für PNG-Heightmap und JSON-Metadaten.

## Nutzung
1. Öffne `index.html` in deinem Browser (keine Build-Tools nötig).
2. Wähle die Kartenquelle und zeichne ein Rechteck auf der Karte.
3. Klicke auf **Heightmap erzeugen** und lade anschließend PNG und Metadaten herunter.
4. Importiere die PNG im Cities: Skylines Map-Editor. Nutze die Metadaten, um die Karte zu positionieren und zu skalieren.

> Hinweis: Die Heightmap ist prozedural generiert und dient als Vorlage oder Ausgangspunkt. Für echte Höhendaten kannst du den Generator in `script.js` an einen Elevation-Service deiner Wahl anpassen.
