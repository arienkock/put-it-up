// TODO: Keep the center of the board centered while zooming
// TODO: Use pointer events to support pinch zoom gesture
// TODO: Have fixed zoom scale in an array of constants
// TODO: Show an indicator of where something will be snapped to

const STICKY_TYPE = "application/sticky";
const DEFAULT_STICKY_COLOR = "khaki";
const zoomScale = [0.5, 1];
export function mount(board, element) {
  const renderSticky = (id, sticky) => {
    const container = getStickyElement(
      element,
      id,
      board.updateText,
      board.getStickyLocation
    );
    const { sticky: stickyElement, inputElement } = container;
    container.style.left = sticky.location.x * element.boardScale + "px";
    container.style.top = sticky.location.y * element.boardScale + "px";
    inputElement.style.display = element.boardScale < 0.6 ? "none" : "block";
    const size = 100 * element.boardScale + "px";
    container.style.width = size;
    container.style.height = size;
    stickyElement.style.padding = 10 * element.boardScale + "px";
    container.style.padding = 5 * element.boardScale + "px";
    stickyElement.style.backgroundColor = sticky.color || DEFAULT_STICKY_COLOR;
    if (inputElement.value !== sticky.text) {
      inputElement.value = sticky.text;
      fitContentInSticky(stickyElement, inputElement);
    }
  };
  const render = () => {
    element.boardScale = element.boardScale || zoomScale[zoomScale.length - 1];
    const size = 8000 * element.boardScale + "px";
    element.style.width = size;
    element.style.height = size;
    element.style.transform = `scale(${element.boardScale})`;
    Object.entries(board.getState().stickies).forEach(entry => {
      const [id, sticky] = entry;
      renderSticky(id, sticky);
    });
  };

  element.ondragover = event => {
    event.preventDefault();
  };

  element.ondrop = event => {
    const { clientX: x, clientY: y } = event;
    const { id, originalLocation, dragStart } = JSON.parse(
      event.dataTransfer.getData(STICKY_TYPE)
    );
    const squareScale = element.boardScale * element.boardScale;
    const offset = {
      x: (x - dragStart.x) / squareScale,
      y: (y - dragStart.y) / squareScale
    };
    const newLocation = {
      x: originalLocation.x + offset.x,
      y: originalLocation.y + offset.y
    };
    board.moveSticky(id, newLocation);
  };
  let nextClickCreatesNewSticky = false;
  document.body.onkeyup = event => {
    if (event.key === "o") {
      let index = zoomScale.findIndex(v => v === element.boardScale) + 1;
      element.boardScale = zoomScale[index % zoomScale.length];
      render(board, element);
    } else if (event.key === "n") {
      nextClickCreatesNewSticky = true;
    }
  };
  element.onclick = event => {
    if (nextClickCreatesNewSticky) {
      nextClickCreatesNewSticky = false;
      const rect = element.getBoundingClientRect();
      const location = {
        x: event.clientX - rect.left - 50,
        y: event.clientY - rect.top - 50
      };
      board.putSticky({ color: "khaki" }, location);
    }
  };
  const observer = {
    onStickyChange(id) {
      renderSticky(id, board.getSticky(id));
    },
    onBoardChange() {
      render();
    }
  };
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
    container = document.createElement("div");
    boardElement[stickyIdClass] = container;
    container.innerHTML =
      '<div class="sticky"><textarea class="textInput text" rows="1" tabindex="-1"></textarea></div>';
    boardElement.appendChild(container);
    container.classList.add(stickyIdClass);
    container.inputElement = container.querySelector(".textInput");
    container.sticky = container.querySelector(".sticky");
    container.classList.add("sticky-container");
    container.sticky.setAttribute("draggable", "true");
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
  console.log("fitting for " + textarea.value, new Error());
  textarea.rows = 1;
  textarea.style.fontSize = "1.5rem";
  let fontSize = 1.5;
  const wsMatches = textarea.value.match(/\s+/g);
  const numWhitespaces = wsMatches === null ? 0 : wsMatches.length;
  while (true) {
    let adjusted = false;
    if (textarea.rows < numWhitespaces || textarea.value.length > 15) {
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
