export function EventLog() {
  this.data = [];
  let highestSequence = 0;
  let numDiscarderEvents = 0;

  const isCongruentAt = (event, index) => {
    return (
      index === 0 ||
      this.data[index - 1].sequence < event.sequence ||
      (this.data[index - 1].sequence === event.sequence &&
        this.data[index - 1].timestamp < event.timestamp)
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
    maxIndex = maxIndex || this.data.length
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
