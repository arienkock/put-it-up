import { createConnectorDOM } from "./connector-dom.js";
import { setConnectorStyles } from "./connector-styling.js";
import { reorderBoardElements } from "./z-order-manager.js";

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
      let originItem = null;
      if (connector.originId) {
        try {
          originItem = board.getBoardItemByType('sticky', connector.originId);
        } catch (e) {
          // Item not found
        }
      } else if (connector.originImageId) {
        try {
          originItem = board.getBoardItemByType('image', connector.originImageId);
        } catch (e) {
          // Item not found
        }
      }
      
      let destItem = null;
      if (connector.destinationId) {
        try {
          destItem = board.getBoardItemByType('sticky', connector.destinationId);
        } catch (e) {
          // Item not found
        }
      } else if (connector.destinationImageId) {
        try {
          destItem = board.getBoardItemByType('image', connector.destinationImageId);
        } catch (e) {
          // Item not found
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
