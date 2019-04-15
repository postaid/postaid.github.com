class TChartTooltip extends TComponent {

  constructor (marginTop) {
    super();
    this.index_ = -1;
    this.prev = {
      year: -1,
      month: -1,
      monthVal: -1,
      date: -1,
      day: -1,
      dayVal: -1,
    };
    this.marginTop_ = marginTop || 0;
    this.valName_ = {year: 'year', month: 'monthVal', date: 'date', day: 'dayVal'};
    this.anim = {
      year: Utils.createAnimation(0, 300, 1, 1),
      month: Utils.createAnimation(0, 300, 1, 1),
      date: Utils.createAnimation(0, 300, 1, 1),
      day: Utils.createAnimation(0, 300, 1, 1)
    };
    this.valsData_ = null;
  }

  initDom () {
    this.elDateContainer_ = this.element_.getElementsByClassName('tchart-tooltip-date-container')[0];
    const parts = this.elDateContainer_.getElementsByClassName('tchart-tooltip-date');
    this.elDay_ = parts[0];
    this.elMonth_ = parts[1];
    this.elDate_ = parts[2];
    this.elYear_ = parts[3];
    this.elValues_ = this.element_.getElementsByClassName('tchart-tooltip-values')[0];
  }

  setDate (dateVal) {
    const dateObj = new Date(dateVal);
    if (this.prev.day === -1) {
      this.elDay_.innerHTML = this.prev.day = dateObj.toLocaleString('en-us', { weekday: 'short' });
      this.elMonth_.innerHTML = this.prev.month = dateObj.toLocaleString('en-us', { month: 'short' });
      this.elDate_.innerHTML = this.prev.date = dateObj.getDate();
      this.elYear_.innerHTML = this.prev.year = dateObj.getFullYear();
      this.prev.dayVal = dateObj.getDay();
      this.prev.monthVal = dateObj.getMonth();
    } else {
      const time = Date.now();
      const day = dateObj.getDay();
      if (this.prev.dayVal !== day) {
        const dayText = dateObj.toLocaleString('en-us', { weekday: 'short' });
        this.createAnimation(this.elDay_, this.anim.day, 'day', day, dayText, time);
        this.prev.day = dayText;
        this.prev.dayVal = day;
      }
      const date = dateObj.getDate();
      if (this.prev.date !== date) {
        this.createAnimation(this.elDate_, this.anim.date, 'date', date, date,  time);
        this.prev.date = date;
      }
      const month = dateObj.getMonth();
      if (this.prev.monthVal !== month) {
        const monthText = dateObj.toLocaleString('en-us', { month: 'short' });
        this.createAnimation(this.elMonth_, this.anim.month, 'month', month, monthText, time);
        this.prev.month = monthText;
        this.prev.monthVal = month;
      }
      const year = dateObj.getFullYear();
      if (this.prev.year !== year) {
        this.createAnimation(this.elYear_, this.anim.year, 'year', year, year,  time);
        this.prev.year = year;
      }
    }
  }

  setValues (graphs, colors, index, showPercents) {
    if (!this.valsData_) {
      this.valsData_ = [];
      graphs.forEach((graph, i) => {
        const val = graph.values[index];
        const item = document.createElement('div');
        item.className = 'tchart-tooltip-values-item';
        const name = document.createElement('div');
        name.className = 'tchart-tooltip-values-name';
        if (showPercents) {
          name.innerHTML = '<span class="tchart-tooltip-percents"></span>' + graph.name;
        } else {
          name.textContent = graph.name;
        }
        const value = document.createElement('div');
        value.className = 'tchart-tooltip-values-value';
        value.textContent = val;
        value.style.color = colors[i] || graph.color;
        item.appendChild(name);
        item.appendChild(value);
        this.elValues_.appendChild(item);

        const h = item.offsetHeight;
        this.valsData_.push({
          item: item,
          height: h,
          el: value,
          precent: name.firstChild,
          value: val,
          anim: Utils.createAnimation(0, 300, 1, 1),
          prev: val
        });
      });
    }
    const time = Date.now();
    let sum = 0;
    graphs.forEach((graph, i) => {
      const valData = this.valsData_[i];
      const curVal = graph.values[index];
      if (curVal !== valData.prev) {
        this.createValueAnimation(valData.el, valData.anim, valData.prev, curVal, time);
        valData.prev = curVal;
      }
      valData.item.style.opacity = graph.isVisible() ? '1' : '0';
      if (graph.isVisible()) {
        valData.item.style.transform = 'scale(1,1)';
        valData.item.style.height = valData.height + 'px';
        valData.item.style.marginBottom = '';
        sum += curVal;
      } else {
        valData.item.style.transform = 'scale(1,0.5)';
        valData.item.style.height = '0';
        valData.item.style.marginBottom = '0';
      }
    });
    if (showPercents && sum > 0) {
      let percentSum = 0;
      let vals = [];
      this.valsData_.forEach((valData, i) => {
        if (graphs[i].isVisible()) {
          const val = Math.round(valData.prev / sum * 100);
          percentSum += val;
          vals.push(val);
          valData.precent.textContent = val + '%';
        }
      });
      if (percentSum < 100) {
        for (let i = 0; i < vals.length; i++) {
          const val = vals[i];
          if (val - Math.floor(val) < 0.5) {
            this.valsData_[i].precent.textContent = val + 1 + '%';
            break;
          }
        }
      }
    }
    this.index_ = index;
  }

  draw(time) {
    if (this.anim.date.eval(time)) {
      this.applyAnimation(this.anim.date);
    }
    if (this.anim.month.eval(time)) {
      this.applyAnimation(this.anim.month);
    }
    if (this.anim.day.eval(time)) {
      this.applyAnimation(this.anim.day);
    }
    if (this.anim.year.eval(time)) {
      this.applyAnimation(this.anim.year);
    }
    if (this.valsData_) {
      this.valsData_.forEach((valData) => {
        if (valData.anim.eval(time)) {
          this.applyAnimation(valData.anim);
        }
      });
    }

  }

  createAnimation (element, anim, name, curVal, curText, time) {
    let valName = this.valName_[name];
    if (anim.v === 1) {
      anim.reset(0);
      anim.run(time, 1);
      anim.back = curVal < this.prev[valName];
    }
    if (!anim.from) {
      anim.from = document.createElement('span');
      anim.to = document.createElement('span');
      element.textContent = '';
      element.appendChild(anim.from);
      element.appendChild(anim.to);
    }
    anim.from.textContent = this.prev[name];
    anim.to.textContent = curText;
    const maxW = anim.to.offsetWidth;
    anim.from.style.width = maxW + 'px';
  }

  createValueAnimation (element, anim, prevValue, curValue, time) {
    if (anim.v === 1) {
      anim.reset(0);
      anim.run(time, 1);
      anim.back = curValue < prevValue;
    }
    if (!anim.from) {
      anim.from = document.createElement('span');
      anim.to = document.createElement('span');
      element.textContent = '';
      element.appendChild(anim.from);
      element.appendChild(anim.to);
    }
    anim.from.textContent = prevValue;
    anim.to.textContent = curValue;
    const maxW = anim.to.offsetWidth;
    anim.from.style.width = maxW + 'px';
  }

  applyAnimation (anim) {
    const v = anim.v;
    if (anim.back) {
      anim.from.style.transform = `translate(0, ${0.6 * v}em) scale(${1 - v * 0.5})`;
      anim.from.style.opacity = 1 - v;
      anim.to.style.transform = `translate(0, ${-0.6 * (1 - v)}em) scale(${v * 0.5 + 0.5})`;
      anim.to.style.opacity = v;
    } else {
      anim.from.style.transform = `translate(0, ${-0.6 * v}em) scale(${1 - v * 0.5})`;
      anim.from.style.opacity = 1 - v;
      anim.to.style.transform = `translate(0, ${0.6 * (1 - v)}em) scale(${v * 0.5 + 0.5})`;
      anim.to.style.opacity = v;
    }
  }

  setPosition (x) {
    this.element_.style.transform = 'translate(' + Utils.toInt(x) + 'px, ' + this.marginTop_ + 'px)';
  }

  setColors (colors) {
    this.valsData_.forEach((item, i) => {
      item.el.style.color = colors[i];
    });
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
  <div class="tchart-tooltip-date-container"><span class="tchart-tooltip-date"></span>, <span class="tchart-tooltip-date"></span> <span class="tchart-tooltip-date"></span> <span class="tchart-tooltip-date"></span></div>
  <div class="tchart-tooltip-values"></div>
</div>
`;
