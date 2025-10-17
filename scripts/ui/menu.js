import { changeZoomLevel } from "./zoom.js";
import { changeColor } from "./color-management.js";
import { createBoardSizeControls } from "./board-size-controls.js";
import { createStickySizeControls } from "./sticky-size-controls.js";
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
 * @param {HTMLElement} root - Root element to attach menu to
 * @param {Object} appState - Application state object
 * @param {Function} renderCallback - Callback to trigger re-rendering
 * @returns {Object} Object with menuElement and render function
 */
export function createMenu(board, selectedStickies, selectedConnectors, root, appState, renderCallback) {
  let menuElement;

  const menuItems = [
    {
      itemLabel: "Whiteboard",
      className: "menu-title",
      itemClickHandler: null,
      isTitle: true,
    },
    {
      itemLabel: "separator",
      className: "menu-separator",
      itemClickHandler: null,
      isSeparator: true,
    },
    {
      itemLabel: "New Sticky",
      className: "new-sticky",
      icon: "📄",
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
      icon: "—",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesConnector = true;
        appState.ui.nextClickCreatesNewSticky = false;
        appState.ui.connectorOriginId = null;
        renderCallback();
      },
    },
    {
      itemLabel: "separator",
      className: "menu-separator",
      itemClickHandler: null,
      isSeparator: true,
    },
    {
      itemLabel: "Color",
      className: "change-color",
      itemClickHandler: (event) => {
        const newColor = changeColor(
          board,
          selectedStickies,
          appState.ui.currentColor,
          event.shiftKey
        );
        appState.ui.currentColor = newColor;
        renderMenu();
      },
      customLabel: (dom, label) => {
        dom.innerHTML = 'text<div class="color-preview"></div>';
        dom.firstChild.textContent = label;
        dom.lastChild.style.backgroundColor = appState.ui.currentColor;
      },
    },
    {
      itemLabel: "Delete",
      className: "delete",
      icon: "🗑️",
      itemClickHandler: () => {
        selectedStickies.forEach((id) => {
          board.deleteSticky(id);
        });
        selectedConnectors.forEach((id) => {
          board.deleteConnector(id);
        });
      },
      customLabel: (dom, label) => {
        const hasSelection = selectedStickies.hasItems() || selectedConnectors.hasItems();
        dom.innerHTML = `🗑️ ${label}`;
        dom.disabled = !hasSelection;
        if (!hasSelection) {
          dom.classList.add('disabled');
        } else {
          dom.classList.remove('disabled');
        }
      },
    },
    {
      itemLabel: "Zoom",
      className: "change-zoom",
      icon: "🔍",
      itemClickHandler: (event) => {
        const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
        appState.ui.boardScale = newScale;
        renderCallback();
      },
      customLabel: (dom, label) => {
        if (!appState.ui.boardScale) {
          dom.textContent = `🔍 ${label}`;
        } else {
          dom.textContent = `🔍 ${(appState.ui.boardScale * 100).toFixed(0)}%`;
        }
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
        dom.textContent = `${label}: ${appState.ui.currentArrowHead}`;
      },
    },
    {
      itemLabel: "Board size",
      className: "board-size",
      itemClickHandler: (activatingEvent) => {
        createBoardSizeControls(board, root, activatingEvent);
      },
    },
    {
      itemLabel: "Sticky size",
      className: "sticky-size",
      itemClickHandler: (activatingEvent) => {
        // Only available when exactly one sticky is selected
        if (selectedStickies.size() === 1) {
          let theId;
          selectedStickies.forEach((id) => (theId = id));
          createStickySizeControls(board, root, activatingEvent, theId);
        }
      },
      customLabel: (dom, label) => {
        if (selectedStickies.size() === 1) {
          dom.textContent = label;
          dom.disabled = false;
        } else {
          dom.textContent = `${label} (select 1)`;
          dom.disabled = true;
        }
      },
    },
  ];

  /**
   * Renders the menu element
   */
  function renderMenu() {
    if (!menuElement) {
      // Create container wrapper
      const menuContainer = document.createElement("div");
      menuContainer.classList.add("menu-container");
      
      // Create menu element
      menuElement = document.createElement("div");
      menuElement.classList.add("board-action-menu");
      menuItems.forEach((item) => {
        menuElement.appendChild(renderMenuButton(item));
      });
      
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
          itemElement.onclick = item.itemClickHandler;
          itemElement.classList.add(item.className);
          
          // Add icon if present
          if (item.icon) {
            itemElement.innerHTML = `${item.icon} ${item.itemLabel}`;
          }
        }
        
        item.dom = itemElement;
        return itemElement;
      }
    }

    menuItems.forEach(({ itemLabel, customLabel, dom, isSeparator }) => {
      if (itemLabel && !isSeparator) {
        if (customLabel) {
          customLabel(dom, itemLabel);
        } else {
          dom.textContent = itemLabel;
        }
      }
    });
  }

  return {
    menuElement,
    render: renderMenu,
  };
}
