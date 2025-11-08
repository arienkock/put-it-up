import { changeZoomLevel } from "./zoom.js";
import { changeColor, stickyColorPalette, connectorColorPalette } from "./color-management.js";
import { deleteSelectedItems } from "./keyboard-handlers.js";
import { ARROW_HEAD_TYPES } from "../board-items/connector-styling.js";
import { getAllPlugins } from "../board-items/plugin-registry.js";

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
 * @param {Object} store - Datastore instance for updating board title
 * @returns {Object} Object with menuElement and render function
 */
export function createMenu(board, selectedStickies, selectedConnectors, selectedImages, root, appState, renderCallback, store) {
  let menuElement;
  let menuContainer;
  let logoElement;
  let titleElement;
  let lastValidTitle = '';
  let layerSubMenuOpen = false;
  let layerGroupButton = null;
  let layerSubMenuContainer = null;
  let clickOutsideHandler = null;

  // Get menu items from plugins
  const plugins = getAllPlugins();
  const pluginMenuItems = [];
  plugins.forEach(plugin => {
    const items = plugin.getMenuItems();
    items.forEach(item => {
      // Wrap the handler to pass appState and renderCallback
      const originalHandler = item.itemClickHandler;
      item.itemClickHandler = (event) => {
        originalHandler(appState, renderCallback, event);
      };
      pluginMenuItems.push(item);
    });
  });

  // Helper function to collect selected items from all plugins
  function collectSelectedItems(selectionMap) {
    const itemsToMove = [];
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const selectionType = plugin.getSelectionType();
      const selection = selectionMap[selectionType] || selectionMap[type];
      if (selection && selection.hasItems) {
        selection.forEach((id) => {
          itemsToMove.push({ type, id });
        });
      }
    });
    // Add connectors (not a plugin)
    if (selectedConnectors && selectedConnectors.hasItems) {
      selectedConnectors.forEach((id) => {
        itemsToMove.push({ type: 'connector', id });
      });
    }
    return itemsToMove;
  }
  
  // Build selection map for easy access
  const selectionMap = {
    'stickies': selectedStickies,
    'images': selectedImages,
    'connectors': selectedConnectors,
    'sticky': selectedStickies,
    'image': selectedImages,
    'connector': selectedConnectors
  };

  const alwaysRelevantItems = [
    ...pluginMenuItems,
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
          dom.innerHTML = `<img src="images/zoom-in-icon.svg" alt="${label}" class="menu-icon">`;
        } else {
          dom.innerHTML = `<img src="images/zoom-in-icon.svg" alt="${label}" class="menu-icon"> ${(appState.ui.boardScale * 100).toFixed(0)}%`;
        }
        dom.title = label;
      },
    },
  ];

  const selectionDependentItems = [
    {
      itemLabel: "Color",
      className: "change-color",
      itemClickHandler: (event) => {
        // Check which plugin types have selections with colors
        const pluginsWithColorSelections = [];
        plugins.forEach(plugin => {
          const type = plugin.getType();
          const palette = plugin.getColorPalette();
          if (palette && palette.length > 0) {
            const selectionType = plugin.getSelectionType();
            const selection = selectionMap[selectionType] || selectionMap[type];
            if (selection && selection.hasItems && selection.hasItems()) {
              pluginsWithColorSelections.push({ plugin, type, selection });
            }
          }
        });
        
        const hasConnectorsSelected = selectedConnectors && selectedConnectors.hasItems();
        
        // Determine which current color to use based on selection
        let currentColorToUse;
        if (pluginsWithColorSelections.length > 0 && !hasConnectorsSelected) {
          // Use first plugin's color
          const firstPlugin = pluginsWithColorSelections[0];
          const colorKey = `current${firstPlugin.type.charAt(0).toUpperCase() + firstPlugin.type.slice(1)}Color`;
          currentColorToUse = appState.ui[colorKey] || appState.ui.currentColor;
        } else if (hasConnectorsSelected && pluginsWithColorSelections.length === 0) {
          currentColorToUse = appState.ui.currentConnectorColor;
        } else if (pluginsWithColorSelections.length > 0 && hasConnectorsSelected) {
          // Both selected - use first plugin color as primary
          const firstPlugin = pluginsWithColorSelections[0];
          const colorKey = `current${firstPlugin.type.charAt(0).toUpperCase() + firstPlugin.type.slice(1)}Color`;
          currentColorToUse = appState.ui[colorKey] || appState.ui.currentColor;
        } else {
          // Nothing selected - use first plugin color as default, or legacy currentColor
          const firstPluginWithColor = plugins.find(p => p.getColorPalette()?.length > 0);
          if (firstPluginWithColor) {
            const type = firstPluginWithColor.getType();
            const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
            currentColorToUse = appState.ui[colorKey] || appState.ui.currentColor;
          } else {
            currentColorToUse = appState.ui.currentColor;
          }
        }
        
        // Get selected stickies for backward compatibility with changeColor function
        const selectedStickiesForColor = pluginsWithColorSelections.find(p => p.type === 'sticky')?.selection || null;
        
        const newColor = changeColor(
          board,
          selectedStickiesForColor || (selectedStickies || { hasItems: () => false }),
          selectedConnectors,
          currentColorToUse,
          event.shiftKey
        );
        
        // Update current colors for all selected plugin types
        pluginsWithColorSelections.forEach(({ type }) => {
          const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
          appState.ui[colorKey] = newColor;
        });
        
        // Update connector color if connectors are selected
        if (hasConnectorsSelected) {
          appState.ui.currentConnectorColor = newColor;
        }
        
        // Legacy compatibility
        appState.ui.currentColor = newColor;
        
        renderMenu();
      },
      customLabel: (dom, label) => {
        // Check which plugin types have selections with colors
        const pluginsWithColorSelections = [];
        plugins.forEach(plugin => {
          const type = plugin.getType();
          const palette = plugin.getColorPalette();
          if (palette && palette.length > 0) {
            const selectionType = plugin.getSelectionType();
            const selection = selectionMap[selectionType] || selectionMap[type];
            if (selection && selection.hasItems && selection.hasItems()) {
              pluginsWithColorSelections.push({ plugin, type, selection, palette });
            }
          }
        });
        
        const hasConnectorsSelected = selectedConnectors && selectedConnectors.hasItems();
        
        // Determine which palette is active based on selection
        let palette = stickyColorPalette; // Default
        if (hasConnectorsSelected && pluginsWithColorSelections.length === 0) {
          palette = connectorColorPalette;
        } else if (pluginsWithColorSelections.length > 0) {
          palette = pluginsWithColorSelections[0].palette;
        }
        
        // Show the appropriate current color based on selection
        let currentColorToShow;
        if (pluginsWithColorSelections.length > 0 && !hasConnectorsSelected) {
          const firstPlugin = pluginsWithColorSelections[0];
          const colorKey = `current${firstPlugin.type.charAt(0).toUpperCase() + firstPlugin.type.slice(1)}Color`;
          currentColorToShow = appState.ui[colorKey] || appState.ui.currentColor;
        } else if (hasConnectorsSelected && pluginsWithColorSelections.length === 0) {
          currentColorToShow = appState.ui.currentConnectorColor;
        } else if (pluginsWithColorSelections.length > 0 && hasConnectorsSelected) {
          const firstPlugin = pluginsWithColorSelections[0];
          const colorKey = `current${firstPlugin.type.charAt(0).toUpperCase() + firstPlugin.type.slice(1)}Color`;
          currentColorToShow = appState.ui[colorKey] || appState.ui.currentColor;
        } else {
          const firstPluginWithColor = plugins.find(p => p.getColorPalette()?.length > 0);
          if (firstPluginWithColor) {
            const type = firstPluginWithColor.getType();
            const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
            currentColorToShow = appState.ui[colorKey] || appState.ui.currentColor;
          } else {
            currentColorToShow = appState.ui.currentColor;
          }
        }
        
        dom.innerHTML = `<img src="images/color-selector-icon.svg" alt="${label}" class="menu-icon"> <div class="color-preview"></div>`;
        dom.lastChild.style.backgroundColor = currentColorToShow;
        dom.title = label;
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
        dom.title = label;
      },
    },
    {
      itemLabel: "Delete",
      className: "delete",
      icon: "images/delete-icon.svg",
      itemClickHandler: () => {
        // Use the standard deleteSelectedItems function which works with Selection objects
        deleteSelectedItems(board, selectedStickies, selectedConnectors, selectedImages);
        
        // Trigger full re-render so DOM reflects deletions
        if (typeof renderCallback === 'function') {
          renderCallback();
        }
      },
    },
  ];

  // Layer sub-menu items (extracted for use in sub-menu)
  const layerSubMenuItems = [
    {
      itemLabel: "Move Up",
      className: "move-up",
      icon: "images/move-up-icon.svg",
      itemClickHandler: () => {
        const itemsToMove = collectSelectedItems(selectionMap);
        if (itemsToMove.length > 0) {
          board.moveSelectedItemsZIndex(itemsToMove, 'up');
          renderCallback();
        }
      },
    },
    {
      itemLabel: "Move Down",
      className: "move-down",
      icon: "images/move-down-icon.svg",
      itemClickHandler: () => {
        const itemsToMove = collectSelectedItems(selectionMap);
        if (itemsToMove.length > 0) {
          board.moveSelectedItemsZIndex(itemsToMove, 'down');
          renderCallback();
        }
      },
    },
    {
      itemLabel: "Move to Top",
      className: "move-to-top",
      icon: "images/move-to-top-icon.svg",
      itemClickHandler: () => {
        const itemsToMove = collectSelectedItems(selectionMap);
        if (itemsToMove.length > 0) {
          board.moveSelectedItemsZIndex(itemsToMove, 'to-top');
          renderCallback();
        }
      },
    },
    {
      itemLabel: "Move to Back",
      className: "move-to-back",
      icon: "images/move-to-back-icon.svg",
      itemClickHandler: () => {
        const itemsToMove = collectSelectedItems(selectionMap);
        if (itemsToMove.length > 0) {
          board.moveSelectedItemsZIndex(itemsToMove, 'to-back');
          renderCallback();
        }
      },
    },
  ];

  // Layer group item (replaces individual z-index items in main menu)
  const layerGroupItem = {
    itemLabel: "Layer",
    className: "layer-group",
    icon: "images/move-to-top-icon.svg",
    itemClickHandler: (event) => {
      event.stopPropagation();
      toggleLayerSubMenu();
    },
  };

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
      
      // Set title attribute from itemLabel
      if (item.itemLabel) {
        itemElement.title = item.itemLabel;
      }
      
      // Add icon if present
      if (item.icon) {
        if (item.icon.endsWith('.svg')) {
          // Handle SVG icons
          itemElement.innerHTML = `<img src="${item.icon}" alt="${item.itemLabel}" class="menu-icon">`;
        } else {
          // Handle emoji/text icons
          itemElement.innerHTML = `${item.icon}`;
        }
      }
    }
    
    item.dom = itemElement;
    return itemElement;
  }

  /**
   * Closes the layer sub-menu
   */
  function closeLayerSubMenu() {
    if (layerGroupButton) {
      layerGroupButton.classList.remove('active');
    }
    if (layerSubMenuContainer) {
      layerSubMenuContainer.style.visibility = 'hidden';
    }
    layerSubMenuOpen = false;
    
    // Remove click outside handler
    if (clickOutsideHandler) {
      document.removeEventListener('click', clickOutsideHandler);
      clickOutsideHandler = null;
    }
  }

  /**
   * Opens the layer sub-menu
   */
  function openLayerSubMenu() {
    if (layerGroupButton) {
      layerGroupButton.classList.add('active');
    }
    if (layerSubMenuContainer) {
      layerSubMenuContainer.style.visibility = 'visible';
    }
    layerSubMenuOpen = true;
    
    // Add click outside handler
    if (!clickOutsideHandler) {
      clickOutsideHandler = (event) => {
        // Check if click is outside the layer group button and sub-menu
        if (layerGroupButton && layerSubMenuContainer) {
          // Use composedPath to check all elements in the click path
          const path = event.composedPath ? event.composedPath() : [event.target];
          const isClickInside = path.some(element => 
            element === layerGroupButton || 
            element === layerSubMenuContainer ||
            layerGroupButton.contains(element) ||
            layerSubMenuContainer.contains(element)
          );
          if (!isClickInside) {
            closeLayerSubMenu();
          }
        }
      };
      // Use setTimeout to avoid immediate closure when opening
      setTimeout(() => {
        document.addEventListener('click', clickOutsideHandler);
      }, 0);
    }
  }

  /**
   * Toggles the layer sub-menu
   */
  function toggleLayerSubMenu() {
    if (layerSubMenuOpen) {
      closeLayerSubMenu();
    } else {
      openLayerSubMenu();
    }
  }

  /**
   * Syncs the current color and arrow head with selected items
   */
  function syncSelectorsWithSelection() {
    // Sync sticky color with selected sticky
    if (selectedStickies.hasItems() && selectedStickies.size() === 1) {
      let selectedStickyId;
      selectedStickies.forEach((id) => (selectedStickyId = id));
      let sticky;
      try {
        sticky = board.getBoardItemByType('sticky', selectedStickyId);
      } catch (e) {
        sticky = null;
      }
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
    // Save sub-menu open state before closing (will restore if still relevant)
    const wasSubMenuOpen = layerSubMenuOpen;
    
    // Close sub-menu if open (will be recreated if needed)
    if (layerSubMenuOpen) {
      closeLayerSubMenu();
    }
    
    // Reset layer group references (will be recreated)
    layerGroupButton = null;
    layerSubMenuContainer = null;
    
    // Sync selectors with current selection before rendering
    syncSelectorsWithSelection();
    
    // Update title from appState if it changed (but don't override user editing)
    if (titleElement && !titleElement.matches(':focus')) {
      const currentTitle = appState.board?.title || store?.boardName || 'Board';
      if (currentTitle !== titleElement.textContent.trim()) {
        titleElement.textContent = currentTitle;
        lastValidTitle = currentTitle;
      }
    }
    
    if (!menuElement) {
      // Create container wrapper
      menuContainer = document.createElement("div");
      menuContainer.classList.add("menu-container");
      
      // Create logo element separately (not part of menu items)
      logoElement = document.createElement("a");
      logoElement.href = "list.html";
      logoElement.classList.add("menu-logo");
      logoElement.style.display = "inline-flex";
      logoElement.style.alignItems = "center";
      logoElement.style.textDecoration = "none";
      logoElement.style.color = "inherit";
      
      // Create SVG logo: sticky note with letter S
      logoElement.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display: block;">
          <!-- Shadow -->
          <rect x="2" y="3" width="28" height="28" rx="2" fill="rgba(0,0,0,0.15)"/>
          <!-- Sticky note body -->
          <rect x="1" y="1" width="28" height="28" rx="2" fill="#ffd700" stroke="#d4af37" stroke-width="0.5"/>
          <!-- Capital letter S -->
          <text x="16" y="20" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="#444">S</text>
        </svg>
      `;
      
      // Create editable board title element
      titleElement = document.createElement("div");
      titleElement.classList.add("board-title");
      titleElement.contentEditable = true;
      titleElement.setAttribute('spellcheck', 'false');
      
      // Set initial title from appState or fallback to boardName
      const initialTitle = appState.board?.title || store?.boardName || 'Board';
      titleElement.textContent = initialTitle;
      lastValidTitle = initialTitle;
      
      // Handle input events - prevent empty titles during typing
      titleElement.addEventListener('input', (event) => {
        const text = titleElement.textContent.trim();
        // Don't do anything if only whitespace - let blur handler deal with it
        if (text.length > 0) {
          lastValidTitle = text;
        }
      });
      
      // Handle keydown - prevent Enter from creating newlines
      titleElement.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          titleElement.blur();
        }
      });
      
      // Handle blur - validate and save title
      titleElement.addEventListener('blur', (event) => {
        const text = titleElement.textContent.trim();
        if (text.length === 0) {
          // Restore last valid title if empty
          titleElement.textContent = lastValidTitle;
        } else {
          // Update last valid title and save to store
          lastValidTitle = text;
          if (store && store.updateBoardTitle) {
            store.updateBoardTitle(text);
          }
        }
      });
      
      // Create separator after title
      const titleSeparator = document.createElement('div');
      titleSeparator.classList.add('menu-separator');
      
      // Create menu element
      menuElement = document.createElement("div");
      menuElement.classList.add("board-action-menu");
      
      // Add logo, title, separator, then menu to container, then container to root
      menuContainer.appendChild(logoElement);
      menuContainer.appendChild(titleElement);
      menuContainer.appendChild(titleSeparator);
      menuContainer.appendChild(menuElement);
      root.insertAdjacentElement("afterbegin", menuContainer);
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
    const hasImagesSelected = selectedImages.hasItems();
    const hasAnySelection = hasStickiesSelected || hasConnectorsSelected || hasImagesSelected;
    
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
      
      // Show layer group button when any items are selected
      const layerGroupWrapper = document.createElement('div');
      layerGroupWrapper.classList.add('group', 'layer-group-wrapper');
      
      // Render the layer group button
      layerGroupButton = renderMenuButton(layerGroupItem);
      layerGroupWrapper.appendChild(layerGroupButton);
      
      // Create sub-menu container
      layerSubMenuContainer = document.createElement('div');
      layerSubMenuContainer.classList.add('group-items', 'layer-submenu');
      layerSubMenuContainer.style.visibility = 'hidden';
      
      // Render sub-menu items
      layerSubMenuItems.forEach((item) => {
        const subMenuItem = renderMenuButton(item);
        // Add stopPropagation to prevent click-outside handler from closing sub-menu
        const originalOnClick = subMenuItem.onclick;
        subMenuItem.onclick = (event) => {
          event.stopPropagation();
          if (originalOnClick) {
            originalOnClick(event);
          }
        };
        layerSubMenuContainer.appendChild(subMenuItem);
      });
      
      layerGroupWrapper.appendChild(layerSubMenuContainer);
      menuElement.appendChild(layerGroupWrapper);
      
      // Restore sub-menu open state if it was open before renderMenu() was called
      if (wasSubMenuOpen) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          openLayerSubMenu();
        }, 0);
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
      
      // Add layer group item
      allItems.push(layerGroupItem);
      
      // Add layer sub-menu items for custom label processing (if needed)
      layerSubMenuItems.forEach(item => allItems.push(item));
      
      const deleteItem = selectionDependentItems.find(item => item.className === "delete");
      if (deleteItem) allItems.push(deleteItem);
    }
    
    allItems.forEach(({ itemLabel, customLabel, dom, isSeparator, icon }) => {
      if (itemLabel && !isSeparator) {
        // Ensure title attribute is set (customLabel may have already set it)
        if (!dom.title) {
          dom.title = itemLabel;
        }
        
        if (customLabel) {
          customLabel(dom, itemLabel);
        }
        // Icons are already set in renderMenuButton, no need to set textContent
        // Labels are now only in title attribute, not visible
      }
    });
  }

  return {
    menuElement,
    render: renderMenu,
  };
}

