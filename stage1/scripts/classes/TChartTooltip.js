class TChartTooltip extends TComponent {

  constructor () {
    super();
    this.index_ = -1;
  }

  initDom () {
    this.elDate_ = this.element_.getElementsByClassName('tchart-tooltip-date')[0];
    this.elValues_ = this.element_.getElementsByClassName('tchart-tooltip-values')[0];
  }

  setDate (dateVal) {
    const date = new Date(dateVal);
    this.elDate_.innerHTML = `${date.toLocaleString('en-us', { weekday: 'short' })}, ${date.toLocaleString('en-us', { month: 'short' })} ${date.getDate()}`;
  }

  setValues (graphs, index) {
    let valuesContent = '';
    graphs.forEach(graph => {
      if (graph.isVisible()) {
        const value = graph.values[index];
        const color = graph.color;
        const name = graph.name;
        valuesContent += `
<div class="tchart-tooltip-values-item" style="color: ${color}">
  <div class="tchart-tooltip-values-value">${value}</div>
  <div class="tchart-tooltip-values-name">${name}</div>
</div>`;
      }
    });
    this.elValues_.innerHTML = valuesContent;
    this.index_ = index;
  }

  setPosition (x) {
    this.element_.style.left = x + 'px';
  }

  getIndex () {
    return this.index_;
  }

  show () {
    this.element_.style.opacity = '1';
  }

  hide () {
    this.element_.style.opacity = '0';
  }
}

TChartTooltip.TEMPLATE = `
<div class="tchart-tooltip">
  <div class="tchart-tooltip-date"></div>
  <div class="tchart-tooltip-values"></div>
</div>
`;
