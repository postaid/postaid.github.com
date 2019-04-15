class TGraph {
  constructor (id, name, color, values, ctx) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.values = values;
    this.ctx_ = ctx;
    this.max = Math.max.apply(null, values);
    this.min = Math.min.apply(null, values);
    this.visible_ = true;
    this.index_ = -1;
    this.pixelRatio_ = window.devicePixelRatio;
    this.animOpacity_ = Utils.createAnimation(0, 300, 1, 1);
    this.themeColors_ = {};
    this.xMarkWidth_ = 3 * this.pixelRatio_;
    this.xMarkRadius_ = 3 * this.pixelRatio_;
    this.lineWidth = 2 * this.pixelRatio_;
    this.animXMark_ = Utils.createAnimationSequence( 200, [0, 0]);
    this.selectedX_ = -1;
    this.needUpdateXMark_ = false;
  }

  clone () {
    const graph = new TGraph(this.id, this.name, this.color, this.values, this.ctx_);
    graph.setXAxis(this.xAxis_);
    return graph;
  }

  show(value) {
    this.visible_ = value;

    if (value) {
      this.animOpacity_.run(Date.now(), 1);
    } else {
      this.animOpacity_.run(Date.now(), 0);
    }
  }

  isVisible() {
    return this.visible_;
  }

  getIndex () {
    return this.index_;
  }

  setXAxis (xAxis) {
    this.xAxis_ = xAxis;
  }

  draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, step, paddingTop, selectedX, subtract, percentage, pass, animateHeight, minY) {
    if(!this.ctx_ || (this.animOpacity_.v === 0 && this.animOpacity_.v1 === 0)) {
      return;
    }

    pass = pass || 1;
    minY = minY || 0;
    const toInt = function (v) {return v};

    const opacity = this.animOpacity_.v;
    this.ctx_.strokeStyle = this.color;
    this.ctx_.fillStyle = this.color;
    this.ctx_.lineWidth = this.lineWidth;
    this.ctx_.beginPath();

    if (!animateHeight) {
      this.ctx_.globalAlpha = opacity;
    } else {
      this.ctx_.globalAlpha = 1;
    }

    let yVal = this.values[leftIndex];
    let prevX = toInt(-offsetLeft);
    let prevY = toInt(height - (yVal - minY) * scaleY + paddingTop);

    if (subtract) {
      if (percentage) {
        this.ctx_.lineWidth = 1;

        this.ctx_.beginPath();
        this.ctx_.moveTo(-offsetLeft, height - subtract[leftIndex] + paddingTop);
        for (let i = pass; i <= rightIndex - leftIndex; i += pass) {
          const leftInd = i + leftIndex;
          let x = step * i - offsetLeft;
          let y = height - subtract[leftInd] + paddingTop;
          this.ctx_.lineTo(x, y);
        }

        const lastI = rightIndex - leftIndex;
        let value = this.getDrawValuePercentag(lastI, height) * opacity;
        this.ctx_.lineTo(step * lastI - offsetLeft, height - (value + subtract[lastI]) + paddingTop);

        let i;
        for (i = rightIndex - leftIndex; i >= 0; i -= pass) {
          const leftInd = i + leftIndex;
          let value = this.getDrawValuePercentag(leftInd, height) * opacity;
          let x = step * i - offsetLeft;
          let y = height - (value + subtract[leftInd]) + paddingTop - 1;
          this.ctx_.lineTo(x, y);
          subtract[leftInd] += value;
        }
        if (i + pass > 0) {
          let value = this.getDrawValuePercentag(leftIndex, height) * opacity;
          let x = step * i - offsetLeft;
          let y = height - (value + subtract[leftIndex]) + paddingTop;
          this.ctx_.lineTo(x, y);
          subtract[leftIndex] += value;
        }

        this.ctx_.fill();
      } else {
        for (let i = 0; i <= rightIndex - leftIndex; i++) {
          const leftInd = i + leftIndex;
          let y = height - this.values[leftInd] * scaleY * opacity + paddingTop;
          y -= subtract[leftInd];
          let x = step * i - offsetLeft;
          this.ctx_.beginPath();
          this.ctx_.moveTo(x, y);
          this.ctx_.lineTo(step * (i + 1) - offsetLeft + 1, height - this.values[leftInd + 1] * scaleY * opacity + paddingTop - subtract[leftInd + 1]);
          this.ctx_.lineTo(step * (i + 1) - offsetLeft + 1, height + paddingTop - subtract[leftInd + 1]);
          this.ctx_.lineTo(x, height + paddingTop - subtract[leftInd]);
          this.ctx_.closePath();
          this.ctx_.fill();
          subtract[leftInd] += this.values[leftInd] * scaleY * opacity - 0.5;
          prevX = x;
          prevY = y;
        }
      }
    } else {
      this.ctx_.globalAlpha = this.animOpacity_.v;
      this.ctx_.beginPath();
      this.ctx_.moveTo(prevX, prevY);
      for (let i = 1; i <= rightIndex - leftIndex; i++) {
        const leftInd = i + leftIndex;
        let y = toInt(height - (this.values[leftInd] - minY) * scaleY + paddingTop);
        let x = toInt(step * i - offsetLeft);
        this.ctx_.lineTo(x, y);
      }
      this.ctx_.stroke();
    }

    if (~selectedX && !percentage) {
      if (selectedX !== this.selectedX_ && this.selectedX_ !== -1) {
        const seq = [];
        if (selectedX > this.selectedX_) {
          for (let i = this.selectedX_ + 1; i <= selectedX; i++) {
            const x = toInt(step * (i - leftIndex) - offsetLeft);
            const y = toInt(height - (this.values[i] - minY) * scaleY + paddingTop);
            seq.push([x, y]);
          }
        } else {
          for (let i = this.selectedX_ - 1; i >= selectedX; i--) {
            const x = toInt(step * (i - leftIndex) - offsetLeft);
            const y = toInt(height - (this.values[i] - minY) * scaleY + paddingTop);
            seq.push([x, y]);
          }
        }
        this.animXMark_.run(Date.now(), seq);
        this.selectedX_ = selectedX;
      } else if (this.selectedX_ === -1 || this.resetXMark_) {
        this.animXMark_.reset([[
          toInt(step * (selectedX - leftIndex) - offsetLeft),
          toInt(height - (this.values[selectedX] - minY) * scaleY + paddingTop),
        ]]);
        this.selectedX_ = selectedX;
      }
      this.ctx_.fillStyle = this.themeColors_.background;
      this.ctx_.beginPath();
      this.ctx_.lineWidth = this.xMarkWidth_;
      const point = this.animXMark_.v;
      this.ctx_.arc(point[0], point[1], this.xMarkRadius_, 0, Math.PI * 2);
      this.ctx_.stroke();
      this.ctx_.globalAlpha = 1.0;
      this.ctx_.fill();
    }
  }

  getDrawValuePercentag (index, height) {
    return this.values[index] / this.sumValues[index] * height;
  }

  updateAnimations (time, needUpdateXMark, resetXMark) {
    let redraw = false;
    redraw = this.animOpacity_.eval(time) || redraw;
    if (this.selectedX_ !== -1) {
      redraw = this.animXMark_.eval(time) || redraw;
    }
    this.needUpdateXMark_ = needUpdateXMark;
    this.resetXMark_ = resetXMark;
    return redraw;
  }

  setColors (colors) {
    this.themeColors_ = colors;
  }
}

