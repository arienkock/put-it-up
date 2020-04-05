export class PerfectNetwork {
  nodes = [];
  connect(node) {
    this.nodes.push(node);
  }
  broadcast(sender, message) {
    this.nodes.forEach(node => {
      if (node !== sender) {
        node.handleNetworkMessage(message);
      }
    });
  }
  wait() {
    return Promise.resolve(null);
  }
}

export class LossyNetwork {
  nodes = [];
  promises = [];
  connect(node) {
    this.nodes.push(node);
  }
  broadcast(sender, message) {
    this.nodes.forEach(node => {
      if (node !== sender) {
        this.promises.push(
          sleep(randomInt(10)).then(() => node.handleNetworkMessage(message))
        );
      }
    });
  }
  wait() {
    return Promise.all(this.promises);
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}
