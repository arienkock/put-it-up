import { changeZoomLevel } from "./zoom.js";
import { changeColor } from "./color-management.js";
import { createBoardSizeControls } from "./board-size-controls.js";

/**
 * Creates and manages the board action menu
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object
 * @param {HTMLElement} root - Root element to attach menu to
 * @param {Object} appState - Application state object
 * @param {Function} renderCallback - Callback to trigger re-rendering
 * @returns {Object} Object with menuElement and render function
 */
export function createMenu(board, selectedStickies, root, appState, renderCallback) {
  let menuElement;

  const menuItems = [
    {
      itemLabel: "New sticky",
      className: "new-sticky",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesNewSticky = true;
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
