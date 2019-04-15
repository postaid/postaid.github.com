class TGraphButton extends TComponent {

  constructor (caption) {
    super();
    this.caption = caption;
    this.timer_ = null;
  }

  renderTemplate (container, template) {
    const temp = document.createElement('div');
    temp.innerHTML = template
      .replace(/^\s+/, '')
      .replace('{{NAME}}', this.caption);
    const element = temp.firstChild;
    container.appendChild(element);
    return element;
  }

  initDom () {
    this.input = this.element_.getElementsByTagName('input')[0];
    this.bgElement_ = this.element_.getElementsByClassName('tchart-show-graph-background')[0];
    this.captionEl_ = this.element_.getElementsByClassName('tchart-show-graph-caption')[0];

    this.element_.addEventListener('click', (ev) => {
      if (this.noClick) {
        ev.stopPropagation();
        ev.preventDefault();
      } else {
        const ev = new Event('change');
        ev.checked = this.input.checked;
        this.dispatchEvent(ev);
      }
    });

    this.element_.addEventListener('touchstart', this.handlerLongTapStart_.bind(this));
    this.element_.addEventListener('touchend', this.handlerLongTapEnd_.bind(this));
    this.element_.addEventListener('mousedown', this.handlerLongTapStart_.bind(this));
    this.element_.addEventListener('mouseup', this.handlerLongTapEnd_.bind(this));
  }

  handlerLongTapStart_ (ev) {
    if (this.timer_) {
      clearTimeout(this.timer_);
    }
    this.timer_ = setTimeout(() => {
      const ev = new Event('longtap');
      this.dispatchEvent(ev);
      this.noClick = true;
    }, 1000);
  }

  handlerLongTapEnd_ (ev) {
    if (this.timer_) {
      clearTimeout(this.timer_);
      this.timer_ = null;
    }
    setTimeout(() => {this.noClick = false}, 100);
  }

  setColor (color) {
    this.bgElement_.style.borderColor = color;
    this.bgElement_.style.backgroundColor = color;
    this.captionEl_.style.color = color;
  }
}

TGraphButton.TEMPLATE = `
<label class="tchart-show-graph"">
  <input type="checkbox" checked="checked">
  <div class="tchart-show-graph-background" style="background-color: {{COLOR}}; border-color: {{COLOR}}"></div>
  <svg class="tchart-show-graph-icon" viewBox="0 0 100 100">
    <path class="tchart-show-graph-icon-mark" d="M 0,0 L 0,25 L 60,25"></path>
  </svg><span class="tchart-show-graph-caption" style="color: {{COLOR}}">{{NAME}}</span>
</label>
`;
