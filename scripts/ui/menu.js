import { changeZoomLevel } from "./zoom.js";
import { changeColor, stickyColorPalette, connectorColorPalette } from "./color-management.js";
import { deleteSelectedItems } from "./keyboard-handlers.js";
import { ARROW_HEAD_TYPES } from "../board-items/connector-styling.js";

/**
 * Changes arrow head type to the next one in rotation
 * @param {string} currentArrowHead - Current arrow head type
 * @param {boolean} reverse - Whether to go backwards in the list
 * @returns {string} Next arrow head type
 */
function changeArrowHead(currentArrowHead, reverse = false) {
  const currentIndex = ARROW_HEAD_TYPES.indexOf(currentArrowHead);
  const nextIndex = reverse
    ? (currentIndex - 1 + ARROW_HEAD_TYPES.length) % ARROW_HEAD_TYPES.length
    : (currentIndex + 1) % ARROW_HEAD_TYPES.length;
  return ARROW_HEAD_TYPES[nextIndex];
}

/**
 * Creates and manages the board action menu
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies
 * @param {Object} selectedConnectors - Selection management object for connectors
 * @param {Object} selectedImages - Selection management object for images
 * @param {HTMLElement} root - Root element to attach menu to
 * @param {Object} appState - Application state object
 * @param {Function} renderCallback - Callback to trigger re-rendering
 * @returns {Object} Object with menuElement and render function
 */
export function createMenu(board, selectedStickies, selectedConnectors, selectedImages, root, appState, renderCallback) {
  let menuElement;

  const alwaysRelevantItems = [
    {
      itemLabel: "Whiteboard",
      className: "menu-title",
      itemClickHandler: null,
      isTitle: true,
    },
    {
      itemLabel: "New Sticky",
      className: "new-sticky",
      icon: "images/new-sticky-icon.svg",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesNewSticky = true;
        appState.ui.nextClickCreatesConnector = false;
        appState.ui.connectorOriginId = null;
        renderCallback();
      },
    },
    {
      itemLabel: "Connector",
      className: "new-connector",
      icon: "images/new-connector-icon.svg",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesConnector = true;
        appState.ui.nextClickCreatesNewSticky = false;
        appState.ui.connectorOriginId = null;
        renderCallback();
      },
    },
    {
      itemLabel: "Zoom",
      className: "change-zoom",
      icon: "images/zoom-in-icon.svg",
      itemClickHandler: (event) => {
        const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
        appState.ui.boardScale = newScale;
        renderCallback();
      },
      customLabel: (dom, label) => {
        if (!appState.ui.boardScale) {
          dom.innerHTML = `<img src="images/zoom-in-icon.svg" alt="${label}" class="menu-icon"> ${label}`;
        } else {
          dom.innerHTML = `<img src="images/zoom-in-icon.svg" alt="${label}" class="menu-icon"> ${(appState.ui.boardScale * 100).toFixed(0)}%`;
        }
      },
    },
  ];

  const selectionDependentItems = [
    {
      itemLabel: "Color",
      className: "change-color",
      itemClickHandler: (event) => {
        // Determine which current color to use based on selection
        const hasStickiesSelected = selectedStickies.hasItems();
        const hasConnectorsSelected = selectedConnectors.hasItems();
        
        let currentColorToUse;
        if (hasStickiesSelected && !hasConnectorsSelected) {
          currentColorToUse = appState.ui.currentStickyColor;
        } else if (hasConnectorsSelected && !hasStickiesSelected) {
          currentColorToUse = appState.ui.currentConnectorColor;
        } else if (hasStickiesSelected && hasConnectorsSelected) {
          // Both selected - use sticky color as primary
          currentColorToUse = appState.ui.currentStickyColor;
        } else {
          // Nothing selected - use sticky color as default
          currentColorToUse = appState.ui.currentStickyColor;
        }
        
        const newColor = changeColor(
          board,
          selectedStickies,
          selectedConnectors,
          currentColorToUse,
          event.shiftKey
        );
        
        // Update the appropriate current color based on what's selected
        if (hasStickiesSelected && !hasConnectorsSelected) {
          appState.ui.currentStickyColor = newColor;
        } else if (hasConnectorsSelected && !hasStickiesSelected) {
          appState.ui.currentConnectorColor = newColor;
        } else if (hasStickiesSelected && hasConnectorsSelected) {
          // Both selected - update both colors
          appState.ui.currentStickyColor = newColor;
          appState.ui.currentConnectorColor = newColor;
        } else {
          // Nothing selected - update both colors
          appState.ui.currentStickyColor = newColor;
          appState.ui.currentConnectorColor = newColor;
        }
        
        // Legacy compatibility
        appState.ui.currentColor = newColor;
        
        renderMenu();
      },
      customLabel: (dom, label) => {
        // Determine which palette is active based on selection
        const hasStickiesSelected = selectedStickies.hasItems();
        const hasConnectorsSelected = selectedConnectors.hasItems();
        const isConnectorPalette = hasConnectorsSelected && !hasStickiesSelected;
        
        const palette = isConnectorPalette ? connectorColorPalette : stickyColorPalette;
        
        // Show the appropriate current color based on selection
        let currentColorToShow;
        if (hasStickiesSelected && !hasConnectorsSelected) {
          currentColorToShow = appState.ui.currentStickyColor;
        } else if (hasConnectorsSelected && !hasStickiesSelected) {
          currentColorToShow = appState.ui.currentConnectorColor;
        } else if (hasStickiesSelected && hasConnectorsSelected) {
          // Both selected - show sticky color as primary
          currentColorToShow = appState.ui.currentStickyColor;
        } else {
          // Nothing selected - show sticky color as default
          currentColorToShow = appState.ui.currentStickyColor;
        }
        
        dom.innerHTML = `${label}<div class="color-preview"></div>`;
        dom.lastChild.style.backgroundColor = currentColorToShow;
      },
    },
    {
      itemLabel: "Arrow head",
      className: "change-arrow-head",
      itemClickHandler: (event) => {
        const newArrowHead = changeArrowHead(
          appState.ui.currentArrowHead,
          event.shiftKey
        );
        appState.ui.currentArrowHead = newArrowHead;
        // Update selected connectors
        selectedConnectors.forEach((id) => {
          board.updateArrowHead(id, newArrowHead);
        });
        renderMenu();
      },
      customLabel: (dom, label) => {
        // Get the appropriate icon for the current arrow head type
        const arrowHeadIcons = {
          "none": "images/arrow-none-icon.svg",
          "line": "images/arrow-line-icon.svg", 
          "hollow": "images/arrow-hollow-icon.svg",
          "filled": "images/arrow-filled-icon.svg"
        };
        const currentIcon = arrowHeadIcons[appState.ui.currentArrowHead];
        dom.innerHTML = `<img src="${currentIcon}" alt="${label}" class="menu-icon-only">`;
      },
    },
    {
      itemLabel: "Delete",
      className: "delete",
      icon: "images/delete-icon.svg",
      itemClickHandler: () => {
        deleteSelectedItems(board, selectedStickies, selectedConnectors, selectedImages);
      },
    },
  ];

  /**
   * Renders a single menu button/item
   */
  function renderMenuButton(item) {
    let itemElement;
    
    if (item.isTitle) {
      itemElement = document.createElement("div");
      itemElement.classList.add(item.className);
      itemElement.textContent = item.itemLabel;
    } else if (item.isSeparator) {
      itemElement = document.createElement("div");
      itemElement.classList.add(item.className);
    } else {
      itemElement = document.createElement("button");
      itemElement.onclick = (event) => {
        if (item.itemClickHandler && !itemElement.disabled) {
          item.itemClickHandler(event);
        }
      };
      itemElement.classList.add(item.className);
      
      // Add icon if present
      if (item.icon) {
        if (item.icon.endsWith('.svg')) {
          // Handle SVG icons
          itemElement.innerHTML = `<img src="${item.icon}" alt="${item.itemLabel}" class="menu-icon"> ${item.itemLabel}`;
        } else {
          // Handle emoji/text icons
          itemElement.innerHTML = `${item.icon} ${item.itemLabel}`;
        }
      }
    }
    
    item.dom = itemElement;
    return itemElement;
  }

  /**
   * Syncs the current color and arrow head with selected items
   */
  function syncSelectorsWithSelection() {
    // Sync sticky color with selected sticky
    if (selectedStickies.hasItems() && selectedStickies.size() === 1) {
      let selectedStickyId;
      selectedStickies.forEach((id) => (selectedStickyId = id));
      const sticky = board.getStickySafe(selectedStickyId);
      if (sticky && sticky.color) {
        appState.ui.currentStickyColor = sticky.color;
        appState.ui.currentColor = sticky.color; // Legacy compatibility
      }
    }
    
    // Sync connector color with selected connector
    if (selectedConnectors.hasItems() && selectedConnectors.size() === 1) {
      let selectedConnectorId;
      selectedConnectors.forEach((id) => (selectedConnectorId = id));
      const connector = board.getConnectorSafe(selectedConnectorId);
      if (connector && connector.color) {
        appState.ui.currentConnectorColor = connector.color;
        appState.ui.currentColor = connector.color; // Legacy compatibility
      }
    }
    
    // Sync arrow head selector with selected connector
    if (selectedConnectors.hasItems() && selectedConnectors.size() === 1) {
      let selectedConnectorId;
      selectedConnectors.forEach((id) => (selectedConnectorId = id));
      const connector = board.getConnectorSafe(selectedConnectorId);
      if (connector && connector.arrowHead) {
        appState.ui.currentArrowHead = connector.arrowHead;
      }
    }
  }

  /**
   * Renders the menu element
   */
  function renderMenu() {
    // Sync selectors with current selection before rendering
    syncSelectorsWithSelection();
    
    if (!menuElement) {
      // Create container wrapper
      const menuContainer = document.createElement("div");
      menuContainer.classList.add("menu-container");
      
      // Create menu element
      menuElement = document.createElement("div");
      menuElement.classList.add("board-action-menu");
      
      // Add menu to container and container to root
      menuContainer.appendChild(menuElement);
      root.insertAdjacentElement("afterbegin", menuContainer);

      // Handle viewport zoom to keep menu visible and at constant size
      if (window.visualViewport) {
        let debounceTimeout;
        let isAnimating = false;
        
        function updateMenuForViewportZoom() {
          const viewport = window.visualViewport;
          const scale = viewport.scale;
          
          // Counter-scale to keep menu at constant visual size
          menuElement.style.transform = `scale(${1 / scale})`;
          menuElement.style.transformOrigin = 'top left';
          
          // Position container to follow viewport
          menuContainer.style.left = `${viewport.offsetLeft}px`;
          menuContainer.style.top = `${viewport.offsetTop}px`;
        }
        
        function updateMenuForViewportScroll() {
          // For scroll events, update immediately without animation
          const viewport = window.visualViewport;
          const scale = viewport.scale;
          
          // Temporarily disable transitions for immediate positioning
          menuElement.style.transition = 'none';
          
          // Counter-scale to keep menu at constant visual size
          menuElement.style.transform = `scale(${1 / scale})`;
          menuElement.style.transformOrigin = 'top left';
          
          // Position container to follow viewport
          menuContainer.style.left = `${viewport.offsetLeft}px`;
          menuContainer.style.top = `${viewport.offsetTop}px`;
          
          // Re-enable transitions after a brief delay
          requestAnimationFrame(() => {
            menuElement.style.transition = '';
          });
        }
        
        function debouncedUpdateMenuForViewportZoom() {
          // Clear any existing timeout
          if (debounceTimeout) {
            clearTimeout(debounceTimeout);
          }
          
          // Set a new timeout for smooth animation
          debounceTimeout = setTimeout(() => {
            isAnimating = true;
            updateMenuForViewportZoom();
            // Reset animation flag after transition completes
            setTimeout(() => {
              isAnimating = false;
            }, 300); // Match CSS transition duration
          }, 200);
        }
        
        // Handle resize events with debounced animation (for zoom changes)
        window.visualViewport.addEventListener('resize', debouncedUpdateMenuForViewportZoom);
        
        // Handle scroll events with immediate positioning (like fixed positioning)
        window.visualViewport.addEventListener('scroll', updateMenuForViewportScroll);
        
        updateMenuForViewportZoom(); // Initial call (no debounce for initial setup)
      }
    }

    // Clear existing items
    menuElement.innerHTML = '';
    
    // Always render always-relevant items
    alwaysRelevantItems.forEach((item) => {
      menuElement.appendChild(renderMenuButton(item));
    });
    
    // Add separator
    const separator = document.createElement('div');
    separator.classList.add('menu-separator');
    menuElement.appendChild(separator);
    
    // Conditionally render selection-dependent items
    const hasStickiesSelected = selectedStickies.hasItems();
    const hasConnectorsSelected = selectedConnectors.hasItems();
    const hasAnySelection = hasStickiesSelected || hasConnectorsSelected;
    
    if (hasAnySelection) {
      // Show Color button only when a single type is selected (not mixed)
      if (!(hasStickiesSelected && hasConnectorsSelected)) {
        const colorItem = selectionDependentItems.find(item => item.className === "change-color");
        if (colorItem) menuElement.appendChild(renderMenuButton(colorItem));
      }
      
      // Show Arrow head only when connectors are selected
      if (hasConnectorsSelected) {
        const arrowHeadItem = selectionDependentItems.find(item => item.className === "change-arrow-head");
        if (arrowHeadItem) menuElement.appendChild(renderMenuButton(arrowHeadItem));
      }
      
      // Show Delete button when items are selected
      const deleteItem = selectionDependentItems.find(item => item.className === "delete");
      if (deleteItem) menuElement.appendChild(renderMenuButton(deleteItem));
    }

    // Update custom labels for all rendered items
    const allItems = [...alwaysRelevantItems];
    
    // Add the items that were actually rendered
    if (hasAnySelection) {
      // Add color item only if it was rendered (single type selection)
      if (!(hasStickiesSelected && hasConnectorsSelected)) {
        const colorItem = selectionDependentItems.find(item => item.className === "change-color");
        if (colorItem) allItems.push(colorItem);
      }
      
      // Add arrowhead item only if it was rendered (when connectors are selected)
      if (hasConnectorsSelected) {
        const arrowHeadItem = selectionDependentItems.find(item => item.className === "change-arrow-head");
        if (arrowHeadItem) allItems.push(arrowHeadItem);
      }
      
      const deleteItem = selectionDependentItems.find(item => item.className === "delete");
      if (deleteItem) allItems.push(deleteItem);
    }
    
    allItems.forEach(({ itemLabel, customLabel, dom, isSeparator, icon }) => {
      if (itemLabel && !isSeparator) {
        if (customLabel) {
          customLabel(dom, itemLabel);
        } else if (!icon) {
          // Only set textContent if there's no icon (to avoid overwriting icon HTML)
          dom.textContent = itemLabel;
        }
        // If there's an icon, the innerHTML was already set in renderMenuButton
      }
    });
  }

  return {
    menuElement,
    render: renderMenu,
  };
}
