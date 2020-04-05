import { EventLog } from "../scripts/event-log.js";

it("ordering of event log", () => {
  const log = new EventLog();
  log.receiveEvent({
    sequence: 2,
    timestamp: 2,
    clientId: 1,
  });
  expect(log.data).toEqual([{ sequence: 2, timestamp: 2, clientId: 1 }]);
  log.receiveEvent({
    sequence: 2,
    timestamp: 1,
    clientId: 1,
  });
  expect(log.data).toEqual([
    { sequence: 2, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 2, clientId: 1 },
  ]);
  const eventsToCallback = [];
  log.forEachEventFrom(0, (event) => eventsToCallback.push(event));
  expect(eventsToCallback).toEqual([
    { sequence: 2, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 2, clientId: 1 },
  ]);
  log.receiveEvent({
    sequence: 1,
    timestamp: 1,
    clientId: 1,
  });
  expect(log.data).toEqual([
    { sequence: 1, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 2, clientId: 1 },
  ]);
  const returnedIndex = log.receiveEvent({
    sequence: 3,
    timestamp: 1,
    clientId: 1,
  });
  expect(log.data).toEqual([
    { sequence: 1, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 1, clientId: 1 },
    { sequence: 2, timestamp: 2, clientId: 1 },
    { sequence: 3, timestamp: 1, clientId: 1 },
  ]);
  expect(log.nextSequence()).toBe(4);
  expect(returnedIndex).toBe(3);
  log.discard(3);
  expect(() => log.forEachEventFrom(0)).toThrow();
  log.receiveEvent({
    sequence: 2,
    timestamp: 1,
    clientId: 1,
  });
  expect(log.data).toEqual([
    { sequence: 2, timestamp: 1, clientId: 1 },
    { sequence: 3, timestamp: 1, clientId: 1 },
  ]);
  const afterDiscard = [];
  log.forEachEventFrom(4, (event) => afterDiscard.push(event));
  expect(afterDiscard).toEqual([{ sequence: 3, timestamp: 1, clientId: 1 }]);
});