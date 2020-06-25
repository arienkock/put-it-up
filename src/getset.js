function getset(initialValue) {
  const callbacks = [];
  let value = initialValue;
  const getsetter = function (newValue) {
    if (arguments.length === 0) {
      return value;
    } else {
      value = newValue;
      callbacks.forEach((cb) => cb(value));
    }
  };
  getsetter.then = (transform) => {
    const next = getset();
    callbacks.push((value) => next(transform(value)));
    return next;
  };
  return getsetter;
}

module.exports = getset;
