import { mount } from "./render-to-dom.js";
import { NetworkedBoard } from "./network-board.js";
import { EventLog } from "./event-log.js";
import { FirestoreNetwork } from "./network-firestore.js";
import { Board, ObservableBoard } from "./board.js";

const board = new NetworkedBoard(new ObservableBoard(new Board()), new EventLog, new FirestoreNetwork(), Math.random());
mount(board, document.querySelector(".board"));
board.connect()
// for (let i = 0; i < 3; i++) {
//   board.putSticky(
//     { text: "Test ".repeat(Math.random() * 20), color: "khaki" },
//     { x: Math.random() * 8000, y: Math.random() * 8000 }
//   );
// }
window.board = board