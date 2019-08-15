class Region {
  constructor(x1, y1, x2, y2, label, curve, xstart, xend, catlabel, element, color) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.label = label;
    this.curve = curve;
    this.xstart = xstart;
    this.xend = xend;
    this.catlabel = catlabel;
    this.element = element;
    this.highlighted = false;
    this.color = color;
  }
  
  animate(mx, my) {
    if (mx > this.x1 && mx < this.x2 && my > this.y1 && my < this.y2) {
      return true;
    }
    return false;
  }
  
  show() {
    noFill();
    strokeWeight(6);
    stroke(this.color);
    beginShape();
    vertex(this.xstart, height + 10);
    for (let x = this.xstart; x <= this.xend; x+=5) {
      vertex(x, this.curve(x));
    }
    vertex(this.xend, height+10);
    endShape();
    
    
    fill(this.color);
    textSize(20);
    textFont('Helvetica');
    textStyle(BOLD);
    stroke(255);
    strokeWeight(1);
    text(this.label, this.x1, this.y1, this.x2, this.y2);
  }
  
  showHighlight() {
    if (this.highlighted) {
      noStroke();
      fill(200);
      beginShape();      
      vertex(this.xstart, height + 10);
      for (let x = this.xstart; x <= this.xend; x+=5) {
        vertex(x, this.curve(x));
      }
      vertex(this.xend, height + 10);
      endShape(CLOSE);
    }
  }
  
  click(mx, my, prevelt) {
    if (mx > this.x1 && mx < this.x2 && my > this.y1 && my < this.y2) {
      if (prevelt) {
        prevelt.style("display", "none");
      }
      if (this.element) {
        this.element.style("display", "");
      }
      for (let i = 0; i < rlist.length; i++) {
        rlist[i].highlight(false);
      }
      this.highlight(true);
      return this.element;
    }
    return false;
  }
  
  highlight(value) {
    this.highlighted = value;
    
    if (value) {
      for (let i = 0; i < vlist.length; i++) {
        if (vlist[i].cats.indexOf(this.catlabel) >= 0) {
          // Not sure if I want this
          //vlist[i].highlighted = true;
        }
      }
    } else {
      for (let i = 0; i < vlist.length; i++) {
        vlist[i].highlighted = false;
      }
    }
  }
}