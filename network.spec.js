import { NetworkedBoard } from "./network-board";
import { EventLog } from "./event-log";
import { Board } from "./board";
import { LossyNetwork, PerfectNetwork } from "./network-stubs";

test("all state ends up the same PerfectNetwork", done => {
  testNetwork(PerfectNetwork, done);
});

test("all state ends up the same LossyNetwork", done => {
  testNetwork(LossyNetwork, done);
});

function testNetwork(Network, done) {
  const numGuests = 1;
  const numIterations = 1;
  const network = new Network();
  const { host, guests } = createSession(numGuests, network);
  simulate({ host, guests }, numIterations);
  network
    .wait()
    .then(() => {
      const hostLog = host.log.data;
      guests.forEach(guest => {
        expect(guest.log.data).toEqual(hostLog);
      });
      const hostState = host.getState();
      guests.forEach(guest => {
        expect(guest.getState()).toEqual(hostState);
      });
    })
    .then(done, done);
}

function createSession(numGuests, network) {
  const host = createNetworkedBoard(network, 0);
  const guests = [];
  for (let i = 0; i < numGuests; i++) {
    guests.push(createNetworkedBoard(network, i + 1));
  }
  return {
    host,
    guests
  };
}

function createNetworkedBoard(network, clientId) {
  const bm = new NetworkedBoard(new Board(), new EventLog(), network, clientId);
  bm.connect()
  const originalPutSticky = bm.putSticky;
  const knownIds = [];
  bm.putSticky = (...args) => {
    const id = originalPutSticky(...args);
    if (!knownIds.includes(id)) {
      knownIds.push(id);
    }
    return id;
  };
  bm.randomId = () => {
    return knownIds[randomInt(knownIds.length)];
  };
  return bm;
}

function simulate({ host, guests }, numIterations) {
  const participants = [host, ...guests];
  for (let i = 0; i < numIterations; i++) {
    const randomParticipant = participants[randomInt(participants.length)];
    const dice = randomInt(6) + 1;
    const stickyId = randomParticipant.randomId();
    if (dice === 1 || stickyId === undefined) {
      randomParticipant.putSticky(
        {
          text: randomInt(100) + " text"
        },
        randomLocation()
      );
    } else if (dice < 4) {
      randomParticipant.updateText(stickyId, randomInt(100) + " text");
    } else {
      randomParticipant.moveSticky(stickyId, randomLocation());
    }
  }
}

function randomLocation() {
  return {
    x: randomInt(7000),
    y: randomInt(7000)
  };
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}
