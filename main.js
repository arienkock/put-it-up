import { mount } from "./render-to-dom.js";
import { Board } from "./board.js";
import { FirestoreStore } from "./network-firestore.js";

const store = new FirestoreStore()
const board = new Board(store)
mount(board, document.querySelector(".board-container"));
store.connect()
window.board = board