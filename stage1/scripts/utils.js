function throttle (func, args, context, wait) {
  this.func = func;
  this.wait = wait;
  this.args = args;

  if (!this.timer) {
    this.func.apply(context || null, this.args);
    this.timer = setTimeout(() => {
      this.func.apply(context || null, this.args);
      this.timer = null;
    }, this.wait);
  }
}
