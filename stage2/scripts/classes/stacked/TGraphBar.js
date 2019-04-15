class TGraphBar extends TGraph {
  constructor (id, name, color, values, ctx) {
    super(id, name, color, values, ctx);
    this.minBarHeight_ = 2 * this.pixelRatio_;
    this.type = 'bar';
  }

  draw(width, height, offsetLeft, leftIndex, rightIndex, scaleY, rectW, padding, selectedX, subtract, percentage, pass) {
    if(!this.ctx_ || (this.animOpacity_.v === 0 && this.animOpacity_.v1 === 0)) {
      return;
    }

    pass = pass || 1;
    const opacity = this.animOpacity_.v;
    this.ctx_.fillStyle = this.color;
    this.ctx_.strokeStyle = this.color;
    this.ctx_.beginPath();
    const toInt = Utils.toInt;

    const paddingTop = padding.t;
    const paddingLeft = padding.l;
    const realRectW = toInt(rectW * pass);
    if (subtract) {
      let prevX = toInt(leftIndex * rectW + paddingLeft + offsetLeft);
      let prevY = toInt(height - subtract[leftIndex] + paddingTop);
      let arrBack = [];
      this.ctx_.moveTo(prevX, prevY);
      for (let i = leftIndex + 1; i <= rightIndex; i += pass) {
        let w = realRectW;
        let x = toInt(i * rectW + paddingLeft + offsetLeft);
        let h = this.values[i] * scaleY;
        if (h < this.minBarHeight_)
          h = this.minBarHeight_;
        h *= opacity;
        let y = toInt(height - subtract[i] + paddingTop);

        this.ctx_.lineTo(prevX, y);
        this.ctx_.lineTo(x + w, y);
        arrBack.push([prevX, y - h], [x + w, y - h]);

        subtract[i] += h - this.pixelRatio_;
        prevX = x + w;
        prevY = y;
      }
      for (let i = arrBack.length - 1; i >= 0; i--) {
        this.ctx_.lineTo(arrBack[i][0], arrBack[i][1]);
      }
      this.ctx_.fill();

    } else {
      let prevX = leftIndex * rectW + paddingLeft + offsetLeft;
      let prevY = height + paddingTop;
      let arrBack = [];
      this.ctx_.moveTo(prevX, prevY);
      for (let i = leftIndex + 1; i <= rightIndex; i += pass) {
        let w = realRectW;
        let x = i * rectW + paddingLeft + offsetLeft;
        let h = this.values[i] * scaleY;
        if (h < this.minBarHeight_)
          h = this.minBarHeight_;
        h *= opacity;
        let y = height + paddingTop;

        this.ctx_.lineTo(prevX, y);
        this.ctx_.lineTo(x + w, y);
        arrBack.push([prevX, y - h], [x + w, y - h]);

        prevX = x + w;
        prevY = y;
      }
      for (let i = arrBack.length - 1; i >= 0; i--) {
        this.ctx_.lineTo(arrBack[i][0], arrBack[i][1]);
      }
      this.ctx_.fill();
    }
  }

  show(value) {
    this.visible_ = value;

    const time = Date.now();
    if (value) {
      this.animOpacity_.run(time, 1);
    } else {
      this.animOpacity_.run(time, 0);
    }
  }

  clone () {
    const graph = new TGraphBar(this.id, this.name, this.color, this.values, this.ctx_);
    graph.setXAxis(this.xAxis_);
    return graph;
  }

}

