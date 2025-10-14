export const STICKY_TYPE = "application/sticky";
export const DEFAULT_STICKY_COLOR = "khaki";

/*
Things that need to move out:
 - domElement
 - selectedStickies
 - stickiesMovedByDragging
 - styles that determine positioning on the board
 - ondragstart
 - sorting
Things that need to be in:
 - text fitting
 - creating dom inside the container
 - 
*/

export const createRenderer = (
  board,
  domElement,
  getSelectedStickies,
  stickiesMovedByDragging
) =>
  function renderSticky(stickyId, sticky) {
    const selectedStickies = getSelectedStickies();
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
      const stickyIsSelected = !!selectedStickies.isSelected(stickyId);
      setStickyStyles(
        sticky,
        container,
        shouldAnimateMove,
        stickyIsSelected,
        board.getOrigin()
      );
      if (!shouldAnimateMove) {
        // mutate the global UI array instead of reassigning the local variable
        const index = stickiesMovedByDragging.indexOf(stickyId);
        if (index >= 0) {
          stickiesMovedByDragging.splice(index, 1);
        }
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
  };

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

function removePx(s) {
  return +s.substring(0, s.length - 2);
}
