import { Board } from "./board.js";
import { mount } from "./render-to-dom.js";

const board = new Board();
const app = mount(board, document.querySelector(".board"));
for (let i = 0; i < 300; i++) {
  board.putSticky(
    { text: "Test ".repeat(Math.random() * 20), color: "khaki" },
    { x: Math.random() * 8000, y: Math.random() * 8000 }
  );
}
app.render();
