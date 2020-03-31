// TODO: Keep the center of the board centered while zooming
// TODO: Use pointer events to support pinch zoom gesture
// TODO: Have fixed zoom scale in an array of constants
// TODO: Show an indicator of where something will be snapped to
// TODO: Move multiple stickies at once
// TODO: Add a sticky without a keyboard
// TODO: Move a sticky without a keyboard
// TODO: Delete sticky

const STICKY_TYPE = "application/sticky";
const DEFAULT_STICKY_COLOR = "khaki";
const zoomScale = [0.5, 1];

export function mount(board, domElement) {
  let stickyMovedLocally = null;
  const renderSticky = (stickyId, sticky) => {
    const container = getStickyElement(
      domElement,
      stickyId,
      board.updateText,
      board.getStickyLocation
    );
    const shouldAnimateMove = stickyMovedLocally !== stickyId;
    setStickyStyles(
      sticky,
      container,
      shouldAnimateMove
    );
    if (shouldAnimateMove) {
      stickyMovedLocally = null;
    }
    const textarea = container.inputElement;
    if (textarea.value !== sticky.text) {
      textarea.value = sticky.text;
      fitContentInSticky(container.sticky, textarea);
    }
  };
  const render = () => {
    domElement.boardScale =
      domElement.boardScale || zoomScale[zoomScale.length - 1];
    // const size = 8000 * domElement.boardScale + "px";
    // domElement.style.width = size;
    // domElement.style.height = size;
    domElement.style.width = 8000
    domElement.style.height = 8000
    domElement.style.transform = `scale(${domElement.boardScale})`;
    Object.entries(board.getState().stickies).forEach(entry => {
      const [id, sticky] = entry;
      renderSticky(id, sticky);
    });
  };

  domElement.ondragover = event => {
    event.preventDefault();
  };

  domElement.ondrop = event => {
    const { clientX: x, clientY: y } = event;
    const { id, originalLocation, dragStart } = JSON.parse(
      event.dataTransfer.getData(STICKY_TYPE)
    );
    const offset = {
      x: (x - dragStart.x) / domElement.boardScale,
      y: (y - dragStart.y) / domElement.boardScale
    };
    const newLocation = {
      x: originalLocation.x + offset.x,
      y: originalLocation.y + offset.y
    };
    stickyMovedLocally = id;
    board.moveSticky(id, newLocation);
  };
  let nextClickCreatesNewSticky = false;
  document.body.onkeyup = event => {
    if (event.key === "o") {
      let index = zoomScale.findIndex(v => v === domElement.boardScale) + 1;
      domElement.boardScale = zoomScale[index % zoomScale.length];
      render(board, domElement);
    } else if (event.key === "n") {
      nextClickCreatesNewSticky = true;
    }
  };
  domElement.onclick = event => {
    if (nextClickCreatesNewSticky) {
      nextClickCreatesNewSticky = false;
      const rect = domElement.getBoundingClientRect();
      const location = {
        x: ((event.clientX - rect.left) / domElement.boardScale) - 50,
        y: ((event.clientY - rect.top) / domElement.boardScale) - 50
      };
      board.putSticky({ color: "khaki", location });
    }
  };
  const observer = createBufferedObserver(board, render, renderSticky)
  board.addObserver(observer);
  render();
  return {
    render
  };
}
function getStickyElement(boardElement, id, updateTextById, getStickyLocation) {
  const stickyIdClass = "sticky-" + id;
  let container = boardElement[stickyIdClass];
  if (!container) {
    container = createStickyContainerDOM(stickyIdClass);
    boardElement[stickyIdClass] = container;
    boardElement.appendChild(container);
    container.ondragstart = event => {
      const { clientX: x, clientY: y } = event;
      const originalLocation = getStickyLocation(id);
      event.dataTransfer.setData(
        STICKY_TYPE,
        JSON.stringify({ id, originalLocation, dragStart: { x, y } })
      );
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
    container.inputElement.onkeyup = event => {
      event.stopPropagation();
      if (event.keyCode === 13) {
        setEditable(false);
      }
    };
    container.inputElement.addEventListener("input", () => {
      container.inputElement.value = updateTextById(
        id,
        container.inputElement.value
      );
      fitContentInSticky(container.sticky, container.inputElement);
    });
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

function setStickyStyles(sticky, container, animateMove) {
  const { sticky: stickyElement } = container;
  if (animateMove) {
    container.style.transition = "left 1s, top 1s";
  } else {
    container.style.transition = "none";
  }
  container.style.left = sticky.location.x + "px";
  container.style.top = sticky.location.y + "px";
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
  let isRunScheduled = false
  const tasks = []
  function doRun() {
    let timeElapsed = 0
    while (tasks.length && timeElapsed < 14) {
      const task = tasks.shift()
      let start = Date.now()
      task()
      timeElapsed += Date.now() - start
    }
    if (tasks.length) {
      requestAnimationFrame(doRun)
    } else {
      isRunScheduled = false
    }
  }
  function scheduleRenderTask(task) {
    if (!isRunScheduled) {
      requestAnimationFrame(doRun)
      isRunScheduled = true
    }
    tasks.push(task)
  }
  return {
    onStickyChange(id) {
      scheduleRenderTask(() => renderSticky(id, board.getSticky(id)));
    },
    onBoardChange() {
      scheduleRenderTask(() => render());
    }
  };
}
