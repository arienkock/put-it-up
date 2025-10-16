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
      itemLabel: "New sticky",
      className: "new-sticky",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesNewSticky = true;
        appState.ui.nextClickCreatesConnector = false;
        appState.ui.connectorOriginId = null;
        renderCallback();
      },
    },
    {
      itemLabel: "New connector",
      className: "new-connector",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesConnector = true;
        appState.ui.nextClickCreatesNewSticky = false;
        appState.ui.connectorOriginId = null;
        renderCallback();
      },
    },
    {
      itemLabel: "Delete",
      className: "delete",
      itemClickHandler: () => {
        selectedStickies.forEach((id) => {
          board.deleteSticky(id);
        });
        selectedConnectors.forEach((id) => {
          board.deleteConnector(id);
        });
      },
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
      itemLabel: "Zoom",
      className: "change-zoom",
      itemClickHandler: (event) => {
        const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
        appState.ui.boardScale = newScale;
        renderCallback();
      },
      customLabel: (dom, label) => {
        if (!appState.ui.boardScale) {
          dom.textContent = label;
        } else {
          dom.textContent = `${label} (${(appState.ui.boardScale * 100).toFixed(
            0
          )}%)`;
        }
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
      menuElement = document.createElement("div");
      menuElement.classList.add("board-action-menu");
      menuItems.forEach((item) => {
        menuElement.appendChild(renderMenuButton(item));
      });
      root.insertAdjacentElement("afterbegin", menuElement);

      // Handle viewport zoom to keep menu visible and at constant size
      if (window.visualViewport) {
        function updateMenuForViewportZoom() {
          const viewport = window.visualViewport;
          const scale = viewport.scale;
          
          // Counter-scale to keep menu at constant visual size
          menuElement.style.transform = `scale(${1 / scale})`;
          menuElement.style.transformOrigin = 'top left';
          
          // Position menu with consistent margin (equivalent to 1em)
          // Since we're counter-scaling, we need to scale the margin inversely
          const baseMargin = 16; // 1em equivalent in pixels
          const scaledMargin = baseMargin / scale;
          
          menuElement.style.left = `${viewport.offsetLeft + scaledMargin}px`;
          menuElement.style.top = `${viewport.offsetTop + scaledMargin}px`;
          
          // Compensate for button margins that get scaled down
          // Each button has margin: 0.15em, so we need to expand the menu width
          const buttonMargin = parseFloat(getComputedStyle(menuElement.querySelector('button')).marginLeft) || 2.4; // 0.15em ≈ 2.4px
          const marginCompensation = buttonMargin * (menuItems.length - 1) * (scale - 1);
          menuElement.style.width = `calc(100% + ${marginCompensation}px)`;
        }
        
        window.visualViewport.addEventListener('resize', updateMenuForViewportZoom);
        window.visualViewport.addEventListener('scroll', updateMenuForViewportZoom);
        updateMenuForViewportZoom(); // Initial call
      }

      function renderMenuButton(item) {
        const itemElement = document.createElement("button");
        item.dom = itemElement;
        itemElement.onclick = item.itemClickHandler;
        itemElement.classList.add(item.className);
        return itemElement;
      }
    }

    menuItems.forEach(({ itemLabel, customLabel, dom }) => {
      if (itemLabel) {
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
