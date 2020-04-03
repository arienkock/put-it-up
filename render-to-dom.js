// TODO: Keep the center of the board centered while zooming
// TODO: Add a sticky without a keyboard
// TODO: Move a sticky without a keyboard
// TODO: Delete sticky
// TODO: Render most recently changed sticky on top

const STICKY_TYPE = "application/sticky";
const DEFAULT_STICKY_COLOR = "khaki";
const zoomScale = [0.25, 0.5, 1];
const colorPalette = [
  "khaki",
  "#F8C471",
  "#AED6F1",
  "#82E0AA",
  "#F1948A",
  "#C39BD3",
];
const moveDurationMs = 100;

export function mount(board, boardContainer) {
  const domElement = boardContainer.querySelector(".board");
  let stickiesMovedByDragging = [];
  let currentColor = colorPalette[0];
  const observer = createBufferedObserver(board, render, renderSticky);
  board.addObserver(observer);
  const selectedStickies = new Selection(observer);
  function renderSticky(stickyId, sticky) {
    const container = getStickyElement(
      domElement,
      stickyId,
      board.updateText,
      board.getStickyLocation,
      selectedStickies
    );
    const shouldAnimateMove = !stickiesMovedByDragging.includes(stickyId);
    const stickyIsSelected = selectedStickies.data[stickyId];
    setStickyStyles(sticky, container, shouldAnimateMove, stickyIsSelected);
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
  }
  function render() {
    domElement.boardScale =
      domElement.boardScale || zoomScale[zoomScale.length - 1];
    domElement.style.width = 8000;
    domElement.style.height = 8000;
    boardContainer.style.width = 8000 * domElement.boardScale;
    boardContainer.style.height = 8000 * domElement.boardScale;
    domElement.style.transform = `scale(${domElement.boardScale})`;
    if (domElement.boardScale < 0.5) {
      domElement.classList.add("sticky-text-hidden");
    } else {
      domElement.classList.remove("sticky-text-hidden");
    }
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
    selectedStickies.forEach(sid => {
      const originalLocation = board.getStickyLocation(sid)
      const newLocation = {
        x: originalLocation.x + dx,
        y: originalLocation.y + dy,
      };
      board.moveSticky(sid, newLocation)
    })
  }
  let nextClickCreatesNewSticky = false;
  document.body.onkeydown = (event) => {
    if (event.key === "o") {
      let index = zoomScale.findIndex((v) => v === domElement.boardScale) + 1;
      domElement.boardScale = zoomScale[index % zoomScale.length];
      render(board, domElement);
    } else if (event.key === "n") {
      nextClickCreatesNewSticky = true;
    } else if (event.key === "c") {
      let index = colorPalette.findIndex((c) => c === currentColor);
      currentColor = colorPalette[(index + 1) % colorPalette.length];
      selectedStickies.data;
    } else if (event.key.startsWith("Arrow") && selectedStickies.hasItems()) {
      event.preventDefault()
      switch (event.key) {
        case "ArrowUp":
          moveSelection(0, -board.gridSize);
          break;
        case "ArrowDown":
          moveSelection(0, board.gridSize);
          break;
        case "ArrowLeft":
          moveSelection(-board.gridSize, 0);
          break;
        case "ArrowRight":
          moveSelection(board.gridSize, 0);
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
      const location = {
        x: (event.pageX - rect.left) / domElement.boardScale - 50 + rect.left,
        y: (event.pageY - rect.top) / domElement.boardScale - 50 + rect.top,
      };
      const id = board.putSticky({ color: currentColor, location });
      selectedStickies.replaceSelection(id);
    } else if (event.target === domElement && !event.shiftKey) {
      selectedStickies.clearSelection();
    }
  };
  render();
  return {
    render,
  };
}
function getStickyElement(
  boardElement,
  id,
  updateTextById,
  getStickyLocation,
  selectedStickies
) {
  const stickyIdClass = "sticky-" + id;
  let container = boardElement[stickyIdClass];
  if (!container) {
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
    container.inputElement.onkeyup = (event) => {
      event.stopPropagation();
      if (event.keyCode === 13) {
        setEditable(false);
      }
    };
    function moveToFront() {
      if (container.parentNode.lastChild !== container) {
        [...container.parentNode.childNodes].forEach((n) => {
          if (n !== container) {
            container.parentNode.insertBefore(n, container);
          }
        });
      }
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
      } else {
        selectedStickies.replaceSelection(id);
      }
    };
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

function setStickyStyles(sticky, container, animateMove, stickyIsSelected) {
  const { sticky: stickyElement } = container;
  if (animateMove) {
    container.style.transition = `left ${moveDurationMs}ms, top ${moveDurationMs}ms`;
  } else {
    container.style.transition = "none";
  }
  container.style.left = sticky.location.x + "px";
  container.style.top = sticky.location.y + "px";
  if (stickyIsSelected) {
    container.style.backgroundColor = "rgba(180,180,255,0.5)";
  } else {
    container.style.backgroundColor = "unset";
  }
  const size = 100 + "px";
  container.style.width = size;
  container.style.height = size;
  stickyElement.style.padding = 10 + "px";
  container.style.padding = 5 + "px";
  stickyElement.style.backgroundColor = sticky.color || DEFAULT_STICKY_COLOR;
}

function createStickyContainerDOM(stickyIdClass) {
  const container = document.createElement("div");
  container.innerHTML =
    '<div class="sticky"><textarea class="textInput text" rows="1" tabindex="-1"></textarea></div>';
  container.classList.add(stickyIdClass);
  container.inputElement = container.querySelector(".textInput");
  container.sticky = container.querySelector(".sticky");
  container.classList.add("sticky-container");
  container.sticky.setAttribute("draggable", "true");
  return container;
}

function createBufferedObserver(board, render, renderSticky) {
  let isRunScheduled = false;
  const tasks = [];
  function doRun() {
    let timeElapsed = 0;
    while (tasks.length && timeElapsed < 14) {
      const task = tasks.shift();
      let start = Date.now();
      task();
      timeElapsed += Date.now() - start;
    }
    if (tasks.length) {
      requestAnimationFrame(doRun);
    } else {
      isRunScheduled = false;
    }
  }
  function scheduleRenderTask(task) {
    if (!isRunScheduled) {
      requestAnimationFrame(doRun);
      isRunScheduled = true;
    }
    tasks.push(task);
  }
  return {
    onStickyChange(id) {
      scheduleRenderTask(() => renderSticky(id, board.getSticky(id)));
    },
    onBoardChange() {
      scheduleRenderTask(() => render());
    },
  };
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
      delete this.data[id]
    } else {
      this.data[id] = true
    }
    this.observer.onStickyChange(id);
  }
  addToSelection(id) {
    this.data[id] = true;
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
    return Object.keys(this.data).length !== 0
  }
  forEach(fn) {
    return Object.keys(this.data).forEach(fn);
  }
}
