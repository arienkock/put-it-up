import { createConnectorDOM } from "./connector-dom.js";
import { setConnectorStyles } from "./connector-styling.js";
import { reorderBoardElements } from "./z-order-manager.js";
import { getAllPlugins } from "./plugin-registry.js";

export const CONNECTOR_TYPE = "application/connector";
export const DEFAULT_ARROW_HEAD = "filled";

export const createRenderer = (
  board,
  domElement,
  getSelectedConnectors
) =>
  function renderConnector(connectorId, connector) {
    const selectedConnectors = getSelectedConnectors();
    const shouldDelete = connector === undefined;
    const connectorElement = getConnectorElement(
      domElement,
      connectorId,
      board,
      selectedConnectors,
      shouldDelete
    );
    
    if (connectorElement) {
      // Ensure connector has a color
      board.ensureConnectorHasColor(connectorId);
      
      // Resolve endpoints respecting type to avoid ID collisions
      // TODO: This is a leak - connector system should use generic connection properties
      const plugins = getAllPlugins();
      let originItem = null;
      if (connector.originId) {
        // Try to find which plugin type this ID belongs to
        for (const plugin of plugins) {
          const type = plugin.getType();
          try {
            originItem = board.getBoardItemByType(type, connector.originId);
            if (originItem) break;
          } catch (e) {
            // Item not found for this type, try next
          }
        }
      } else if (connector.originImageId) {
        const imagePlugin = plugins.find(p => p.getType() === 'image');
        if (imagePlugin) {
          try {
            originItem = board.getBoardItemByType('image', connector.originImageId);
          } catch (e) {
            // Item not found
          }
        }
      }
      
      let destItem = null;
      if (connector.destinationId) {
        // Try to find which plugin type this ID belongs to
        for (const plugin of plugins) {
          const type = plugin.getType();
          try {
            destItem = board.getBoardItemByType(type, connector.destinationId);
            if (destItem) break;
          } catch (e) {
            // Item not found for this type, try next
          }
        }
      } else if (connector.destinationImageId) {
        const imagePlugin = plugins.find(p => p.getType() === 'image');
        if (imagePlugin) {
          try {
            destItem = board.getBoardItemByType('image', connector.destinationImageId);
          } catch (e) {
            // Item not found
          }
        }
      }
      
      // Skip rendering if both endpoints are unconnected and have no points
      if (!originItem && !destItem && !connector.originPoint && !connector.destinationPoint) {
        return;
      }
      
      const connectorIsSelected = !!selectedConnectors.isSelected(connectorId);
      setConnectorStyles(
        connector,
        connectorElement,
        originItem,
        destItem,
        connectorIsSelected,
        board.getOrigin(),
        board.getStickyBaseSize(),
        connectorId
      );
    }
  };

function getConnectorElement(
  boardElement,
  id,
  board,
  selectedConnectors,
  shouldDelete = false
) {
  const connectorIdClass = "connector-" + id;
  let container = boardElement[connectorIdClass];
  
  if (shouldDelete) {
    delete boardElement[connectorIdClass];
    if (container) {
      boardElement.removeChild(container);
    }
    container = undefined;
    // Reorder elements after deletion
    reorderBoardElements(boardElement);
  } else if (!container) {
    container = createConnectorDOM(connectorIdClass, id, selectedConnectors);
    boardElement[connectorIdClass] = container;
    boardElement.appendChild(container);
    // Reorder elements after addition
    reorderBoardElements(boardElement);
  }
  
  return container;
}
