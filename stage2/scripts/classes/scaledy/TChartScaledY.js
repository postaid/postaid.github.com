class TChartScaledY extends TChart {

  constructor(title) {
    super(title);

    this.animMaxVisibles_ = [];
    this.animMinVisibles_ = [];
    this.prevMaxYs_ = [];
    this.prevMinYs_ = [];
  }

  draw(data) {
    setTimeout(() => {
      this.updateCanvasSize();
      this.parseColumns_(data);
      this.linesContainer_.parentNode.appendChild(this.linesContainer_);

      this.yAxis.forEach((graph, i) => {
        graph.setXAxis(this.xAxis);
        this.createButton_(graph, i);
        this.animMaxVisibles_.push(Utils.createAnimation(0, 300, 1, 1));
        this.animMinVisibles_.push(Utils.createAnimation(0, 300, 1, 1));
        this.prevMaxYs_[i] = -Infinity;
        this.prevMinYs_[i] = Infinity;
      });
      this.minimap_.setGraphs(this.yAxis);
      this.createDates_();
      this.createGraphlines();

      this.updateGraphScale(80, 20, true);
      this.minimap_.draw(0, true);
      const datesBorder = this.drawXValues_(0, true);
      if (datesBorder[0] !== this.prevMinDate_ || datesBorder[1] !== this.prevMaxDate_) {
        this.datesRangeFrom_.textContent = this.dates2_[datesBorder[0]][3] + ' - ' + this.dates2_[datesBorder[1]][3];
        this.prevMinDate_ = datesBorder[0];
        this.prevMaxDate_ = datesBorder[1];
        this.animDatesRange_.reset(1);
      }

      this.drawAll();

      this.applyTheme(this.theme_);
      this.needUpdateGraph_ = true;
    }, 200);
  }

  createMinimap_ (minimapWorkSpace) {
    this.minimap_ = new TChartMinimapScaledY(80, 20);
    this.minimap_.render(minimapWorkSpace);
    this.minimap_.addEventListener('input', this.handlerMinimapInput_.bind(this));
  }

  evalGraphsVisibles_ (time) {
    let redraw = false;
    this.animMaxVisibles_.forEach((anim) => {
      redraw = anim.eval(time) || redraw;
    });
    this.animMinVisibles_.forEach((anim) => {
      redraw = anim.eval(time) || redraw;
    });
    return redraw;
  }

  drawGraphs_ (time) {
    const mm = this.minimap_.getPosition();

    const height = this.height_ - (this.padding_.b + this.padding_.t);
    const width = this.width_ - (this.padding_.l + this.padding_.r);
    const ln = this.xAxis.length;

    let indexStart = (ln - 1) * mm.left / 100;
    let indexEnd = (ln - 1) * (mm.left + mm.width) / 100;
    const step = width / (indexEnd - indexStart);

    indexEnd += (this.padding_.l + this.padding_.r) / step;
    indexStart -= this.padding_.l / step;

    let leftIndex = Math.floor(indexStart);
    let rightIndex = Math.ceil(indexEnd);
    leftIndex = Math.max(leftIndex, 0);
    rightIndex = Math.min(rightIndex, ln - 1);

    const offsetLeft = (indexStart - leftIndex) * step;

    this.yAxis.forEach((graph, i) => {
      const maxY = this.animMaxVisibles_[i].v;
      const minY = this.animMinVisibles_[i].v;
      const scaleY = height / (maxY - minY);
      graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, this.padding_.t, this.selectedX_, null, false, 1, false, minY);
    });
  }

  updateGraphScale(left, width, noAnim) {
    const itemsCount = this.xAxis.length;
    const leftOffset = left / 100 * (itemsCount - 1);
    const rightOffset = (left + width) / 100 * (itemsCount - 1);
    const leftIndex = Math.ceil(leftOffset);
    const rightIndex = Math.floor(rightOffset);

    const preLeftIndex = Math.max(0, leftIndex - 1);
    const afterLastIndex = Math.min(itemsCount - 1, rightIndex + 1);

    let maxVisibles = [];
    let minVisibles = [];
    let needUpdateGraphLines = false;
    let updateTooltip = false;
    this.yAxis.forEach((graph, i) => {
      if (graph.isVisible()) {
        let maxVisible = -Infinity;
        let minVisible = Infinity;
        const leftVal = graph.values[preLeftIndex] + (graph.values[leftIndex] - graph.values[preLeftIndex]) * (1 - leftIndex + leftOffset);
        const rightVal = graph.values[rightIndex] + (graph.values[afterLastIndex] - graph.values[rightIndex]) * (rightOffset - rightIndex);

        maxVisible = Math.max(maxVisible, leftVal);
        maxVisible = Math.max(maxVisible, rightVal);

        minVisible = Math.min(minVisible, leftVal);
        minVisible = Math.min(minVisible, rightVal);

        const graphValues = graph.values.slice(leftIndex, rightIndex + 1);

        maxVisible = Math.max(
          maxVisible,
          Math.max.apply(null, graphValues)
        );
        minVisible = Math.min(
          minVisible,
          Math.min.apply(null, graphValues)
        );

        if (isFinite(maxVisible) && isFinite(minVisible)) {
          updateTooltip = true;
          if (this.prevMaxYs_[i] !== maxVisible) {
            needUpdateGraphLines = true;
            const anim = this.animMaxVisibles_[i];
            if (noAnim) {
              anim.reset(maxVisible);
            } else {
              anim.run(Date.now(), maxVisible);
            }
          }
          maxVisibles.push(maxVisible);

          if (this.prevMinYs_[i] !== minVisible) {
            needUpdateGraphLines = true;
            const anim = this.animMinVisibles_[i];
            if (noAnim) {
              anim.reset(minVisible);
            } else {
              anim.run(Date.now(), minVisible);
            }
          }
          minVisibles.push(minVisible);
          this.needUpdateGraph_ = true;
        }
      }
    });

    if (noAnim) {
      this.updateGraphLines(maxVisibles, minVisibles, noAnim);
    }

    if (needUpdateGraphLines) {
      this.delayedUpdateGraphLines_(maxVisibles, minVisibles, noAnim);
    }
    if (updateTooltip) {
      if (this.tooltip_) {
        const index = this.tooltip_.getIndex();
        if (index !== -1) {
          this.updateTooltip_(index, left, width);
        }
      }
    }

  }

  createGraphlines() {
    this.lines_ = [];
    this.disLines_ = [];
    this.groupLines_ = document.createElement('div');
    this.groupDisLines_ = document.createElement('div');
    for (let i = 0; i < 6; i++) {
      const line = this.createGraphLine();
      this.groupLines_.appendChild(line[2]);
      this.lines_.push(line);
      const disLine = this.createGraphLine();
      this.groupDisLines_.appendChild(disLine[2]);
      this.disLines_.push(disLine);
    }
    this.linesContainer_.appendChild(this.groupDisLines_);
    this.linesContainer_.appendChild(this.groupLines_);
  }

  createGraphLine () {
    const line = document.createElement('div');
    line.className = 'tchart-graph-line';
    const leftLabel = document.createElement('span');
    leftLabel.style.color = this.styles && this.styles[this.theme_].tooltip[0];
    const rightLabel = document.createElement('span');
    rightLabel.style.color = this.styles && this.styles[this.theme_].tooltip[1];
    rightLabel.className = 'tchart-graph-line-right';
    line.appendChild(leftLabel);
    line.appendChild(rightLabel);
    return [leftLabel, rightLabel, line];
  }

  updateGraphLines(maxVisibles, minVisibles, noAnim) {
    let lowChanges = true;
    let steps = [];
    let maxScale = -1;
    let maxScaleIndex = -1;
    for (let i = 0; i < maxVisibles.length; i++) {
      const maxY = maxVisibles[i];
      const minY = minVisibles[i];

      const deltaMinY = Math.abs(minY - this.prevMinYs_[i]) / minY;
      const deltaMaxY = Math.abs(maxY - this.prevMaxYs_[i]) / maxY;
      this.prevMaxYs_[i] = maxY;
      this.prevMinYs_[i] = minY;

      steps.push(Math.round((maxY - minY) / 6));
      const scale = this.yAxis[i].max / (maxY - minY);
      if (scale > maxScale) {
        maxScale = scale;
        maxScaleIndex = i;
      }

      if (deltaMaxY > .05 || deltaMinY > .05) {
        lowChanges = false;
      }
    }

    if (lowChanges) {
      if (this.groupDisLines_.style.opacity === '1') {
        this.disLines_.forEach((line, i) => {
          minVisibles.forEach((min, ix) => {
            line[ix].innerHTML = this.formatValue(min + i * steps[ix]);
          });
        });
      }
    } else {
      if (noAnim) {
        this.linesContainer_.style.transition = 'none';
        setTimeout(() => {this.linesContainer_.style.transition = ''}, 100);
      }
      this.linesContainer_.style.height = ((this.height_ - this.padding_.b - this.padding_.t) / this.pixelRatio_) * maxScale + 'px';

      this.groupDisLines_.style.opacity = '0';

      this.groupLines_.style.opacity = '1';
      this.lines_.forEach((line, i) => {
        line[2].style.bottom = i * steps[maxScaleIndex] / (maxVisibles[maxScaleIndex] - minVisibles[maxScaleIndex]) * 100 / maxScale + '%';
        minVisibles.forEach((min, ix) => {
          line[ix].innerHTML = this.formatValue(min + i * steps[ix]);
        });
      });

      if (this.timerSwitchLines_) {
        clearInterval(this.timerSwitchLines_);
      }
      this.timerSwitchLines_ = setTimeout(() => {
        const disLines = this.disLines_;
        this.disLines_ = this.lines_;
        this.lines_ = disLines;
        const gDisLines = this.groupDisLines_;
        this.groupDisLines_ = this.groupLines_;
        this.groupLines_ = gDisLines;
        this.timerSwitchLines_ = null;
      }, 300);

    }
 }

  handlerShowInputChange_(graph, index, ev) {
    const show = ev.checked;
    graph.show(show);
    const mm = this.minimap_.getPosition();
    this.updateGraphScale(mm.left, mm.width);

    this.lines_.forEach((line, i) => {
      const op = show ? '1' : '0';
      line[index].style.opacity = op;
      this.disLines_[i][index].style.opacity = op;
    });

    this.minimap_.showGraph(graph, show);
    if (this.tooltip_) {
      this.needUpdateTooltip_ = true;
      const index = this.tooltip_.getIndex();
      if (index !== -1) {
        this.updateTooltip_(index, -1, -1, true);
      }
    }
  }


}

TChartScaledY.TEMPLATE = TChart.TEMPLATE;
TChartScaledY.BUTTON_TEMPLATE = TChart.BUTTON_TEMPLATE;
