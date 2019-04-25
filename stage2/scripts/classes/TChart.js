class TChart extends TComponent {

  constructor(title) {
    super();
    this.xAxis = null;
    this.yAxis = null;
    this.maxY_ = -Infinity;
    this.lines_ = [];
    this.prevMaxY_ = -1;
    this.prevMinY_ = -1;
    this.tooltip_ = null;
    this.theme_ = 0;
    this.title_ = title;
    this.pixelRatio_ = window.devicePixelRatio;
    this.width_ = 0;
    this.height_ = 0;
    this.animMaxVisible_ = Utils.createAnimation(0, 300, 0, 0);
    this.animMinVisible_ = Utils.createAnimation(0, 300, 0, 0);
    this.animXMark_ = Utils.createAnimation(0, 200, 0, 0);
    this.animDatesRange_ = Utils.createAnimation(0, 200, 1, 1);
    this.fontSize_ = 14;
    this.styles = null;
    this.padding_ = {
      t: 5 * this.pixelRatio_,
      r: 20 * this.pixelRatio_,
      b: 35 * this.pixelRatio_,
      l: 20 * this.pixelRatio_,
    };
    this.selectedX_ = -1;
    this.needUpdateGraph_ = false;
    this.themeColors_ = TChart.THEMES[this.theme_][2];
    this.swapGraphLines_ = false;
    this.buttons_ = [];
    this.prevMinDate_ = -1;
    this.prevMaxDate_ = -1;
    this.barChart_ = false;

    this.delayedUpdateGraphLines_ = Utils.throttle(this.updateGraphLines, this, 300);
  }

  initDom() {
    this.canvas_ = this.element_.getElementsByTagName('canvas')[0];
    this.ctx_ = this.canvas_.getContext('2d');
    this.header_ = this.element_.getElementsByClassName('tchart-header')[0];
    this.element_.getElementsByClassName('tchart-caption')[0].innerHTML = this.title_;
    this.svgWorkspace_ = this.element_.getElementsByClassName('tchart-svg-workspace')[0];
    this.datesRangeFrom_ = this.element_.getElementsByClassName('tchart-range-from')[0];
    this.datesRangeTo_ = this.element_.getElementsByClassName('tchart-range-to')[0];

    this.toolbar_ = this.element_.getElementsByClassName('tchart-toolbar')[0];
    this.linesContainer_ = this.element_.getElementsByClassName('tchart-graph-lines')[0];

    const minimapWorkSpace = this.element_.getElementsByClassName('tchart-minimap-workspace')[0];

    this.createMinimap_(minimapWorkSpace);

    window.addEventListener('resize', this.handlerResize_.bind(this));
    window.addEventListener('orientationchange', this.handlerResize_.bind(this));
    document.addEventListener('mouseup', this.hideTooltip.bind(this));
    document.addEventListener('touchend', this.hideTooltip.bind(this));
    const dd = new DragDrop(this.canvas_, true);
    dd.addEventListener('drag', this.handlerSVGMouseMove_.bind(this, true));
    dd.addEventListener('dragend', this.handlerSVGMouseMove_.bind(this, false));

    if (this.percentage) {
      this.swapGraphLines_ = true;
    }
  }

  createMinimap_ (minimapWorkSpace) {
    this.minimap_ = new TChartMinimap(80, 20, this.stacked);
    this.minimap_.percentage = this.percentage;
    this.minimap_.render(minimapWorkSpace);
    this.minimap_.addEventListener('input', this.handlerMinimapInput_.bind(this));
  }

  draw(data) {
    setTimeout(() => {
      if (this.percentage) {
        this.padding_.t = 0;
      }
      this.updateCanvasSize();
      this.parseColumns_(data);
      if (this.swapGraphLines_) {
        this.linesContainer_.parentNode.appendChild(this.linesContainer_);
      }
      if (this.barChart_ || this.stacked || this.percentage) {
        this.minimap_.getElement().classList.add('bordered');
      }

      const createButtons = this.yAxis.length > 1;
      this.yAxis.forEach((graph, i) => {
        graph.setXAxis(this.xAxis);
        if (createButtons) {
          this.createButton_(graph, i);
        }
      });
      this.minimap_.setGraphs(this.yAxis);
      this.createDates_();
      this.createGraphlines();

      const mm = this.minimap_.getPosition();
      this.updateGraphScale(mm.left, mm.width, true);
      this.minimap_.draw(0, true);
      const datesBorder = this.drawXValues_(0, true);
      if (datesBorder[0] !== this.prevMinDate_ || datesBorder[1] !== this.prevMaxDate_) {
        this.datesRangeFrom_.textContent = this.dates2_[datesBorder[0]][3] + ' - ' + this.dates2_[datesBorder[1]][3];
        this.prevMinDate_ = datesBorder[0];
        this.prevMaxDate_ = datesBorder[1];
        this.animDatesRange_.reset(1);
      }

      this.applyTheme(this.theme_);

      this.drawAll();
      this.needUpdateGraph_ = true;
    }, 200);
  }

  drawAll() {
    const time = Date.now();
    this.ctx_.font = this.fontSize_ * this.pixelRatio_ + 'px Arial';

    if (this.needUpdateGraphScale_) {
      const mm = this.minimap_.getPosition();
      this.updateGraphScale(mm.left, mm.width);
      this.needUpdateGraphScale_ = false;
    }

    let redraw = this.needUpdateGraph_;
    let visibles = this.evalGraphsVisibles_(time);
    redraw = visibles || redraw;
    this.yAxis.forEach((graph) => {
      redraw = graph.updateAnimations(time, this.needUpdateGraph_, visibles || this.resetGraphXMark_) || redraw;
    });
    this.resetGraphXMark_ = false;

    if (this.selectedX_ !== -1) {
      redraw = this.animXMark_.eval(time) || redraw;
    }

    if (redraw) {
      this.clearCanvas(0, 0, this.width_, this.height_ - this.padding_.b + 3 * this.pixelRatio_);
      if (this.stacked || this.barChart_) {
        this.drawGraphs_(time);
        this.drawXMark_(time);
      } else {
        this.drawXMark_(time);
        this.drawGraphs_(time);
      }
    }
    this.needUpdateGraph_ = false;

    for (let i = 0; !redraw && i < this.datesLayers2_.length; i++) {
      const dateLayer = this.datesLayers2_[i];
      redraw = dateLayer.o.eval(time) || redraw ;
    }
    if (redraw) {
      const datesBorder = this.drawXValues_(time);
      if (datesBorder[0] !== this.prevMinDate_ || datesBorder[1] !== this.prevMaxDate_) {
        this.datesRangeFrom_.textContent = this.datesRangeTo_.textContent;
        this.datesRangeTo_.textContent = this.dates2_[datesBorder[0]][3] + ' - ' + this.dates2_[datesBorder[1]][3];
        if (this.animDatesRange_.v === 1) {
          this.animDatesRange_.reset(0);
          this.animDatesRange_.run(time, 1);
        }
        this.prevMinDate_ = datesBorder[0];
        this.prevMaxDate_ = datesBorder[1];
      }
    }
    if (this.animDatesRange_.eval(time)) {
      this.drawDatesRange_();
    }

    this.minimap_.draw(time);
    if (this.tooltip_) {
      if (this.needUpdateTooltip_) {
        this.updateTooltip_(this.selectedX_, -1, -1);
        this.needUpdateTooltip_ = false;
      }
      this.tooltip_.draw(time);
    }

    window.requestAnimationFrame(() => this.drawAll());
  }

  evalGraphsVisibles_ (time) {
    let visibles = false;
    visibles = this.animMaxVisible_.eval(time) || visibles;
    if (this.minYVisible) {
      visibles = this.animMinVisible_.eval(time) || visibles;
    }
    return visibles;
  }

  drawGraphs_ (time) {
    const mm = this.minimap_.getPosition();

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
      graph.draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, padding, this.selectedX_, null, false, 0, false, minY);
    });
  }

  createDates_() {
    const months = {};
    const count = this.xAxis.length - 1;
    const maxLayer = Math.floor(Math.log2(count));
    const layers2 = [];
    const dates2 = [];
    this.xAxis.forEach((x, i) => {
      const xDate = new Date(x);
      const month = xDate.getMonth();
      if (!months[month]) {
        months[month] = xDate.toLocaleString('en-us', {month: 'short'});
      }
      const date = xDate.getDate();
      const year = xDate.getFullYear();
      const value = months[month] + ' ' + date;
      const fullValue = date + ' ' + months[month] + ' ' + year;
      const left = i / count;
      let lg = this.getLayerIndex(i, maxLayer);
      dates2.push([left, value, x, fullValue]);

      let layer2 = layers2[lg];
      if (!layer2) {
        layer2 = layers2[lg] = {
          o: Utils.createAnimation(0, 200, 1, 1),
          i: []
        }
      }
      layer2.i.push(i);
    });
    this.dates2_ = dates2;
    this.datesLayers2_ = layers2;
  }

  drawXValues_(time, noAnim) {
    const mm = this.minimap_.getPosition();
    const leftBorder = (this.xAxis.length - 1) * mm.left / 100;
    const leftIndex = Math.floor(leftBorder);
    const rightIndex = leftIndex + Math.ceil((this.xAxis.length - 1) * mm.width / 100);

    this.clearCanvas(0, this.height_ - this.padding_.b + 3 * this.pixelRatio_, this.width_, this.height_);
    this.ctx_.fillStyle = this.styles && this.styles[this.theme_].xAxisText ? this.styles[this.theme_].xAxisText : this.themeColors_.textColor;
    this.ctx_.textBaseline = 'bottom';

    const top = this.height_ - this.padding_.b + 21 * this.pixelRatio_;
    const visibleLayer = this.getVisibleLayerIndex();
    const width = (this.width_ - this.padding_.l - this.padding_.r) / mm.width * 100;
    const l = -width * mm.left / 100 + this.padding_.l;

    let minDate = Infinity;
    let maxDate = -Infinity;
    // debugger;
    let minDateI = leftIndex;
    let maxDateI = rightIndex;
    let textW = 58 * this.pixelRatio_ / 2;
    this.datesLayers2_.forEach((layer, i) => {
      const opacity = (i >= visibleLayer) * 1;
      if (noAnim) {
        layer.o.reset(opacity);
      }
      if (layer.o.v1 !== opacity) {
        layer.o.run(time, opacity);
      }
      layer.o.eval(time);
      if (layer.o.v) {
        this.ctx_.globalAlpha = layer.o.v;
        layer.i.forEach((index) => {
          const dateObj = this.dates2_[index];
          let needDraw = index >= leftIndex && index <= rightIndex;
          let dateOffset = dateObj[0] * width;
          if (!needDraw && (l + dateOffset + textW > 0 && dateOffset < width * (mm.left + mm.width) / 100 - this.padding_.r - this.padding_.l)) {
            needDraw = true;
          }
          if (needDraw) {
            this.ctx_.fillText(dateObj[1], l + dateOffset, top);
/*
            if (minDate > dateObj[2]) {
              minDate = dateObj[2];
              minDateI = index;
            }
            if (maxDate < dateObj[2]) {
              maxDate = dateObj[2];
              maxDateI = index;
            }
*/
          }
        });
      }
    });
    this.clearCanvas(0, this.height_ - this.padding_.b + 3 * this.pixelRatio_, this.padding_.l, this.height_);
    this.clearCanvas(this.width_ - this.padding_.r, this.height_ - this.padding_.b + 3 * this.pixelRatio_, this.padding_.r, this.height_);
    return [minDateI, maxDateI];
  }

  drawDatesRange_ () {
    const v = this.animDatesRange_.v;
    this.datesRangeFrom_.style.transform = `translate(0, ${-0.6 * v}em) scale(${1 - v * 0.5})`;
    this.datesRangeFrom_.style.opacity = 1 - v;
    this.datesRangeTo_.style.transform = `translate(0, ${0.6 * (1 - v)}em) scale(${v * 0.5 + 0.5})`;
    this.datesRangeTo_.style.opacity = v;
  }

  getVisibleLayerIndex() {
    const mm = this.minimap_.getPosition();
    const dateWidth = 58 * this.pixelRatio_;
    const containerWidth = (this.width_ - this.padding_.l - this.padding_.r) / mm.width * 100;

    let check = 0;
    for (let i = 1; i < this.dates2_.length; i += 1) {
      if (i % (1 << check) === 0) {
        const dateObj = this.dates2_[i];
        const left = dateObj[0];
        const xCoord = left * containerWidth;
        if (xCoord < dateWidth) {
          check += 1;
        } else {
          break;
        }
      }
    }
    return check;
  }

  getLayerIndex(index, maxLayer) {
    for (let i = maxLayer; i >= 0; i--) {
      if (!(index % (2 ** i))) {
        return i;
      }
    }
    return 0;
  }

  createButton_(graph, index) {
    const button = new TGraphButton(graph.name);
    button.render(this.toolbar_);
    button.setColor((this.styles && this.styles[this.theme_].button[index]) || graph.color);
    button.addEventListener('change', this.handlerShowInputChange_.bind(this, graph, index));
    button.addEventListener('longtap', this.handlerButtonLongTap_.bind(this, index));
    this.buttons_.push(button);
  }

  parseColumns_(data) {
    const yAxis = [];
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
      }
    });
    this.yAxis = yAxis;
    if (this.styles) {
      yAxis.forEach((graph, i) => {
        graph.color = this.styles[this.theme_].graph[i];
      });
    }
  }

  handlerMinimapInput_(ev) {
    const mm = this.minimap_.getPosition();
    this.needUpdateGraphScale_ = true;
    this.needUpdateGraph_ = true;
    this.resetGraphXMark_ = true;
    if (this.tooltip_) {
      this.tooltip_.hide();
      this.selectedX_ = -1;
    }
  };

  updateGraphScale(left, width, noAnim) {
    const itemsCount = this.xAxis.length;
    const leftOffset = left / 100 * (itemsCount - 1);
    const rightOffset = (left + width) / 100 * (itemsCount - 1);
    const leftIndex = Math.ceil(leftOffset);
    const rightIndex = Math.floor(rightOffset);

    const preLeftIndex = Math.max(0, leftIndex - 1);
    const afterLastIndex = Math.min(itemsCount - 1, rightIndex + 1);

    let maxVisible = -Infinity;
    let minVisible = Infinity;
    this.yAxis.forEach((graph) => {
      if (graph.isVisible()) {
        const leftVal = Math.round(graph.values[preLeftIndex] + (graph.values[leftIndex] - graph.values[preLeftIndex]) * (1 - leftIndex + leftOffset));
        const rightVal = Math.round(graph.values[rightIndex] + (graph.values[afterLastIndex] - graph.values[rightIndex]) * (rightOffset - rightIndex));

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
      }
    });

    if (isFinite(maxVisible) && isFinite(minVisible)) {
       if (this.tooltip_) {
         this.needUpdateTooltip_ = true;
      }

      let updateLines = false;
      if (this.minYVisible && this.prevMinY_ !== minVisible) {
        if (noAnim) {
          this.animMinVisible_.v0 = minVisible;
          this.animMinVisible_.v1 = minVisible;
          this.animMinVisible_.v = minVisible;
        } else {
          this.animMinVisible_.run(Date.now(), minVisible);
        }
        updateLines = true;
      }

      if (this.prevMaxY_ !== maxVisible) {
        if (noAnim) {
          this.animMaxVisible_.v0 = maxVisible;
          this.animMaxVisible_.v1 = maxVisible;
          this.animMaxVisible_.v = maxVisible;
        } else {
          this.animMaxVisible_.run(Date.now(), maxVisible);
        }
        updateLines = true;
      }
      if (updateLines) {
        this.delayedUpdateGraphLines_(maxVisible, minVisible, noAnim);
      }

      this.needUpdateGraph_ = true;
    }
  }

  createGraphlines() {
    if (this.percentage) {
      this.lines_ = [];
      for (let i = 0; i < 5; i++) {
        const line = document.createElement('div');
        line.className = 'tchart-graph-line';
        line.innerHTML = i * 25;
        line.style.opacity = '1';
        line.style.bottom = i * 25 + '%';
        this.lines_.push(line);
        this.linesContainer_.appendChild(line);
      }
      this.svgWorkspace_.style.overflow = 'visible';
      this.linesContainer_.style.top = '0px';
      this.linesContainer_.style.height = 'auto';
    } else {
      this.lines_ = [];
      this.disLines_ = [];
      this.groupLines_ = document.createElement('div');
      this.groupDisLines_ = document.createElement('div');
      for (let i = 0; i < 6; i++) {
        const line = document.createElement('div');
        line.className = 'tchart-graph-line';
        this.groupLines_.appendChild(line);
        this.lines_.push(line);
        const disLine = document.createElement('div');
        disLine.className = 'tchart-graph-line';
        this.groupDisLines_.appendChild(disLine);
        this.disLines_.push(disLine);
      }
      this.linesContainer_.appendChild(this.groupDisLines_);
      this.linesContainer_.appendChild(this.groupLines_);
    }
  }

  updateGraphLines(maxY, minY, noAnim) {
    if (this.percentage) {
      return;
    }
    let deltaMinY = 0;
    if (!this.minYVisible) {
      minY = 0;
    } else {
      deltaMinY = Math.abs(minY - this.prevMinY_) / minY;
    }

    const deltaMaxY = Math.abs(maxY - this.prevMaxY_) / maxY;
    this.prevMaxY_ = maxY;
    this.prevMinY_ = minY;
    const step = Math.round((maxY - minY) / 6);
    const scale = this.maxY_ / (maxY - minY);

    if (deltaMaxY < .05 && deltaMinY < .05) {
      if (this.groupDisLines_.style.opacity === '1') {
        this.disLines_.forEach((line, i) => {
          line.innerHTML = this.formatValue(minY + i * step);
        });
      }
    } else {
      if (noAnim) {
        this.linesContainer_.style.transition = 'none';
        setTimeout(() => {this.linesContainer_.style.transition = ''}, 100);
      }
      const height = ((this.height_ - this.padding_.b - this.padding_.t) / this.pixelRatio_) * scale;
      this.linesContainer_.style.height = height + 'px';

      this.groupDisLines_.style.opacity = '0';

      this.groupLines_.style.opacity = '1';
      this.lines_.forEach((line, i) => {
        line.style.bottom = i * step / (maxY - minY) * 100 / scale + '%';
        line.innerHTML = this.formatValue(minY + i * step);
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

  formatValue (value) {
    if (value > 1e9) {
      return (value / 1e9).toFixed(2) + 'B';
    } else if (value > 1e6) {
      return (value / 1e6).toFixed(2) + 'M';
    } else if (value > 1e3) {
      return (value / 1e3).toFixed(2) + 'K';
    }
    return value;
  }

  handlerShowInputChange_(graph, index, ev) {
    const show = ev.checked;
    graph.show(show);
    const mm = this.minimap_.getPosition();
    this.updateGraphScale(mm.left, mm.width);

    this.minimap_.showGraph(graph, show);
    if (this.tooltip_) {
      this.needUpdateTooltip_ = true;
      const index = this.tooltip_.getIndex();
      if (index !== -1) {
        this.updateTooltip_(index, -1, -1, true);
      }
    }
  }

  handlerButtonLongTap_(index) {
    this.yAxis.forEach((graph, i) => {
      if (i === index) {
        graph.show(true);
        this.minimap_.showGraph(graph, true);
        this.buttons_[i].input.checked = true;
      } else {
        graph.show(false);
        this.minimap_.showGraph(graph, false);
        this.buttons_[i].input.checked = false;
      }
    });
    const mm = this.minimap_.getPosition();
    this.updateGraphScale(mm.left, mm.width);
    if (this.tooltip_ && this.selectedX_ !== -1) {
      this.tooltip_.setValues(this.yAxis, this.styles && this.styles[this.theme_].tooltip || [], this.selectedX_, this.percentage);
    }
  }

  hideTooltip(ev) {
    let el = ev.target;
    while (el && el.tagName !== 'BODY') {
      if (el === this.svgWorkspace_ || el.className === 'tchart-show-graph' || el.className === 'theme-switcher') {
        return;
      }
      el = el.parentNode;
    }
    this.handlerSVGMouseLeave_();
  }

  handlerSVGMouseMove_(noAnim, ev) {
    if (ev.type === 'dragend') {
      this.isCanvasDragging_ = false;
    }
    if(ev.type === 'drag' && Math.abs(ev.delta[0]) < 1 && Math.abs(ev.delta[1]) < 1) {
      noAnim = false;
    }
    if (ev.type !== 'dragend' && (Math.abs(ev.delta[0]) < Math.abs(ev.delta[1])) && ev.nativeEvent === 'touchmove') {
      return;
    }
    ev = ev.nativeEvent;
    if (ev.touches) {
      ev = ev.touches[0];
    }
    this.isCanvasDragging_ = true;
    const b = this.canvas_.getBoundingClientRect();
    const mm = this.minimap_.getPosition();

    const x = (ev.pageX - b.left) * this.pixelRatio_;
    if (x < 0 || x > this.width_)
      return;

    const width = this.width_ - (this.padding_.l + this.padding_.r);
    let ln;
    if (this.barChart_) {
      ln = this.xAxis.length;
    } else {
      ln = this.xAxis.length - 1;
    }

    let indexStart = ln * mm.left / 100;
    let indexEnd = ln * (mm.left + mm.width) / 100;
    const step = width / (indexEnd - indexStart);

    indexStart -= this.padding_.l / step;
    let leftIndex = Math.floor(indexStart);
    leftIndex = Math.max(leftIndex, 0);

    const offsetLeft = (indexStart - leftIndex) * step;
    let index;
    if (this.barChart_)
      index = Math.floor((x + step * leftIndex + offsetLeft) / step);
    else
      index = Math.round((x + step * leftIndex + offsetLeft) / step);

    if (index < 0 || index > this.xAxis.length - 1) {
      return;
    }

    const prevX = this.selectedX_;
    this.selectedX_ = index;
    this.updateXMark_(prevX, noAnim);
    this.drawTooltip_(index);
    this.needUpdateGraph_ = true;
    this.resetGraphXMark_ = noAnim;
  }

  drawTooltip_(index) {
    if (!this.tooltip_) {
      this.tooltip_ = new TChartTooltip(this.percentage || this.stacked ? 10 / this.pixelRatio_ : 0);
      this.tooltip_.render(this.svgWorkspace_);
      this.tooltip_.getElement().style.transition = 'none';
      setTimeout(() => {this.tooltip_.getElement().style.transition = '';}, 100);
      this.resetGraphXMark_ = true;
    }
    this.needUpdateTooltip_ = true;
  }

  updateTooltip_(index, left, width, force) {
    if (this.stacked || this.barChart_)
      this.updateTooltipStacked_(index, left, width, force);
    else
      this.updateTooltipPoints_(index, left, width, force);
  }

  updateTooltipStacked_ (index, left, width, force) {
    if (this.tooltip_ && this.selectedX_ !== -1) {
      if (this.tooltip_.getIndex() !== index) {
        this.tooltip_.setDate(this.xAxis[index]);
        this.tooltip_.setValues(this.yAxis, this.styles && this.styles[this.theme_].tooltip || [], index, this.percentage);
      } else if (force) {
        this.tooltip_.setValues(this.yAxis, this.styles && this.styles[this.theme_].tooltip || [], index, this.percentage);
      }

      const mm = this.minimap_.getPosition();

      const width = this.width_ - (this.padding_.l + this.padding_.r);
      let ln;
      if (this.barChart_)
        ln = this.xAxis.length;
      else
        ln = this.xAxis.length - 1;

      let indexStart = ln * mm.left / 100;
      let indexEnd = ln * (mm.left + mm.width) / 100;
      const step = width / (indexEnd - indexStart);

      indexStart -= this.padding_.l / step;
      let leftIndex = Math.floor(indexStart);
      leftIndex = Math.max(leftIndex, 0);

      const offsetLeft = (indexStart - leftIndex) * step;
      let x = (step * (index - leftIndex) - offsetLeft);

      let l;
      const tooltipWidth = this.tooltip_.getElement().offsetWidth;
      if (this.barChart_ && !this.stacked) {
        l = x / this.pixelRatio_ - tooltipWidth / 2 + step / this.pixelRatio_ / 2;
        if (l + tooltipWidth > this.width_ / this.pixelRatio_) {
          l = this.width_ / this.pixelRatio_ - tooltipWidth;
        } else if (l < 0) {
          l = 0;
        }
      } else {
        l = (x + step) / this.pixelRatio_ + 10;

        if (l + tooltipWidth > this.width_ / this.pixelRatio_) {
          l = x / this.pixelRatio_ - tooltipWidth - 10;
        }
        if (l < 2)
          l = 2;
      }
      this.tooltip_.show();
      this.tooltip_.setPosition(l);
    }
  }

  updateTooltipPoints_ (index, left, width, force) {
    if (this.tooltip_ && this.selectedX_ !== -1) {
      if (this.tooltip_.getIndex() !== index) {
        this.tooltip_.setDate(this.xAxis[index]);
        this.tooltip_.setValues(this.yAxis, this.styles && this.styles[this.theme_].tooltip || [], index, this.percentage);
      } else if (force) {
        this.tooltip_.setValues(this.yAxis, this.styles && this.styles[this.theme_].tooltip || [], index, this.percentage);
      }

      const containerWidth = this.svgWorkspace_.offsetWidth;
      const position = this.minimap_.getPosition();
      left = left !== -1 ? left : position.left;
      width = width !== -1 ? width : position.width;

      const graphWidth = containerWidth / (width / 100);
      const graphLeft = graphWidth * left / 100;
      const step = 1 / (this.xAxis.length - 1);
      const xVal = index * step * graphWidth;
      let l = xVal - graphLeft;

      if (l < 0 || l > containerWidth) {
        this.tooltip_.hide();
      } else {
        this.tooltip_.show();
        const tooltipWidth = this.tooltip_.getElement().offsetWidth;
        l -= tooltipWidth / 2;
        if (l + tooltipWidth > containerWidth) {
          l = containerWidth - tooltipWidth;
        } else if (l < 0) {
          l = 0;
        }
        this.tooltip_.setPosition(Math.round(l) + this.padding_.l / this.pixelRatio_ / 2);
      }
    }
  }

  removeTooltip_() {
    if (this.tooltip_) {
      this.tooltip_.destroy();
      this.tooltip_ = null;
    }
  }

  updateXMark_ (prevX, force) {
    if (~this.selectedX_ && (prevX !== this.selectedX_ || force)) {
      const mm = this.minimap_.getPosition();

      const width = this.width_ - (this.padding_.l + this.padding_.r);
      let ln;
      if (this.barChart_)
        ln = this.xAxis.length;
      else
        ln = this.xAxis.length - 1;

      let indexStart = ln * mm.left / 100;
      let indexEnd = ln * (mm.left + mm.width) / 100;
      const step = width / (indexEnd - indexStart);

      indexStart -= this.padding_.l / step;
      let leftIndex = Math.floor(indexStart);
      leftIndex = Math.max(leftIndex, 0);

      const offsetLeft = (indexStart - leftIndex) * step;
      const x = Utils.toInt(step * (this.selectedX_ - leftIndex) - offsetLeft);
      if (prevX === -1 || force) {
        this.animXMark_.reset(x);
      } else {
        this.animXMark_.run(Date.now(), x);
      }
    }
  }

  drawXMark_() {
    if (~this.selectedX_) {
      const x = Utils.toInt(this.animXMark_.v);
      if (this.barChart_) {
        let mm = this.minimap_.getPosition();
        let width = this.width_ - (this.padding_.l + this.padding_.r);
        const realWidth = width / mm.width * 100;
        const ln = this.xAxis.length;
        const rectW = Utils.toInt(realWidth / ln);
        this.ctx_.fillStyle = this.styles && this.styles[this.theme_].overlay || 'blue';
        this.ctx_.beginPath();
        this.ctx_.rect(0, 0, x, this.height_ - this.padding_.b);
        this.ctx_.fill();
        this.ctx_.beginPath();
        this.ctx_.rect(x + rectW, 0, this.width_ - x - rectW, this.height_ - this.padding_.b);
        this.ctx_.fill();
      } else {
        this.ctx_.lineWidth = this.themeColors_.xLineWidth * this.pixelRatio_;
        this.ctx_.strokeStyle = this.themeColors_.lineColor;
        this.ctx_.beginPath();
        this.ctx_.moveTo(x, this.padding_.t);
        this.ctx_.lineTo(x, this.height_ - this.padding_.b);
        this.ctx_.stroke();
      }
    }
  }

  handlerSVGMouseLeave_() {
    this.removeTooltip_();
    this.selectedX_ = -1;
    this.yAxis.forEach((graph) => {
      graph.selectedX_ = -1;
    });
    this.needUpdateGraph_ = true;
  }

  handlerResize_() {
    setTimeout(() => {
      this.updateCanvasSize();
      const mm = this.minimap_.getPosition();
      this.updateGraphScale(mm.left, mm.width);
      this.needUpdateGraph_ = true;
      if (this.tooltip_) {
        this.needUpdateTooltip_ = true;
      }
      this.updateXMark_(this.selectedX_, true);
    }, 200);
  }

  handlerThemeSwitcher_() {
    let newTheme = this.theme_ + 1;
    if (newTheme >= TChart.THEMES.length) {
      newTheme = 0;
    }
    const event = new Event('theme');
    event.theme = newTheme;
    this.dispatchEvent(event);
  }

  applyTheme(themeId) {
    const theme = TChart.THEMES[themeId];
    if (theme) {
      this.theme_ = themeId;
      this.themeColors_ = theme[2];
      this.needUpdateGraph_ = true;
      this.yAxis.forEach((graph, i) => {
        graph.setColors(this.themeColors_);
        graph.color = this.styles[themeId].graph[i];
        if (this.styles && this.buttons_[i]) {
          this.buttons_[i].setColor(this.styles[themeId].button[i]);
        }
      });
      this.minimap_.setColors(this.styles[themeId].graph);
      if (this.styles && this.styles[themeId].yAxisText) {
        this.linesContainer_.style.color = this.styles[themeId].yAxisText;
      }
      if (this.styles && this.styles[themeId].headerPadding) {
        this.header_.style.marginBottom = this.styles[themeId].headerPadding;
      }
    }
  }

  updateCanvasSize() {
    const w = this.canvas_.clientWidth * this.pixelRatio_;
    const h = this.canvas_.clientHeight * this.pixelRatio_;
    if (this.width_ !== w || this.height_ !== h) {
      this.width_ = w;
      this.height_ = h;
      this.canvas_.setAttribute('width', this.width_);
      this.canvas_.setAttribute('height', this.height_);
      return true;
    }
    return false;
  }

  clearCanvas (x, y, w, h) {
    this.ctx_.clearRect(x, y, w, h);
  }
}

TChart.THEMES = [
  [
    'theme-day', 'Switch to Night Mode',
    {
      background: '#ffffff',
      textColor: '#8E8E93',
      lineColor: 'rgba(24, 45, 59, 0.1)',
      xLineWidth: 1,
    }
  ],
  [
    'theme-night', 'Switch to Day Mode',
    {
      background: '#232f3d',
      textColor: 'rgba(163, 177, 194, 0.6)',
      lineColor: 'rgba(255, 255, 255, 0.1)',
      xLineWidth: 1,
    }
  ],
];


TChart.TEMPLATE = `
<div class="tchart-container">
  <div class="tchart-header">
    <div class="tchart-caption"></div>
    <div class="tchart-range">
      <span class="tchart-range-from"></span>
      <span class="tchart-range-to"></span>
    </div>
  </div>
  <div class="tchart-svg-workspace">
    <div class="tchart-graph-lines"></div>
    <canvas class="tchart-canvas"></canvas>
  </div>
  <div class="tchart-minimap-workspace"></div>
  <div class="tchart-toolbar"></div>
</div>
`;

TChart.TypeToGraph = {
  line: TGraph,
  bar: TGraphBar,
};
