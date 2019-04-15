class TGraph extends TComponent {
  constructor (id, name, color, values) {
    super();

    this.id = id;
    this.name = name;
    this.color = color;
    this.values = values;
    this.path = '';
    this.max = Math.max.apply(null, values);
    this.visible_ = true;
    this.mark_ = null;
    this.scale_ = [1, 1];
    this.translate_ = [0, 0];
    this.index_ = -1;
    this.markContainer_ = null;
  }

  renderTemplate (container, template) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    element.setAttribute('fill', 'transparent');
    element.setAttribute('vector-effect', 'non-scaling-stroke');
    container.appendChild(element);
    return element;
  }

  initDom () {
    this.element_.setAttribute('stroke', this.color);
    if(this.path) {
      this.setPath(this.path);
    }
  }

  setPath (path) {
    this.path = path;
    if (this.element_) {
      this.element_.setAttribute('d', this.path = path);
    }
  }

  setTransform (translateX, translateY, scaleX, scaleY) {
    this.translate_ = [translateX, translateY];
    this.scale_ = [scaleX, scaleY];
    this.element_.style.transform = `matrix(1, 0, 0, ${scaleY}, 0, 0)`;
  }

  clone () {
    const graph = new TGraph(this.id, this.name, this.color, this.values);
    graph.setPath(this.path);
    return graph;
  }

  show(value) {
    this.visible_ = value;
    this.element_.style.opacity = value ? '1' : '0';
    this.showMark(value);
  }

  isVisible() {
    return this.visible_;
  }

  createMark (index) {
    if (!this.mark_) {
      this.mark_ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.disableMarkTransition();
      this.mark_.setAttribute('class', 'tchart-graph-mark');
      this.mark_.setAttribute('stroke', this.color);
      this.markContainer_.appendChild(this.mark_);
      this.mark_.style.transformOrigin = '0px 0px';
      this.mark_.setAttribute('r', '0.3em');
      this.enableMarkTransition();
    }
    this.index_ = index;
    if (!this.isVisible()) {
      this.showMark(false);
    }
  }

  updateMark (maxY) {
    if (this.mark_) {
      const y = this.values[this.index_] / maxY * 100;
      this.mark_.style.transform = `translate(0%, ${y}%)`;
    }
  }

  removeMark () {
    if (this.mark_) {
      this.mark_.parentNode.removeChild(this.mark_);
      this.mark_ = null;
    }
  }

  showMark (value) {
    if (this.mark_) {
      this.mark_.style.opacity = value ? '1' : '0';
    }
  }

  setMarkContainer (element) {
    this.markContainer_ = element;
  }

  disableMarkTransition () {
    if (this.mark_) {
      this.mark_.style.transition = 'none';
    }
  }

  enableMarkTransition () {
    setTimeout(() => (this.mark_ && (this.mark_.style.transition = '')), 300);
  }

  getIndex () {
    return this.index_;
  }
}
TGraph.TEMPLATE = '';
TGraph.TEMPLATE_MARK = `<circle r="2" fill="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"></circle>`;
