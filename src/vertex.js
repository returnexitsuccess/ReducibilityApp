class Vertex {
  constructor(x, y, name, label, labeloff, cats, element) {
    this.x = x;
    this.y = y;
    this.color = color(255, 255, 255);
    this.size = 6;
    this.r = this.size;
    this.name = name;
    this.label = label;
    this.cats = cats;
    this.labeloff = labeloff;
    this.element = element;
    this.highlighted = false;
  }
  
  animate(mx, my) {
    let mouseOn;
    if (pow(mx - this.x, 2) + pow(my - this.y, 2) < pow(this.r, 2)) {
      this.r = lerp(this.r, this.size * 1.5, 0.1);
      mouseOn = true;
    } else {
      this.r = lerp(this.r, this.size, 0.1);
      mouseOn = false;
    }
    return mouseOn;
  }
  
  show() {
    fill(this.color);
    if (this.highlighted) {
      fill(200, 0, 200);
    }
    stroke(0);
    strokeWeight(2 * this.r / this.size);
    circle(this.x, this.y, 2 * this.r);
    
    fill(255);
    textSize(16);
    strokeWeight(2);
    text(this.label, this.x + this.labeloff[0], this.y + this.labeloff[1]);
  }
  
  click(mx, my, prevelt) {
    if (pow(mx - this.x, 2) + pow(my - this.y, 2) < pow(this.r, 2)) {
      //console.log(this.name);
      if (prevelt) {
        prevelt.style("display", "none");
      }
      if (this.element) {
        this.element.style("display", "");
      }
      for (let i = 0; i < rlist.length; i++) {
        rlist[i].highlight(false);
      }
      return this.element;
    }
    return false;
  }
}