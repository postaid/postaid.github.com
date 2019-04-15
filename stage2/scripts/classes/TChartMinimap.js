class TChartMinimap extends TComponent {

  constructor (left, width, stacked) {
    super();

    this.left_ = left;
    this.width_ = width;
    this.size_ = [0, 0];
    this.stacked_ = stacked;
    this.maxY_ = 0;
    this.padding_ = {t:0, r:0, b:0, l:0};

    this.graphs_ = [];
    this.animMaxY_ = Utils.createAnimation(0, 300, 0, 0);
    this.pixelRatio_ = window.devicePixelRatio;
    this.emptyArray_ = [];
    this.needDrawMinimap_ = false;
    this.maxWidth_ = 20;
    this.barChart_ = false;
  }

  initDom () {
    this.eye_ = this.element_.getElementsByClassName('tchart-minimap-eye')[0];
    this.eye_.style.width = this.width_ + '%';
    this.minimapBorderLeft_ = this.element_.getElementsByClassName('tchart-minimap-border-left')[0];
    this.minimapBorderRight_ = this.element_.getElementsByClassName('tchart-minimap-border-right')[0];
    this.minimapLeft_ = this.element_.getElementsByClassName('tchart-minimap-left')[0];
    this.minimapRight_ = this.element_.getElementsByClassName('tchart-minimap-right')[0];
    this.canvas_ = this.element_.getElementsByTagName('canvas')[0];
    this.ctx_ = this.canvas_.getContext('2d');

    this.initEye_();
    this.initLeftBorder_();
    this.initRightBorder_();

    window.addEventListener('resize', this.handlerResize_.bind(this));
    window.addEventListener('orientationchange', this.handlerResize_.bind(this));

    setTimeout(() => {
      this.handlerResize_();
    }, 200);
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

  updateLeft_ () {
    this.minimapLeft_.style.width = this.size_[0] / this.pixelRatio_ * this.left_ / 100 + 2 + 'px';
  }

  updateRight_ () {
    this.minimapRight_.style.width = this.size_[0] / this.pixelRatio_ * (100 - this.left_ - this.width_) / 100 + 2 + 'px';
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
    this.setEyePosition_(left);

    this.left_ = left;

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
    if (width < this.maxWidth_) {
      left -= this.maxWidth_ - width;
      width = this.maxWidth_;
    }

    this.setEyePosition_(left);
    this.setEyeWidth_(width);

    this.left_ = left;
    this.width_ = width;

    this.dispatchInput();
  }

  setEyePosition_(left) {
    this.eye_.style.transform = 'translate(' + this.size_[0] / this.pixelRatio_ * left / 100 + 'px, 0)';
  }

  setEyeWidth_ (width) {
    this.eye_.style.width = this.size_[0] / this.pixelRatio_ * width / 100 + 'px';
  }

  handlerRBDrag_(ev) {
    const maxWidth = this.element_.offsetWidth;
    const width = Math.max(
      Math.min(this.dragData.width + ev.delta[0] / maxWidth * 100, 100 - this.dragData.left),
      this.maxWidth_
    );

    this.eye_.style.width = width + '%';
    this.width_ = width;

    this.dispatchInput();
  }

  handlerDragEnd_ () {
    this.dispatchChange();
  }

  dispatchChange () {
    const event = new Event('change');
    event.eyeLeft = this.left_;
    event.eyeWidth = this.width_;
    this.dispatchEvent(event);
  }

  dispatchInput () {
    this.updateLeft_();
    this.updateRight_();

    const event = new Event('input');
    event.eyeLeft = this.left_;
    event.eyeWidth = this.width_;
    this.dispatchEvent(event);
  }

  setGraphs (graphs) {
    this.graphs_ = [];
    graphs.forEach((graph) => {
      const g = graph.clone();
      g.ctx_ = this.ctx_;
      g.lineWidth = this.pixelRatio_;
      g.sumValues = this.sumValues;
      this.graphs_.push(g);
      if (g.type === 'bar') {
        this.barChart_ = true;
      }

    });
    if (this.stacked_) {
      for (let i = 0; i < this.graphs_[0].values.length; i++) {
        this.emptyArray_[i] = 0;
      }
    }
    this.updateScale();
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

  draw (time, noAnim) {
    let update = this.needDrawMinimap_;
    this.needDrawMinimap_ = false;
    if (noAnim) {
      update = true;
      this.animMaxY_.v0 = this.animMaxY_.v1;
      this.animMaxY_.v = this.animMaxY_.v1;
    } else {
      update = this.animMaxY_.eval(time) || update;
    }
    this.graphs_.forEach((graph) => {
      update = graph.updateAnimations(time) || update;
    });

    if (update) {

      const height = this.size_[1] - (this.padding_.b + this.padding_.t);
      const width = this.size_[0] - (this.padding_.l + this.padding_.r);
      const ln = this.graphs_[0].xAxis_.length;
      const maxY = this.animMaxY_.v;
      const minY = 0;
      const scaleY = height / (maxY - minY);
      let step, leftIndex, rightIndex, offsetLeft, padding;
      if (this.barChart_) {
        const realWidth = width;
        offsetLeft = 0;

        step = realWidth / (ln);
        leftIndex = Math.max(Math.floor((-step - this.padding_.l - offsetLeft) / step), 0);
        rightIndex = Math.min(Math.ceil((width + this.padding_.r - offsetLeft) / step), ln - 1);

        padding = this.padding_;
      } else {

        let indexStart = 0;
        let indexEnd = (ln - 1);
        step = width / (indexEnd - indexStart);

        indexEnd += (this.padding_.l + this.padding_.r) / step;
        indexStart -= this.padding_.l / step;

        leftIndex = Math.floor(indexStart);
        rightIndex = Math.ceil(indexEnd);
        leftIndex = Math.max(leftIndex, 0);
        rightIndex = Math.min(rightIndex, ln - 1);

        offsetLeft = (indexStart - leftIndex) * step;
        padding = this.padding_.t;
      }

      this.clearCanvas(0, 0, this.size_[0], this.size_[1]);
      if (this.stacked_) {
        const subtract = this.emptyArray_.slice();
        const sumValues = this.emptyArray_.slice();
        const time = Date.now();
        let visibleGraphs = 0;
        this.graphs_.forEach((graph) => {
          graph.updateAnimations(time);
          const opacity = graph.animOpacity_.v;
          if (opacity) {
            for (let i = 0; i < sumValues.length; i++) {
              sumValues[i] += graph.values[i] * opacity;
            }
            ++visibleGraphs;
          }
        });
        let pass = 1;
        if (this.stacked_ || this.percentage) {
          pass = 2;
        }
        this.graphs_.forEach((graph) => {
          graph.sumValues = sumValues;
          graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, padding, -1, subtract, this.percentage, pass, visibleGraphs > 1);
        });
      } else {
        let min = Infinity;
        this.graphs_.forEach((graph) => {
          min = Math.min(min, graph.min);
        });
        this.graphs_.forEach((graph) => {
          graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, padding, -1, null, false, 1, false, min);
        });
      }
    }
  }

  updateScale () {
    let maxValue;
    if (this.stacked_) {
      maxValue = 0;
      let values = null;
      this.graphs_.forEach((graph) => {
        if (graph.isVisible()) {
          if (!values) {
            values = graph.values.slice();
          } else {
            for (let i = 0; i < values.length; i++) {
              values[i] += graph.values[i];
            }
          }
        }
      });
      maxValue = Math.max.apply(null, values);
      if (!maxValue) {
        maxValue = -Infinity;
      }
    } else {
      maxValue = -Infinity;
      this.graphs_.forEach((graph) => {
        if (graph.isVisible()) {
          maxValue = Math.max(maxValue, graph.max);
        }
      });
    }

    if (isFinite(maxValue)) {
      this.animMaxY_.run(Date.now(), maxValue);
    }
  }

  setMaxY (value) {
    this.updateScale();
  }

  setColors (colors) {
    this.graphs_.forEach((graph, i) => {
      graph.color = colors[i];
    });
    this.needDrawMinimap_ = true;
  }

  updateCanvasSize () {
    const b = this.canvas_.getBoundingClientRect();
    this.size_ = [
      b.width * this.pixelRatio_,
      b.height * this.pixelRatio_
    ];
    this.canvas_.setAttribute('width', this.size_[0]);
    this.canvas_.setAttribute('height', this.size_[1]);
  }

  handlerResize_ () {
    this.updateCanvasSize();
    this.setEyePosition_(this.left_);
    this.setEyeWidth_(this.width_);
    this.updateLeft_();
    this.updateRight_();
    this.needDrawMinimap_ = true;
  }

  clearCanvas (x, y, w, h) {
    this.ctx_.clearRect(x, y, w, h);
  }
}

TChartMinimap.TEMPLATE =`
<div class="tchart-minimap">
  <div style="height: 100%; border-radius: 0.5em; overflow: hidden; position: relative;">
    <div class="tchart-minimap-left"></div>
    <div class="tchart-minimap-right"></div>
    <canvas></canvas>
  </div>
  <div class="tchart-minimap-eye">
    <div class="tchart-minimap-border-left"></div>
    <div class="tchart-minimap-border-right"></div>
  </div>
</div>`;
