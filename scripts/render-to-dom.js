// TODO: Put zoom button in menu
// TODO: When zoomed stickies at the top are hidden by the menu. Fix it.
// TODO: Add help texts/instructions
// TODO: Select by dragging box area around items
// TODO: Reimplement drag and drop as custom JS, so you can show a drop-zone, and have the same logic for touch events
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
This is the UI component.

Features:
 - Add a sticky to the board by clicking and it appears at the location clicked
 - Move a sticky via drag and drop
 - Move a sticky with arrow keys
 - Change the text of a sticky
 - Text will be fitted to the sticky
 - Cycle through the palette of colors (c-key) that determine the color of the next sticky to be created
 - Cycle through zoom levels of the board (o-key)
 - Multiple stickies can be selected by shift+clicking which is shown by surrounding the sticky with a certain color
    - Each shift+click toggles the selected state
    - When there is a selection, moving stickies (arrow keys and drag-'n-drop) affects the whole selection
    - Clicking on the board (outside a sticky), without holding shift, clears the selection
 - When a sticky is moved by any means other than drag-n-drop (external update, arrow keys) the move is animated
 - The size the document is bound to the size of the board when zooming
 - When the zoom level is lower than 50% the text is hidden, so dragging is easier
 - Clicking on a sticky selects it
 - When pressing enter/return while typing inside a sticky, the focus is removed from the input field
 - A sticky is moved to the top/front when it is clicked, moved, or otherwise updated
 - The observer is buffered, sticky renders/updates happen during an animation frame, and only as long as there is time left to animate smoothly

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
*/

const STICKY_TYPE = "application/sticky";
const DEFAULT_STICKY_COLOR = "khaki";
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
  let stickiesMovedByDragging = [];
  let currentColor = colorPalette[0];
  const observer = new Observer(board, render, renderSticky);
  board.addObserver(observer);
  const selectedStickies = new Selection(observer);
  function renderSticky(stickyId, sticky) {
    const shouldDelete = sticky === undefined;
    const container = getStickyElement(
      domElement,
      stickyId,
      board.updateText,
      board.getStickyLocation,
      selectedStickies,
      shouldDelete
    );
    // if container is falsy, then sticky was deleted
    if (container) {
      const shouldAnimateMove = !stickiesMovedByDragging.includes(stickyId);
      const stickyIsSelected = selectedStickies.data[stickyId];
      setStickyStyles(
        sticky,
        container,
        shouldAnimateMove,
        stickyIsSelected,
        board.getOrigin()
      );
      if (!shouldAnimateMove) {
        stickiesMovedByDragging = stickiesMovedByDragging.filter(
          (sid) => sid !== stickyId
        );
      }
      const textarea = container.inputElement;
      if (textarea.value !== sticky.text) {
        textarea.value = sticky.text;
        fitContentInSticky(container.sticky, textarea);
      }
      // ordering
      const elementsOnBoard = [...domElement.children];
      const activeElement = document.activeElement;
      let shouldRefocus = false;
      if (elementsOnBoard.some((el) => el.contains(activeElement))) {
        shouldRefocus = true;
      }
      elementsOnBoard.sort((a, b) => {
        let yDif = removePx(a.style.top) - removePx(b.style.top);
        if (yDif === 0) {
          const xDif = removePx(a.style.left) - removePx(b.style.left);
          if (xDif === 0) {
            return b.className > a.className;
          }
          return xDif;
        }
        return yDif;
      });
      elementsOnBoard.forEach((el) => domElement.appendChild(el));
      if (shouldRefocus) {
        activeElement.focus();
      }
    }
  }
  function renderBoard() {
    if (!board.isReadyForUse()) {
      return;
    }
    domElement.boardScale =
      domElement.boardScale || zoomScale[zoomScale.length - 1];
    const size = board.getBoardSize();
    root.style.width = size.width * domElement.boardScale + "px";
    root.style.height = size.height * domElement.boardScale + "px";
    domElement.style.width = size.width + "px";
    domElement.style.height = size.height + "px";
    boardContainer.style.width = size.width * domElement.boardScale + "px";
    boardContainer.style.height = size.height * domElement.boardScale + "px";
    domElement.style.transform = `scale3d(${domElement.boardScale},${domElement.boardScale},1)`;
    if (domElement.boardScale < 0.5) {
      domElement.classList.add("sticky-text-hidden");
    } else {
      domElement.classList.remove("sticky-text-hidden");
    }
    if (nextClickCreatesNewSticky) {
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
        nextClickCreatesNewSticky = true;
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
        dom.lastChild.style.backgroundColor = currentColor;
      },
    },
    {
      itemLabel: "Zoom",
      className: "change-zoom",
      itemClickHandler: (event) => {
        changeZoomLevel(event.shiftKey);
      },
      customLabel: (dom, label) => {
        dom.textContent = `${label} (${(domElement.boardScale * 100).toFixed(
          0
        )}%)`;
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
              !isChildOf(event.target, ".sizing-controls")
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
      root.appendChild(menuElement);
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
      x: (x - dragStart.x) / domElement.boardScale,
      y: (y - dragStart.y) / domElement.boardScale,
    };
    Object.keys(originalLocations).forEach((id) => {
      const originalLocation = originalLocations[id];
      const newLocation = {
        x: originalLocation.x + offset.x,
        y: originalLocation.y + offset.y,
      };
      stickiesMovedByDragging.push(id);
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
      zoomScale.findIndex((v) => v === domElement.boardScale) +
      (reverse ? -1 : 1);
    domElement.boardScale = zoomScale[index % zoomScale.length];
    render(board, domElement);
  }
  function changeColor(reverse) {
    if (selectedStickies.hasItems()) {
      if (multipleSelectedHaveSameColor() || singleSelectedHasCurrentColor()) {
        nextColor();
      }
      selectedStickies.forEach((id) => {
        board.updateColor(id, currentColor);
      });
    } else {
      nextColor();
    }
    function nextColor() {
      const delta = reverse ? -1 : 1;
      let index =
        (colorPalette.findIndex((c) => c === currentColor) + delta) %
        colorPalette.length;
      if (index < 0) {
        index += colorPalette.length;
      }
      currentColor = colorPalette[index];
      renderMenu();
    }
    function multipleSelectedHaveSameColor() {
      const colors = selectedColors();
      return colors.length > 1 && colors.every((color) => color === colors[0]);
    }
    function singleSelectedHasCurrentColor() {
      const colors = selectedColors();
      return colors.length === 1 && colors[0] === currentColor;
    }
    function selectedColors() {
      const colors = [];
      selectedStickies.forEach((id) => colors.push(board.getSticky(id).color));
      return colors;
    }
  }
  let nextClickCreatesNewSticky = false;
  document.body.onkeydown = (event) => {
    if (event.key === "o") {
      changeZoomLevel();
    } else if (event.key === "O") {
      changeZoomLevel(true);
    } else if (event.key === "n") {
      nextClickCreatesNewSticky = true;
      renderBoard();
    } else if (event.key === "Escape") {
      if (nextClickCreatesNewSticky) {
        nextClickCreatesNewSticky = false;
        renderBoard();
      }
    } else if (event.key === "c") {
      changeColor();
    } else if (event.key === "C") {
      changeColor(true);
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
    if (nextClickCreatesNewSticky) {
      nextClickCreatesNewSticky = false;
      const rect = domElement.getBoundingClientRect();
      const origin = board.getOrigin();
      const location = {
        x:
          (event.clientX - rect.left - 50 * domElement.boardScale) /
            domElement.boardScale +
          origin.x,
        y:
          (event.clientY - rect.top - 50 * domElement.boardScale) /
            domElement.boardScale +
          origin.y,
      };
      const id = board.putSticky({ color: currentColor, location });
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
function getStickyElement(
  boardElement,
  id,
  updateTextById,
  getStickyLocation,
  selectedStickies,
  shouldDelete = false
) {
  const stickyIdClass = "sticky-" + id;
  let container = boardElement[stickyIdClass];
  if (shouldDelete) {
    delete boardElement[stickyIdClass];
    if (container) {
      boardElement.removeChild(container);
    }
    container = undefined;
  } else if (!container) {
    container = createStickyContainerDOM(stickyIdClass);
    boardElement[stickyIdClass] = container;
    boardElement.appendChild(container);
    container.ondragstart = (event) => {
      const { pageX: x, pageY: y } = event;
      let originalLocations = {};
      if (selectedStickies.isSelected(id)) {
        selectedStickies.forEach((sid) => {
          originalLocations[sid] = getStickyLocation(sid);
        });
      } else {
        originalLocations[id] = getStickyLocation(id);
      }
      event.dataTransfer.setData(
        STICKY_TYPE,
        JSON.stringify({ originalLocations, dragStart: { x, y } })
      );
      moveToFront();
    };
    function setEditable(enabled) {
      if (enabled) {
        container.classList.add("editing");
        container.inputElement.focus();
      } else {
        container.classList.remove("editing");
        container.inputElement.blur();
      }
    }
    container.inputElement.onblur = () => setEditable(false);
    container.inputElement.onfocus = () => {
      setEditable(true);
      moveToFront();
    };
    container.inputElement.onkeydown = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        setEditable(false);
      }
    };
    container.inputElement.onkeyup = (event) => {
      event.stopPropagation();
      if (event.keyCode === 13) {
        setEditable(false);
      }
    };
    container.inputElement.onclick = (event) => {
      if (event.shiftKey) {
        event.preventDefault();
      }
    };
    function moveToFront() {
      [...container.parentNode.children].forEach((el) => {
        if (el === container) {
          el.style.zIndex = "1";
        } else {
          el.style.zIndex = "unset";
        }
      });
    }
    container.inputElement.addEventListener("input", () => {
      moveToFront();
      container.inputElement.value = updateTextById(
        id,
        container.inputElement.value
      );
      fitContentInSticky(container.sticky, container.inputElement);
    });
    container.sticky.onclick = (event) => {
      moveToFront();
      if (event.shiftKey) {
        selectedStickies.toggleSelected(id);
        setEditable(false);
      } else {
        selectedStickies.replaceSelection(id);
      }
    };
    moveToFront();
  }
  return container;
}

function fitContentInSticky(sticky, textarea) {
  textarea.rows = 1;
  textarea.style.fontSize = "1.5rem";
  let fontSize = 1.5;
  const wordMatches = textarea.value.match(/\S+/g);
  const numWords = wordMatches === null ? 0 : wordMatches.length;
  while (true) {
    let adjusted = false;
    if (textarea.rows < numWords || textarea.value.length > 15) {
      if (
        textarea.scrollHeight > textarea.clientHeight &&
        sticky.scrollHeight <= sticky.clientHeight
      ) {
        textarea.rows++;
        adjusted = true;
      }
      if (sticky.scrollHeight > sticky.clientHeight) {
        textarea.rows--;
        adjusted = false;
      }
    }
    if (textarea.scrollHeight > textarea.clientHeight && fontSize > 0.5) {
      adjusted = true;
      fontSize -= 0.1;
      textarea.style.fontSize = fontSize + "rem";
    }
    if (!adjusted) {
      break;
    }
  }
}

function setStickyStyles(
  sticky,
  container,
  animateMove,
  stickyIsSelected,
  origin
) {
  const { sticky: stickyElement } = container;
  if (animateMove) {
    container.classList.add("animate-move");
  } else {
    container.classList.remove("animate-move");
  }
  container.style.left = sticky.location.x - origin.x + "px";
  container.style.top = sticky.location.y - origin.y + "px";
  if (stickyIsSelected) {
    container.classList.add("selected");
    container.style.backgroundColor = "";
  } else {
    container.classList.remove("selected");
  }
  const size = 100 + "px";
  container.style.width = size;
  container.style.height = size;
  stickyElement.style.backgroundColor = sticky.color || DEFAULT_STICKY_COLOR;
}

function createStickyContainerDOM(stickyIdClass) {
  const container = document.createElement("div");
  container.innerHTML =
    '<div class="sticky"><textarea class="text-input text" rows="1"></textarea></div>';
  container.classList.add(stickyIdClass);
  container.inputElement = container.querySelector(".text-input");
  container.sticky = container.querySelector(".sticky");
  container.classList.add("sticky-container");
  container.sticky.setAttribute("draggable", "true");
  return container;
}

class Selection {
  data = {};
  // TODO: Make this generally observable, make an StickyObservable mixin.
  constructor(observer) {
    this.observer = observer;
  }
  replaceSelection(id) {
    const prevData = this.data;
    this.data = { [id]: true };
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
    this.observer.onStickyChange(id);
  }
  toggleSelected(id) {
    if (this.data[id]) {
      delete this.data[id];
    } else {
      this.data[id] = true;
    }
    this.observer.onStickyChange(id);
  }
  clearSelection() {
    const prevData = this.data;
    this.data = {};
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
  }
  isSelected(id) {
    return this.data[id];
  }
  hasItems() {
    return this.size() !== 0;
  }
  forEach(fn) {
    return Object.keys(this.data).forEach(fn);
  }
  size() {
    return Object.keys(this.data).length;
  }
}

function removePx(s) {
  return +s.substring(0, s.length - 2);
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
