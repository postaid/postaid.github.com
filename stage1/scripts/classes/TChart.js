class TChart extends TComponent {

  constructor (title) {
    super();
    this.svg_ = null;
    this.xAxis = null;
    this.yAxis = null;
    this.maxY_ = -Infinity;
    this.dates_ = [];
    this.datesLayers_ = [];
    this.lines_ = [];
    this.prevMaxY_ = -1;
    this.xMark_ = null;
    this.tooltip_ = null;
    this.theme_ = 0;
    this.title_ = title;
  }

  initDom () {
    this.svgWorkspace_ = this.element_.getElementsByClassName('tchart-svg-workspace')[0];
    this.svg_ = this.element_.getElementsByClassName('tchart-svg')[0];
    this.svg_.addEventListener('mousemove', this.handlerSVGMouseMove_.bind(this));
    this.svgWorkspace_.addEventListener('mouseleave', this.handlerSVGMouseLeave_.bind(this));
    this.svgPath_ = this.svg_.getElementsByClassName('tchart-svg-path')[0];
    this.svgMarks_ = this.svg_.getElementsByClassName('tchart-svg-mark')[0];
    this.svgGraphMarks_ = this.element_.getElementsByClassName('tchart-svg-marks-move')[0];
    this.element_.getElementsByClassName('tchart-header')[0].innerHTML = this.title_;

    this.toolbar_ = this.element_.getElementsByClassName('tchart-toolbar')[0];
    this.datesContainer_ = this.element_.getElementsByClassName('tchart-dates')[0];
    this.linesContainer_ = this.element_.getElementsByClassName('tchart-graph-lines')[0];
    this.themeSwitcher_ = this.element_.getElementsByClassName('theme-switcher')[0];
    this.themeSwitcher_.addEventListener('click', this.handlerThemeSwitcher_.bind(this));

    const minimapWorkSpace = this.element_.getElementsByClassName('tchart-minimap-workspace')[0];

    this.minimap_ = new TChartMinimap(0, 100);
    this.minimap_.render(minimapWorkSpace);
    this.minimap_.addEventListener('input', this.handlerMinimapInput_.bind(this));

    window.addEventListener('resize', this.handlerResize_.bind(this));
    window.addEventListener('orientationchange', this.handlerResize_.bind(this));
  }

  draw (data) {
    this.svgPath_.innerHTML = '';
    this.svgMarks_.innerHTML = '';
    this.parseColumns_(data);
    this.yAxis.forEach((graph) => {
      TChart.drawGraph(graph, this.maxY_);
      this.createButton_(graph);
    });
    this.minimap_.setGraphs(this.yAxis);
    this.minimap_.setMaxY(this.maxY_);
    this.createDates_();
    this.createGraphlines();
    this.updateDatesVisibility();
    this.updateGraphLines(this.maxY_);
    this.setTheme(this.theme_);
  }

  createDates_ () {
    this.dates_ = [];
    const months = {};
    const count = this.xAxis.length - 1;
    const dates = [];
    const layers = [];
    const maxLayer = Math.floor(Math.log2(count));
    this.xAxis.forEach((x, i) => {
      const date = document.createElement('span');
      date.className = 'tchart-dates-item';
      const xDate = new Date(x);
      const month = xDate.getMonth();
      if (!months[month]) {
        months[month] = xDate.toLocaleString('en-us', { month: 'short' });
      }
      date.innerHTML = months[month] + ' ' + xDate.getDate();
      const left = i / count * 100;
      date.style.left = left.toFixed(2) + '%';
      dates.push([x, left, date]);
      let lg = this.getLayerIndex(i, maxLayer);
      let layer = layers[lg];
      if (!layer) {
        layer = layers[lg] = document.createElement('div');
        layer.className = 'tchart-dates-layer';
        this.datesContainer_.appendChild(layer);
      }
      layer.appendChild(date);
    });
    this.dates_ = dates;
    this.datesLayers_ = layers;
  }


  getLayerIndex (index, maxLayer) {
    for (let i = maxLayer; i >= 0; i--) {
      if (!(index % (1 << i))) {
        return i;
      }
    }
    return 0;
  }

  createButton_ (graph) {
    const button = this.renderTemplate(
      this.toolbar_,
      TChart.BUTTON_TEMPLATE
        .replace('{{NAME}}', graph.name)
        .replace(/{{COLOR}}/g, graph.color)
    );
    const input = button.getElementsByTagName('input')[0];
    input.addEventListener('change', this.handlerShowInputChange_.bind(this, graph));
  }

  parseColumns_ (data) {
    const yAxis = [];
    const ratio = this.svg_.clientHeight / this.svg_.clientWidth;
    data.columns.forEach((column) => {
      const colId = column[0];
      const colData = column.slice(1);
      const colType = data.types[colId];
      if (colType === 'x') {
        this.xAxis = colData;
      } else if (colType === 'line') {
        const graph = new TGraph(colId, data.names[colId], data.colors[colId], colData);
        graph.render(this.svgPath_);
        graph.setMarkContainer(this.svgGraphMarks_);
        graph.setTransform(0, 0, 1, 1);
        yAxis.push(graph);
        this.maxY_ = Math.max(this.maxY_, graph.max);
      }
    });
    this.yAxis = yAxis;
  }

  handlerMinimapInput_ (ev) {
    const left = ev.eyeLeft;
    const width = ev.eyeWidth;
    this.updateGraphScale(left, width);
  };

  updateGraphScale (left, width) {
    const itemsCount = this.xAxis.length;
    const leftOffset = left / 100 * (itemsCount - 1);
    const rightOffset = (left + width) / 100 * (itemsCount - 1);
    const leftIndex = Math.ceil(leftOffset);
    const rightIndex = Math.floor(rightOffset);

    const preLeftIndex = Math.max(0, leftIndex - 1);
    const afterLastIndex = Math.min(itemsCount - 1, rightIndex + 1);

    let maxVisible = -Infinity;
    this.yAxis.forEach((graph) => {
      if (graph.isVisible()) {
        const leftVal = graph.values[preLeftIndex] + (graph.values[leftIndex] - graph.values[preLeftIndex]) * (1 - leftIndex + leftOffset);
        const rightVal = graph.values[rightIndex] + (graph.values[afterLastIndex] - graph.values[rightIndex]) * (rightOffset - rightIndex);

        maxVisible = Math.max(maxVisible, leftVal);
        maxVisible = Math.max(maxVisible, rightVal);

        maxVisible = Math.max(
          maxVisible,
          Math.max.apply(null, graph.values.slice(leftIndex, rightIndex + 1))
        );
      }
    });

    if (isFinite(maxVisible)) {
      let scaleY = this.maxY_ / maxVisible;
      let scaleX = 100 / width;
      let translateX = -left;
      let translateY = 0;
      this.svgPath_.style.transform = `matrix(${scaleX}, 0, 0, 1, ${translateX * scaleX}, ${translateY})`;

      const index = this.yAxis[0].getIndex();
      this.yAxis.forEach((graph) => {
        graph.setTransform(translateX, translateY, scaleX, scaleY);
        graph.updateMark(maxVisible);
      });
      const x = (index / (this.xAxis.length - 1) * 100 + translateX) * scaleX;
      this.svgMarks_.style.transform = `translate(${x}px, 0px)`;
      this.svgGraphMarks_.style.transform = `translate(${x}%, 0%)`;

      this.datesContainer_.style.width = 100 * scaleX + '%';
      this.datesContainer_.style.transform = `translate(${translateX}%, 0)`;

      this.updateDatesVisibility();
      throttle(this.updateGraphLines, [maxVisible], this, 100);
      if (this.tooltip_) {
        const index = this.tooltip_.getIndex();
        if (index !== -1) {
          this.updateTooltip_(index, left, width);
        }
      }
    }
  }

  createGraphlines () {
    this.lines_ = [];
    this.disLines_ = [];
    for (let i=0; i< 6; i++) {
      const line = document.createElement('div');
      line.className = 'tchart-graph-line';
      this.linesContainer_.appendChild(line);
      this.lines_.push(line);
      const disLine = document.createElement('div');
      disLine.className = 'tchart-graph-line';
      this.linesContainer_.appendChild(disLine);
      this.disLines_.push(disLine);
    }
  }

  updateGraphLines (maxY) {
    if (this.prevMaxY_ === maxY) {
      return;
    }

    const deltaMaxY = Math.abs(maxY - this.prevMaxY_) / this.maxY_;
    this.prevMaxY_ = maxY;
    const step = Math.round(maxY / 6);

    if (deltaMaxY < .1) {
      this.lines_.forEach((line, i) => {
        line.innerHTML = i * step;
      });
    } else {
      const scale = this.maxY_ / maxY;
      this.linesContainer_.style.height = 100 * scale + '%';

      this.disLines_.forEach(line => {
        line.style.opacity = '0';
      });

      this.lines_.forEach((line, i) => {
        line.style.bottom = i * step / maxY * 100 / scale + '%';
        line.style.opacity = '1';
        line.innerHTML = i * step;
      });

      if (this.timerSwitchLines_) {
        clearInterval(this.timerSwitchLines_);
      }
      this.timerSwitchLines_ = setTimeout(() => {
        const disLines = this.disLines_;
        this.disLines_ = this.lines_;
        this.lines_ = disLines;
        this.timerSwitchLines_ = null;
      }, 300);
    }
  }

  updateDatesVisibility () {
    if (!this.dates_.length) {
      return;
    }
    const dateWidth = this.dates_[0][2].offsetWidth;
    const containerWidth = this.datesContainer_.offsetWidth;

    let check = 0;
    for (let i = 1; i < this.dates_.length; i += 1) {
      if (i % (1 << check) === 0) {
        const dateObj = this.dates_[i];
        const left = dateObj[1];
        const xCoord = left / 100 * containerWidth;
        if (xCoord < dateWidth) {
          check += 1;
        } else {
          break;
        }
      }
    }

    this.datesLayers_.forEach((layer, i) => {
      layer.style.opacity = (i >= check) * 1;
    });
  }

  static drawGraph (graph, maxY) {
    let x = 0;
    const step = 100 / (graph.values.length - 1);
    const percents = 100 / maxY;
    let path = `M ${x},${graph.values[0] * percents}`;
    x += step;
    for (let i = 1; i < graph.values.length; i++, x += step) {
      path += ` L${x},${graph.values[i] * percents}`;
    }
    graph.setPath(path);
  }

  handlerShowInputChange_ (graph, ev) {
    const show = ev.currentTarget.checked;
    graph.show(show);
    const mm = this.minimap_.getPosition();
    this.updateGraphScale(mm.left, mm.width);

    this.minimap_.showGraph(graph, show);
    if (this.tooltip_) {
      const index = this.tooltip_.getIndex();
      if (index !== -1) {
        this.updateTooltip_(index, -1, -1);
      }
    }

  }

  handlerSVGMouseMove_ (ev) {
    const offsetX = ev.offsetX;
    const mmPosition = this.minimap_.getPosition();
    const left = mmPosition.left;
    const width = mmPosition.width;

    const w = this.svg_.clientWidth * 100 / width;
    const l = w * left / 100 + offsetX;
    const x = l / w;

    const step = 1 / (this.xAxis.length - 1);
    const index = Math.round(x / step);
    this.drawXMark_();

    let scaleX = 100 / width;
    let translateX = -left;

    this.yAxis.forEach((graph) => {
      graph.createMark(index);
      graph.disableMarkTransition();
      graph.updateMark(this.prevMaxY_);
      graph.enableMarkTransition();
    });
    const markOffsetLeft = (index / (this.xAxis.length - 1) * 100 + translateX) * scaleX;
    this.svgMarks_.style.transform = `translate(${markOffsetLeft}px, 0px)`;
    this.svgGraphMarks_.style.transform = `translate(${markOffsetLeft}%, 0%)`;
    this.drawTooltip_(index);
  }

  drawTooltip_ (index) {
    if (!this.tooltip_) {
      this.tooltip_ = new TChartTooltip();
      this.tooltip_.render(this.svgWorkspace_);
    }
    this.updateTooltip_(index, -1, -1);
  }

  updateTooltip_ (index, left, width) {
    if (this.tooltip_) {
      if (this.tooltip_.getIndex() !== index) {
        this.tooltip_.setDate(this.xAxis[index]);
        this.tooltip_.setValues(this.yAxis, index);
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

      if (l < 2 || l > containerWidth - 2) {
        this.tooltip_.hide();
        this.xMark_ && (this.xMark_.style.opacity = '0');
      } else {
        this.tooltip_.show();
        this.xMark_ && (this.xMark_.style.opacity = '1');
        l -= 40;
        const tooltipWidth = this.tooltip_.getElement().offsetWidth;
        if (l + tooltipWidth > containerWidth) {
          l = containerWidth - tooltipWidth;
        } else if (l < 2) {
          l = 2;
        }
        this.tooltip_.setPosition(l);
      }
    }
  }

  removeTooltip_ () {
    if (this.tooltip_) {
      this.tooltip_.destroy();
      this.tooltip_ = null;
    }
  }

  drawXMark_ () {
    if (!this.xMark_) {
      this.xMark_ = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      this.xMark_.setAttribute('class', 'tchart-xmark');
      this.xMark_.setAttribute('y1', '-5');
      this.xMark_.setAttribute('y2', '90');
      this.svgMarks_.appendChild(this.xMark_);
    }
  }

  removeXMark_ () {
    if (this.xMark_) {
      this.svgMarks_.removeChild(this.xMark_);
      this.xMark_ = null;
    }
  }

  handlerSVGMouseLeave_ () {
    this.yAxis.forEach((graph) => graph.removeMark());
    this.removeXMark_();
    this.removeTooltip_();
  }

  handlerResize_ () {
    this.updateDatesVisibility();
    if (this.tooltip_) {
      const index = this.tooltip_.getIndex();
      if (index !== -1) {
        this.updateTooltip_(index, -1, -1);
      }
    }
  }

  handlerThemeSwitcher_ () {
    let newTheme = this.theme_ + 1;
    if (newTheme >= TChart.THEMES.length) {
      newTheme = 0;
    }
    this.setTheme(newTheme);
  }

  setTheme (themeId) {
    const theme = TChart.THEMES[themeId];
    if (theme) {
      this.theme_ = themeId;
      document.body.className = theme[0];
      this.themeSwitcher_.innerHTML = theme[1];

      const event = new Event('theme');
      event.theme = this.theme_;
      this.dispatchEvent(event);
    }
  }

  applyTheme (themeId) {
    const theme = TChart.THEMES[themeId];
    if (theme) {
      this.theme_ = themeId;
      this.themeSwitcher_.innerHTML = theme[1];
    }
  }
}

TChart.THEMES = [
  ['theme-day', 'Switch to Night Mode'],
  ['theme-night', 'Switch to Day Mode'],
];

TChart.TEMPLATE = `
<div class="tchart-container">
  <div class="tchart-header"></div>
  <div class="tchart-svg-workspace">
    <div class="tchart-graph-lines"></div>
    <svg class="tchart-svg" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100" stroke-width="2" stroke-linejoin="round">
      <g class="tchart-svg-mark"></g>
      <g class="tchart-svg-path"></g>
      <g class="tchart-svg-mark"></g>
    </svg>
    <svg class="tchart-svg-marks" version="1.1" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
      <g class="tchart-svg-marks-move"></g>
    </svg>  
  </div>
  <div class="tchart-dates"></div>
  <div class="tchart-minimap-workspace"></div>
  <div class="tchart-toolbar"></div>
  <div class="tchart-theme-switcher">
    <button class="theme-switcher">Switch to Night Mode</button>
  </div>
</div>
`;

TChart.BUTTON_TEMPLATE = `
<label class="tchart-show-graph">
  <input type="checkbox" checked="checked">
  <svg class="tchart-show-graph-icon" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="50" style="fill: {{COLOR}};"></circle>
    <path class="tchart-show-graph-icon-mark" d="M 0,0 L 0,25 L 60,25"></path>
    <circle class="tchart-show-graph-icon-circle" cx="50" cy="50" r="50"></circle>
  </svg>{{NAME}}
</label>
`;
