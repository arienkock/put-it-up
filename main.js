import { mount } from "./render-to-dom.js";
import { Board, ObservableBoard } from "./board.js";
import { FirestoreStore } from "./network-firestore.js";

const store = new FirestoreStore()
const board = new Board(store)
mount(board, document.querySelector(".board"));
store.connect()
window.board = board