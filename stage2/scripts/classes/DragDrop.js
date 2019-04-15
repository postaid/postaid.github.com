class DragDrop extends TEventTarget {
  constructor (element, noPrevent) {
    super();
    this.element_ = element;
    this.handlers_ = {
      drag: this.handlerDrag_.bind(this),
      dragEnd: this.handlerDragEnd_.bind(this),
    };
    this.x0 = 0;
    this.y0 = 0;
    this.noPrevent_ = noPrevent;
    this.attachDragStartEvents();
  }

  attachDragStartEvents () {
    this.element_.addEventListener('mousedown', this.handlerDragStart_.bind(this));
    this.element_.addEventListener('touchstart', this.handlerDragStart_.bind(this));
  }

  attachDragEvents () {
    document.addEventListener('mousemove', this.handlers_.drag, true);
    document.addEventListener('mouseup', this.handlers_.dragEnd, true);
    document.addEventListener('touchmove', this.handlers_.drag, true);
    document.addEventListener('touchend', this.handlers_.dragEnd, true);
  }

  detachDragEvents () {
    document.removeEventListener('mousemove', this.handlers_.drag, true);
    document.removeEventListener('mouseup', this.handlers_.dragEnd, true);
    document.removeEventListener('touchmove', this.handlers_.drag, true);
    document.removeEventListener('touchend', this.handlers_.dragEnd, true);
  }

  handlerDragStart_ (ev) {
    if (!this.noPrevent_) {
      ev.stopPropagation();
      ev.preventDefault();
    }

    const event = new Event('dragstart');
    event.nativeEvent = ev;
    this.dispatchEvent(event);
    if (ev.touches) {
      ev = ev.touches[0];
    }
    this.x0 = ev.pageX;
    this.y0 = ev.pageY;
    this.attachDragEvents();
  }

  handlerDrag_ (ev) {
    if (ev.touches) {
      ev = ev.touches[0];
    }
    const event = new Event('drag');
    event.delta = [ev.pageX - this.x0, ev.pageY - this.y0];
    event.nativeEvent = ev;
    this.dispatchEvent(event);
  }

  handlerDragEnd_ (ev) {
    this.detachDragEvents();
    const event = new Event('dragend');
    event.nativeEvent = ev;
    this.dispatchEvent(event);
  }
}
