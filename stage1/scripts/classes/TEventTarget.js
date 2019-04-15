class TEventTarget {
  constructor () {
    this.dom_ = document.createElement('div');
  }

  addEventListener (eventName, listener, capture) {
    this.dom_.addEventListener(eventName, listener, capture);
  }

  removeEventListener (eventName, listener, capture) {
    this.dom_.removeEventListener(eventName, listener, capture);
  }

  dispatchEvent (event) {
    this.dom_.dispatchEvent(event);
  }
}
