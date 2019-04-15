class TChartMinimapScaledY extends TChartMinimap {

  constructor (left, width, stacked) {
    super(left, width, stacked);
  }


  setGraphs (graphs) {
    this.graphs_ = [];
    graphs.forEach((graph) => {
      const g = graph.clone();
      g.ctx_ = this.ctx_;
      g.lineWidth = this.pixelRatio_;
      g.sumValues = this.sumValues;
      this.graphs_.push(g);
    });
    if (this.stacked_) {
      for (let i = 0; i < this.graphs_[0].values.length; i++) {
        this.emptyArray_[i] = 0;
      }
    }
    this.updateScale();
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
    }
    this.graphs_.forEach((graph) => {
      update = graph.updateAnimations(time) || update;
    });

    const height = this.size_[1] - (this.padding_.b + this.padding_.t);
    const width = this.size_[0] - (this.padding_.l + this.padding_.r);
    const ln = this.graphs_[0].xAxis_.length;
    const maxY = this.animMaxY_.v;
    const minY = 0;
    let step, leftIndex, rightIndex, offsetLeft, padding;
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

    if (update) {
      this.ctx_.clearRect(0, 0, this.size_[0], this.size_[1]);
      this.graphs_.forEach((graph) => {
        const scaleY = height / (graph.max - graph.min);
        graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, padding, -1, null, false, 1, false, graph.min);
      });
    }
  }
}

TChartMinimapScaledY.TEMPLATE = TChartMinimap.TEMPLATE;
