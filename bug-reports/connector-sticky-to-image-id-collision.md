# Connector cannot attach from sticky to image (ID collision)

## Root cause
- `board.getBoardItem(id)` preferred stickies over images when resolving an item by ID.
- Connector renderer resolved endpoints using only the raw ID via `getBoardItem`, losing the endpoint type (sticky vs image).
- If a sticky and an image shared the same ID (e.g., `"1"`), the destination would resolve to the sticky even when the connector endpoint was meant for the image.

## Fix
- In `scripts/board-items/connector.js`, resolve endpoint items by their explicit type:
  - Use `board.getStickySafe(id)` when `connector.originId`/`destinationId` is present.
  - Use `board.getImageSafe(id)` when `connector.originImageId`/`destinationImageId` is present.
- This avoids ambiguity and prevents collisions between sticky and image IDs.

## Files, functions, and snippets
- File: `scripts/board-items/connector.js`
  - Function: `createRenderer` → `renderConnector`
  - Change: Replace unified `getBoardItem` calls with type-aware resolution.

```24:35:scripts/board-items/connector.js
    if (connectorElement) {
      // Ensure connector has a color
      board.ensureConnectorHasColor(connectorId);
      
      // Resolve endpoints respecting type to avoid ID collisions
      const originItem = connector.originId
        ? board.getStickySafe(connector.originId)
        : connector.originImageId
          ? board.getImageSafe(connector.originImageId)
          : null;
      const destItem = connector.destinationId
        ? board.getStickySafe(connector.destinationId)
        : connector.destinationImageId
          ? board.getImageSafe(connector.destinationImageId)
          : null;
```

## Tests inspired by this bug
- Connector endpoint resolution for images when a sticky shares the same ID.
- Mixed endpoints: sticky → image and image → sticky.
- Rendering correctness: connectors should target the intended item centers.

## Additional notes
- `board.getBoardItem(id)` remains available for generic usage but should not be used when endpoint type is known.

