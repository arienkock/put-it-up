function assertValid(event) {
  if (typeof event.sequence !== "number") {
    throw new Error("sequence is either missing or NaN: " + event.sequence);
  }
  if (typeof event.timestamp !== "number") {
    throw new Error("timestamp is either missing or NaN: " + event.sequence);
  }
  if (typeof event.clientId !== "number") {
    throw new Error("clientId is either missing or NaN: " + event.sequence);
  }
}

export function EventLog() {
  this.data = [];
  let highestSequence = 0;
  let numDiscarderEvents = 0;

  const isCongruentAt = (event, index) => {
    const prevItem = this.data[index - 1];
    return (
      index === 0 ||
      prevItem.sequence < event.sequence ||
      (prevItem.sequence === event.sequence &&
        prevItem.timestamp < event.timestamp) ||
      (prevItem.sequence === event.sequence &&
        prevItem.timestamp === event.timestamp &&
        prevItem.clientId < event.clientId)
    );
  };

  const rightPlace = event => {
    for (let index = this.data.length; index >= 0; index--) {
      if (isCongruentAt(event, index)) {
        return index;
      }
    }
  };

  this.receiveEvent = event => {
    assertValid(event);
    highestSequence = Math.max(highestSequence, event.sequence);
    const index = rightPlace(event);
    this.data.splice(index, 0, event);
    return index + numDiscarderEvents;
  };

  this.forEachEventFrom = (index, callback, maxIndex) => {
    index -= numDiscarderEvents;
    if (index < 0) {
      throw new Error("Log history does not go that far back: " + index);
    }
    maxIndex = maxIndex === undefined ? this.data.length : maxIndex - numDiscarderEvents;
    for (let i = index; i < maxIndex; i++) {
      callback(this.data[i]);
    }
  };

  this.discard = numToDiscard => {
    numDiscarderEvents += numToDiscard;
    this.data.splice(0, numToDiscard);
  };

  this.nextSequence = () => highestSequence + 1;
}
