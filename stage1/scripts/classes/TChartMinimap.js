class TChartMinimap extends TComponent {

  constructor (left, width) {
    super();

    this.left_ = left;
    this.width_ = width;

    this.graphs_ = [];
    this.maxY_ = -1;
  }

  initDom () {
    this.eye_ = this.element_.getElementsByClassName('tchart-minimap-eye')[0];
    this.eye_.style.marginLeft = this.left_ + '%';
    this.eye_.style.marginRight = 100 - (this.left_ + this.width_) + '%';
    this.minimapBorderLeft_ = this.element_.getElementsByClassName('tchart-minimap-border-left')[0];
    this.minimapBorderRight_ = this.element_.getElementsByClassName('tchart-minimap-border-right')[0];
    this.svg_ = this.element_.getElementsByTagName('svg')[0];

    this.initEye_();
    this.initLeftBorder_();
    this.initRightBorder_();
  }

  initEye_ () {
    const ddEye = new DragDrop(this.eye_);
    ddEye.addEventListener('dragstart', this.handlerDragStart_.bind(this));
    ddEye.addEventListener('drag', this.handlerDragEye_.bind(this));
    ddEye.addEventListener('dragend', this.handlerDragEnd_.bind(this));
  }

  initLeftBorder_ () {
    const dragdrop = new DragDrop(this.minimapBorderLeft_);
    dragdrop.addEventListener('dragstart', this.handlerDragStart_.bind(this));
    dragdrop.addEventListener('drag', this.handlerLBDrag_.bind(this));
    dragdrop.addEventListener('dragend', this.handlerDragEnd_.bind(this));
  }

  initRightBorder_ () {
    const dragdrop = new DragDrop(this.minimapBorderRight_);
    dragdrop.addEventListener('dragstart', this.handlerDragStart_.bind(this));
    dragdrop.addEventListener('drag', this.handlerRBDrag_.bind(this));
    dragdrop.addEventListener('dragend', this.handlerDragEnd_.bind(this));
  }

  handlerDragStart_ () {
    this.dragData = {
      left: this.left_,
      width: this.width_
    };
    this.dispatchEvent(new Event('changestart'));
  }

  handlerDragEye_ (ev) {
    const width = this.element_.offsetWidth;
    let left = Math.max(this.dragData.left + ev.delta[0] / width * 100, 0);
    if (left + this.dragData.width > 100) {
      left = 100 - this.dragData.width;
    }
    this.eye_.style.marginLeft = left + '%';

    this.dragData.apply = {
      left,
      width: this.width_
    };

    this.dispatchInput();
  }

  handlerLBDrag_(ev) {
    const maxWidth = this.element_.offsetWidth;
    let left = Math.min(
      Math.max(
        this.dragData.left + ev.delta[0] / maxWidth * 100,
        0
      ),
      this.dragData.left + this.dragData.width
    );
    let width = this.dragData.width - (left - this.dragData.left);
    if (width < 10) {
      left -= 10 - width;
      width = 10;
    }

    this.eye_.style.marginLeft = left + '%';
    this.eye_.style.width = width + '%';
    this.dragData.apply = {
      left,
      width
    };

    this.dispatchInput();
  }

  handlerRBDrag_(ev) {
    const maxWidth = this.element_.offsetWidth;
    const width = Math.max(
      Math.min(this.dragData.width + ev.delta[0] / maxWidth * 100, 100 - this.dragData.left),
      10
    );

    this.eye_.style.width = width + '%';
    this.dragData.apply = {
      left: this.dragData.left,
      width
    };

    this.dispatchInput();
  }

  handlerDragEnd_ () {
    if (this.dragData.apply) {
      this.left_ = this.dragData.apply.left;
      this.width_ = this.dragData.apply.width;
    }
    this.dispatchChange();
  }

  dispatchChange () {
    const event = new Event('change');
    event.eyeLeft = this.left_;
    event.eyeWidth = this.width_;
    this.dispatchEvent(event);
  }

  dispatchInput () {
    if (this.dragData.apply) {
      const event = new Event('input');
      event.eyeLeft = this.dragData.apply.left;
      event.eyeWidth = this.dragData.apply.width;
      this.dispatchEvent(event);
    }
  }

  setGraphs (graphs) {
    this.graphs_ = [];
    graphs.forEach((graph) => {
      const g = graph.clone();
      g.render(this.svg_);
      this.graphs_.push(g);
    });
  }

  getPosition () {
    return {left: this.left_, width: this.width_};
  }

  showGraph (graph, value) {
    const id = graph.id;
    const mmGraph = this.graphs_.find(graph => graph.id === id);
    if (mmGraph) {
      mmGraph.show(value);
      this.updateScale();
    }
  }

  updateScale () {
    let maxValue = -Infinity;
    const graphs = this.graphs_.filter(graph => graph.isVisible());
    graphs.forEach((graph) => {
      if (graph.isVisible()) {
        maxValue = Math.max(maxValue, graph.max);
      }
    });

    const scale = this.maxY_ / maxValue;
    graphs.forEach(graph => graph.setTransform(0, 0, 1, scale));
  }

  setMaxY (value) {
    this.maxY_ = value;
  }
}

TChartMinimap.TEMPLATE =`
<div class="tchart-minimap">
  <div class="tchart-minimap-eye">
    <div class="tchart-minimap-border-left"></div>
    <div class="tchart-minimap-border-right"></div>
  </div>
  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 -1 100 102" stroke-width="1" stroke-linejoin="round"></svg>
</div>`;
