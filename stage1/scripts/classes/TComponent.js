class TComponent extends TEventTarget {

  constructor () {
    super();
    this.element_ = null;
  }

  render (container, tempTag) {
    this.element_ = this.renderTemplate(container, this.constructor.TEMPLATE || TComponent.TEMPLATE, tempTag);
    this.initDom();
  }

  renderTemplate (container, template) {
    const temp = document.createElement('div');
    temp.innerHTML = template.replace(/^\s+/, '');
    const element = temp.firstChild;
    container.appendChild(element);
    return element;
  }

  initDom () {
  }

  getElement () {
    return this.element_;
  }

  destroy () {
    this.element_.parentNode.removeChild(this.element_);
  }
}

TComponent.TEMPLATE = `<div>TComponent</div>`;
