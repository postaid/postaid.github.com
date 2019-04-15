
window.Utils = {};

window.Utils.throttle = function (func, context, wait) {
  return function() {
    this.func = func;
    this.wait = wait;
    this.args = arguments;

    if (!this.timer) {
      this.func.apply(context || null, this.args);
      this.timer = setTimeout(() => {
        this.func.apply(context || null, this.args);
        this.timer = null;
      }, this.wait);
    }
  }
};

window.Utils.lerp = function (v0, v1, t0, t1, t) {
  if (t < t0) t = t0;
  if (t > t1) t = t1;

  return v0 + (t - t0) * (v1 - v0) / (t1 - t0);
};

window.Utils.toInt = function (value) {
  return (0.5 + value) | 0;
};

window.Utils.createAnimation = function (time, duration, v0, v1) {
  return {
    t: time,
    d: duration,
    v0: v0,
    v1: v1,
    v: v0,
    eval (t) {
      if (this.v === this.v1) return false;
      if (t < this.t) t = this.t;
      if (t > this.t + this.d) t = this.t + this.d;
      this.v = Utils.lerp(this.v0, this.v1, this.t, this.t + this.d, t);
      return true;
    },
    run (t, v1) {
      this.t = t;
      this.v0 = this.v;
      this.v1 = v1;
    },
    reset (v) {
      this.v0 = this.v1 = this.v = v;
    }
  };
};

window.Utils.createAnimationPoint = function (time, duration, v0, v1) {
  return {
    t: time,
    d: duration,
    v0: [v0[0], v0[1]],
    v1: [v1[0], v1[1]],
    v: [v0[0], v0[1]],
    eval (t) {
      if (this.v[0] === this.v1[0] && this.v[1] === this.v1[1]) return false;
      if (t < this.t) t = this.t;
      if (t > this.t + this.d) t = this.t + this.d;
      this.v[0] = Utils.lerp(this.v0[0], this.v1[0], this.t, this.t + this.d, t);
      this.v[1] = Utils.lerp(this.v0[1], this.v1[1], this.t, this.t + this.d, t);
      return true;
    },
    run (t, v1) {
      this.t = t;
      this.v0[0] = this.v[0];
      this.v0[1] = this.v[1];
      this.v1[0] = v1[0];
      this.v1[1] = v1[1];
    },
    reset (v) {
      this.v0[0] = this.v1[0] = this.v[0] = v[0];
      this.v0[1] = this.v1[1] = this.v[1] = v[1];
    }
  };
};

window.Utils.createAnimationSequence = function (duration, v0) {
  return {
    t: 0,
    d: duration,
    s: 1,
    a: [],
    v: [v0[0], v0[0]],
    eval (t) {
      let ind = Math.floor((t - this.t) / this.s);
      if (ind > this.a.length - 1) {
        ind = this.a.length - 1;
      }
      let anim = this.a[ind];
      if (!anim) {
        return false;
      }
      let cont = anim.eval(t);
      this.v = [anim.v[0], anim.v[1]];
      return cont;
    },
    run (t, arrv1) {
      this.t = t;
      const dur = this.d / arrv1.length;
      const animations = [];
      let prevv1 = [this.v[0], this.v[1]];
      for (let i = 0; i < arrv1.length; i++) {
        animations.push(Utils.createAnimationPoint(t + dur * i, dur, prevv1, arrv1[i]));
        prevv1 = arrv1[i];
      }
      this.a = animations;
      this.s = dur;
    },
    reset (arrv) {
      const i = arrv.length - 1;
      this.v = [arrv[i][0], arrv[i][1]];
      this.a = [];
    }
  };
};


window.Utils.getJSON = function (fileName, callback) {
  const req = new XMLHttpRequest();
  req.open('GET', './source/' + fileName, true);
  req.onreadystatechange = function (aEvt) {
    if (req.readyState === 4) {
      if(req.status === 200) {
        callback(JSON.parse(req.responseText));
      }
    }
  };
  req.send(null);
};

window.Utils.log = function (text) {
  if (!this.el) {
    this.el = document.createElement('div');
    this.el.style.cssText = 'position: fixed; top: 0; left: 0; pointer-events: none;';
    document.body.appendChild(this.el);
  }
  this.el.innerHTML = text;
};
