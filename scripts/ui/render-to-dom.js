// TODO: Move stickies when board shrinks too small for them
// TODO: Write tests for: all growth and shrink directions, tabbing through inputs
// TODO: When tabbing through textareas, adjust selection if the blurred sticky was the only one selected, or there was no selection.
// TODO: Add help texts/instructions
// TODO: Select by dragging box area around items
// TODO: Reimplement drag and drop as custom JS, so you can show a drop-zone, and have the same logic for touch events
// TODO: On mobile the menu isn't really fixed at the top left
// TODO: Stick arbitrary images on the board and resize/reorient them
// TODO: Arrows connecting stickies
// TODO: Add security rules to Firestore
// TODO: Export/import the board data
// TOOD: Store board in web storage when using LocalDatastore
// TODO: Configure Firebase config via UI and remember it in web storage
// TODO: When zooming the approximate area of focus of the board remains in focus after the zoom
// TODO: Web RTC
// TODO: Moving a selection with arrows should move as a unit when hitting baord bounds
// TODO: Moving with arrows the sticky should remain on screen (follow it by scrolling)
// TODO: Fit text content by considering the width of the widest word

/*

Difficult decisions:
 - how and when selection happens
 - are selections a type of more generic grouping concept? i.e. by color, named groups, etc.
 - dimensions of stickies and if there are variations in size
 - how ordering/layering happens, z-index or dom content order
 - where changes to state come from, e.g. store, dragging, clicking, key presses
 - how zooming is implemented: transform, redraw,
 - how click coordinates are translated to board coordinates
 - how moving is going to work on mobile
 - how and when text is resized to fit in the box
 - when changes to dom actually happen and optimize using animation frames
 - how the board size is determined and changes
 - What can be put on the board, general images, arrows?
 - ordering sorting/layers of items


Modules:
 - selection/grouping
 - rendering, batching of changes coming from different sources
 - user actions (hides diff between kb shortcuts and menu items)
 - dragging
 - movement
 - text input
 - geometry
 - sticky interactions

Future changes:
 - Arrows. Board element shouldn't know what is being drawn. The items on the board know how to draw themselves.
   When an item moves an arrow needs to be redrawn. So, something like react where it depends on a prop.
   Can decide whether it needs to be redrawn. How does an arrow/sticky get stored and communicated.
 - Sending cursor info to peers. Comm channel shouldn't know about what is being sent. Support arbitrary data.
 - Infinite board. Board size can be set arbitrarily.
 - Commands. Each menu item is a command. Each command has a keyboard shortcut.
*/

import {
  createRenderer,
  STICKY_TYPE,
  DEFAULT_STICKY_COLOR,
} from "../board-items/sticky.js";
import { getAppState } from "../app-state.js";

const zoomScale = [0.3, 0.6, 1];
export const colorPalette = [
  "khaki",
  "#F8C471",
  "#AED6F1",
  "#82E0AA",
  "#F1948A",
  "#C39BD3",
];
Object.freeze(colorPalette);

export function mount(board, root, Observer) {
  root.innerHTML =
    '<div class="board-container"><div class="board"></div></div>';
  const boardContainer = root.firstElementChild;
  const domElement = boardContainer.firstElementChild;
  const appState = getAppState();
  // Use globally stored UI state
  let stickiesMovedByDragging = appState.ui.stickiesMovedByDragging;
  const renderSticky = createRenderer(
    board,
    domElement,
    getSelectedStickies,
    stickiesMovedByDragging
  );
  appState.ui.currentColor = appState.ui.currentColor || colorPalette[0];
  const observer = new Observer(board, render, renderSticky);
  board.addObserver(observer);
  const selectedStickies = new Selection(observer);
  function getSelectedStickies() {
    return selectedStickies;
  }
  function renderBoard() {
    if (!board.isReadyForUse()) {
      return;
    }
    appState.ui.boardScale =
      appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    const size = board.getBoardSize();
    root.style.width = size.width * appState.ui.boardScale + "px";
    root.style.height = size.height * appState.ui.boardScale + "px";
    domElement.style.width = size.width + "px";
    domElement.style.height = size.height + "px";
    boardContainer.style.width = size.width * appState.ui.boardScale + "px";
    boardContainer.style.height = size.height * appState.ui.boardScale + "px";
    domElement.style.transform = `scale3d(${appState.ui.boardScale},${appState.ui.boardScale},1)`;
    if (appState.ui.boardScale < 0.5) {
      domElement.classList.add("sticky-text-hidden");
    } else {
      domElement.classList.remove("sticky-text-hidden");
    }
    if (appState.ui.nextClickCreatesNewSticky) {
      domElement.classList.add("click-to-create");
    } else {
      domElement.classList.remove("click-to-create");
    }
  }
  let menuElement;
  const menuItems = [
    {
      itemLabel: "New sticky",
      className: "new-sticky",
      itemClickHandler: () => {
        appState.ui.nextClickCreatesNewSticky = true;
        renderBoard();
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
        changeColor(event.shiftKey);
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
        changeZoomLevel(event.shiftKey);
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
        const container = document.createElement("div");
        if (!document.querySelector(".sizing-controls")) {
          container.innerHTML = `<div class="sizing-controls">
            <label for="Grow">Grow</label>
            <input type="radio" id="Grow" name="size-change-direction" value="Grow" checked="checked">
            &nbsp;&nbsp;
            <label for="Shrink">Shrink</label>
            <input type="radio" id="Shrink" name="size-change-direction" value="Shrink">
            <div class="grow-arrows">
              <button class="top">${arrowHTML()}</button>
              <button class="right">${arrowHTML()}</button>
              <button class="bottom">${arrowHTML()}</button>
              <button class="left">${arrowHTML()}</button>
            </div>
          </div>`;
          const sizingControls = container.firstElementChild;
          sizingControls.addEventListener("click", (event) => {
            const isGrow = sizingControls.querySelector("#Grow").checked;
            const side = ["top", "right", "bottom", "left"].find((side) =>
              isChildOf(event.target, side)
            );
            board.changeSize(isGrow, side);
          });
          document.body.addEventListener("click", (event) => {
            if (
              event !== activatingEvent &&
              !isChildOf(event.target, "sizing-controls")
            ) {
              sizingControls.remove();
            }
          });
          document.body.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
              sizingControls.remove();
            }
          });
          root.appendChild(sizingControls);
        }
      },
    },
  ];
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
  function render() {
    renderBoard();
    renderMenu();
    Object.entries(board.getState().stickies).forEach(([stickyId, sticky]) =>
      renderSticky(stickyId, sticky)
    );
  }

  domElement.ondragover = (event) => {
    event.preventDefault();
  };

  domElement.ondrop = (event) => {
    const { pageX: x, pageY: y } = event;
    const { originalLocations, dragStart } = JSON.parse(
      event.dataTransfer.getData(STICKY_TYPE)
    );
    const offset = {
      x: (x - dragStart.x) / appState.ui.boardScale,
      y: (y - dragStart.y) / appState.ui.boardScale,
    };
    Object.keys(originalLocations).forEach((id) => {
      const originalLocation = originalLocations[id];
      const newLocation = {
        x: originalLocation.x + offset.x,
        y: originalLocation.y + offset.y,
      };
      appState.ui.stickiesMovedByDragging.push(id);
      board.moveSticky(id, newLocation);
    });
  };
  function moveSelection(dx, dy) {
    selectedStickies.forEach((sid) => {
      const originalLocation = board.getStickyLocation(sid);
      const newLocation = {
        x: originalLocation.x + dx,
        y: originalLocation.y + dy,
      };
      board.moveSticky(sid, newLocation);
    });
  }
  function changeZoomLevel(reverse) {
    let index =
      zoomScale.findIndex((v) => v === appState.ui.boardScale) +
      (reverse ? -1 : 1);
    appState.ui.boardScale = zoomScale[index % zoomScale.length];
    render(board, domElement);
  }
  function changeColor(reverse) {
    if (selectedStickies.hasItems()) {
      if (multipleSelectedHaveSameColor() || singleSelectedHasCurrentColor()) {
        nextColor();
      }
      selectedStickies.forEach((id) => {
        board.updateColor(id, appState.ui.currentColor);
      });
    } else {
      nextColor();
    }
    function nextColor() {
      const delta = reverse ? -1 : 1;
      let index =
        (colorPalette.findIndex((c) => c === appState.ui.currentColor) + delta) %
        colorPalette.length;
      if (index < 0) {
        index += colorPalette.length;
      }
      appState.ui.currentColor = colorPalette[index];
      renderMenu();
    }
    function multipleSelectedHaveSameColor() {
      const colors = selectedColors();
      return colors.length > 1 && colors.every((color) => color === colors[0]);
    }
    function singleSelectedHasCurrentColor() {
      const colors = selectedColors();
      return colors.length === 1 && colors[0] === appState.ui.currentColor;
    }
    function selectedColors() {
      const colors = [];
      selectedStickies.forEach((id) => colors.push(board.getSticky(id).color));
      return colors;
    }
  }
  // keyboard and global UI state
  document.body.onkeydown = (event) => {
    if (event.key === "o" || event.key === "O") {
      changeZoomLevel(event.shiftKey);
    } else if (event.key === "n") {
      appState.ui.nextClickCreatesNewSticky = true;
      renderBoard();
    } else if (event.key === "Escape") {
      if (appState.ui.nextClickCreatesNewSticky) {
        appState.ui.nextClickCreatesNewSticky = false;
        renderBoard();
      }
    } else if (event.key === "c" || event.key === "C") {
      changeColor(event.shiftKey);
    } else if (event.key === "Delete") {
      selectedStickies.forEach((id) => {
        board.deleteSticky(id);
      });
    } else if (event.key.startsWith("Arrow") && selectedStickies.hasItems()) {
      event.preventDefault();
      const gridUnit = board.getGridUnit();
      switch (event.key) {
        case "ArrowUp":
          moveSelection(0, -gridUnit);
          break;
        case "ArrowDown":
          moveSelection(0, gridUnit);
          break;
        case "ArrowLeft":
          moveSelection(-gridUnit, 0);
          break;
        case "ArrowRight":
          moveSelection(gridUnit, 0);
          break;
        default:
          break;
      }
    }
  };
  domElement.onclick = (event) => {
    if (appState.ui.nextClickCreatesNewSticky) {
      appState.ui.nextClickCreatesNewSticky = false;
      const rect = domElement.getBoundingClientRect();
      const origin = board.getOrigin();
      const location = {
        x:
          (event.clientX - rect.left - 50 * appState.ui.boardScale) /
            appState.ui.boardScale +
          origin.x,
        y:
          (event.clientY - rect.top - 50 * appState.ui.boardScale) /
            appState.ui.boardScale +
          origin.y,
      };
      const id = board.putSticky({ color: appState.ui.currentColor, location });
      selectedStickies.replaceSelection(id);
      renderBoard();
    } else if (event.target === domElement && !event.shiftKey) {
      selectedStickies.clearSelection();
    }
  };
  render();
  return {
    render,
    observer,
  };
}

class Selection {
  // TODO: Make this generally observable, make an StickyObservable mixin.
  constructor(observer) {
    this.observer = observer;
    this.appState = getAppState();
    this.appState.ui.selection = this.appState.ui.selection || {};
  }
  replaceSelection(id) {
    const prevData = this.appState.ui.selection;
    this.appState.ui.selection = { [id]: true };
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
    this.observer.onStickyChange(id);
  }
  toggleSelected(id) {
    const data = this.appState.ui.selection;
    if (data[id]) {
      delete data[id];
    } else {
      data[id] = true;
    }
    this.observer.onStickyChange(id);
  }
  clearSelection() {
    const prevData = this.appState.ui.selection;
    this.appState.ui.selection = {};
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
  }
  isSelected(id) {
    return this.appState.ui.selection[id];
  }
  hasItems() {
    return this.size() !== 0;
  }
  forEach(fn) {
    return Object.keys(this.appState.ui.selection).forEach(fn);
  }
  size() {
    return Object.keys(this.appState.ui.selection).length;
  }
}

function arrowHTML() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" width="25px" height="25px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve">
  <path class="svg-arrow" fill="#010101" d="M128,256L384,0v128L256,256l128,128v128L128,256z"/>
</svg>
  `;
}

function isChildOf(element, cn) {
  if (element.classList && element.classList.contains(cn)) {
    return true;
  }
  return element.parentNode && isChildOf(element.parentNode, cn);
}
