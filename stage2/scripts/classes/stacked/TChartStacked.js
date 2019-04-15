class TChartStacked extends TChart {

  constructor(title) {
    super(title);
    this.emptyArray_ = [];
  }

  parseColumns_(data) {
    const yAxis = [];
    const sumValues = [];
    data.columns.forEach((column) => {
      const colId = column[0];
      const colData = column.slice(1);
      const colType = data.types[colId];
      if (colType === 'x') {
        this.xAxis = colData;
      } else {
        const graph = new (TChart.TypeToGraph[colType] || TGraph)(colId, data.names[colId], data.colors[colId], colData, this.ctx_);
        yAxis.push(graph);
        this.maxY_ = Math.max(this.maxY_, graph.max);
        if (colType === 'bar') {
          this.swapGraphLines_ = true;
          this.barChart_ = true;
        }
        if (this.percentage) {
          graph.sumValues = sumValues;
          for (let i = 0; i < colData.length; i++) {
            sumValues[i] = (sumValues[i] || 0) + colData[i];
          }
        }
      }
    });
    this.yAxis = yAxis;
    for (let i = 0; i < this.xAxis.length; i++) {
      this.emptyArray_[i] = 0;
    }
    this.minimap_.sumValues = sumValues;
  }

  drawGraphs_ () {
    const mm = this.minimap_.getPosition();
    let subtract = this.emptyArray_.slice();
    const sumValues = this.emptyArray_.slice();
    const time = Date.now();
    let visibleGraphs = 0;
    this.yAxis.forEach((graph) => {
      graph.updateAnimations(time);
      const opacity = graph.animOpacity_.v;
      if (opacity) {
        for (let i = 0; i < sumValues.length; i++) {
          sumValues[i] += graph.values[i] * opacity;
        }
        ++visibleGraphs;
      }
    });

    const height = this.height_ - (this.padding_.b + this.padding_.t);
    const width = this.width_ - (this.padding_.l + this.padding_.r);
    const ln = this.xAxis.length;
    const maxY = this.animMaxVisible_.v;
    const minY = this.animMinVisible_.v || 0;
    const scaleY = height / (maxY - minY);
    let step, leftIndex, rightIndex, offsetLeft, padding;
    if (this.barChart_) {
      const realWidth = width / mm.width * 100;
      offsetLeft = -realWidth * mm.left / 100;

      step = realWidth / (ln);
      leftIndex = Math.max(Math.floor((-step - this.padding_.l - offsetLeft) / step), 0);
      rightIndex = Math.min(Math.ceil((width + this.padding_.r - offsetLeft) / step), ln - 1);

      padding = this.padding_;
    } else {

      let indexStart = (ln - 1) * mm.left / 100;
      let indexEnd = (ln - 1) * (mm.left + mm.width) / 100;
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
    this.yAxis.forEach((graph) => {
      graph.sumValues = sumValues;
      graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, padding, this.selectedX_, subtract, this.percentage, 1, visibleGraphs > 1);
    });
  }

  updateGraphScale(left, width, noAnim) {
    const itemsCount = this.xAxis.length;
    const leftOffset = left / 100 * (itemsCount - 1);
    const rightOffset = (left + width) / 100 * (itemsCount - 1);
    const leftIndex = Math.ceil(leftOffset);
    const rightIndex = Math.floor(rightOffset);

    let values = null;
    this.yAxis.forEach((graph) => {
      if (graph.isVisible()) {
        if (!values) {
          values = graph.values.slice(leftIndex, rightIndex + 1);
        } else {
          for (let i = 0; i < values.length; i++) {
            values[i] += graph.values[i + leftIndex];
          }
        }
      }
    });
    let maxVisible = Math.max.apply(null, values);

    if (isFinite(maxVisible)) {
      if (this.tooltip_) {
        const index = this.tooltip_.getIndex();
        if (index !== -1) {
          this.updateTooltip_(index, left, width);
        }
      }

      if (this.prevMaxY_ !== maxVisible) {
        if (noAnim) {
          this.animMaxVisible_.v0 = maxVisible;
          this.animMaxVisible_.v1 = maxVisible;
          this.animMaxVisible_.v = maxVisible;
        } else {
          this.animMaxVisible_.run(Date.now(), maxVisible);
        }

        this.updateGraphLines(maxVisible, noAnim);
      }
      this.needUpdateGraph_ = true;
    }
  }
}

TChartStacked.TEMPLATE = TChart.TEMPLATE;
TChartStacked.BUTTON_TEMPLATE = TChart.BUTTON_TEMPLATE;
