class DragDrop extends TEventTarget {
  constructor (element) {
    super();
    this.element_ = element;
    this.handlers_ = {
      drag: this.handlerDrag_.bind(this),
      dragEnd: this.handlerDragEnd_.bind(this),
    };
    this.x0 = 0;
    this.y0 = 0;
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
    ev.stopPropagation();
    ev.preventDefault();

    this.dispatchEvent(new Event('dragstart'));
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
    this.dispatchEvent(event);
  }

  handlerDragEnd_ () {
    this.detachDragEvents();
    this.dispatchEvent(new Event('dragend'));
  }
}
