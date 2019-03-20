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
    this.ratio_ = 1;
    this.scale_ = [1, 1];
    this.markContainer_ = null;
    this.markRadius_ = 8;
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
    this.scale_ = [scaleX, scaleY];
    this.element_.style.transform = `matrix(1, 0, 0, ${scaleY}, ${translateX}, ${translateY * scaleY})`;
    if (this.mark_) {
      this.mark_.style.transform = `scale(${1/scaleX * this.ratio_}, ${1/scaleY})`;
    }
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

  drawMarkAt (x, y) {
    if (!this.mark_) {
      this.mark_ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      this.mark_.setAttribute('class', 'tchart-graph-mark');
      this.mark_.setAttribute('stroke', this.color);
      this.mark_.setAttribute('r', '0.07em');
      this.mark_.style.transition = 'none';
      setTimeout(() => (this.mark_ && (this.mark_.style.transition = '')),300);
      this.markContainer_.appendChild(this.mark_);
      this.markRadius_ = parseFloat(window.getComputedStyle(this.mark_).borderTopLeftRadius);
    }
    this.mark_.setAttribute('cx', x);
    this.mark_.setAttribute('cy', y);
    this.mark_.style.transformOrigin = `${x}px ${y}px`;
    this.mark_.style.transform = `scale(${1/this.scale_[0] * this.ratio_}, ${1/this.scale_[1]})`;
    this.mark_.setAttribute('r', this.markRadius_ / this.element_.viewportElement.clientHeight * 100);
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

  getMark () {
    return this.mark_ || null;
  }

  setAspectRatio (ratio) {
    this.ratio_ = ratio;
    if (this.mark_) {
      this.mark_.style.transform = `scale(${1/this.scale_[0] * this.ratio_}, ${1/this.scale_[1]})`;
      this.mark_.setAttribute('r', this.markRadius_ / this.element_.viewportElement.clientHeight * 100);
    }
  }

  setMarkContainer (element) {
    this.markContainer_ = element;
  }
}
TGraph.TEMPLATE = '';
TGraph.TEMPLATE_MARK = `<circle r="2" fill="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke"></circle>`;
