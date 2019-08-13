class Edge {
  constructor(x1, y1, x2, y2, edgetype, element) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.len = sqrt(pow(x1-x2,2)+pow(y1-y2,2));
    this.color = color(0, 0, 0);
    this.size = 4;
    this.width = this.size;
    this.edgetype = edgetype;
    this.dashlength = 4;
    this.element = element;
  }
  
  animate(mx, my) {
    let d = sqDistToLine(mx, my, this.x1, this.y1, this.x2, this.y2);
    let mouseOn;
    if (d < pow(this.width, 2)) {
      this.width = lerp(this.width, this.size * 1.5, 0.1);
      mouseOn = true;
    } else {
      this.width = lerp(this.width, this.size, 0.1);
      mouseOn = false;
    }
    return mouseOn;
  }
  
  show() {
    if (this.edgetype == "solid") {
      stroke(this.color);
      strokeWeight(this.width);
      line(this.x1, this.y1, this.x2, this.y2);
    } else if (this.edgetype == "dashed") {
      let numDashes = this.len / ((this.dashlength + 3 * this.size) * 2);
      for (let i = 0; i < numDashes; i++) {
        let xa = map(i, 0, numDashes, this.x1, this.x2);
        let ya = map(i, 0, numDashes, this.y1, this.y2);
        let xb = xa + (this.x2 - this.x1) / (numDashes * 2);
        let yb = ya + (this.y2 - this.y1) / (numDashes * 2);
        if (((xb - this.x2)*(this.x2 - this.x1) > 0) || ((yb - this.y2)*(this.y2-this.y1) > 0)) {
          xb = this.x2;
          yb = this.y2;
        }
        stroke(this.color);
        strokeWeight(this.width);
        line(xa, ya, xb, yb);
        //console.log(xa, ya, xb, yb);
      }
    } else if (this.edgetype == "arrow") {
      stroke(this.color);
      strokeWeight(this.width);
      line(this.x1, this.y1, this.x2, this.y2);
      
      push();
      fill(this.color);
      translate(this.x1, this.y1);
      let a = atan2(this.y2 - this.y1, this.x2 - this.x1);
      rotate(a);
      triangle(5, 0, 20, 1.2 * this.width, 20, -1.2 * this.width);
      pop();
    } else if (this.edgetype == "doublearrow") {
      stroke(this.color);
      strokeWeight(this.width);
      line(this.x1, this.y1, this.x2, this.y2);
      
      let a;
      push();
      fill(this.color);
      translate(this.x1, this.y1);
      a = atan2(this.y2 - this.y1, this.x2 - this.x1);
      rotate(a);
      triangle(5, 0, 20, 1.2 * this.width, 20, -1.2 * this.width);
      pop();
      
      push();
      fill(this.color);
      translate(this.x2, this.y2);
      a = atan2(this.y1 - this.y2, this.x1 - this.x2);
      rotate(a);
      triangle(5, 0, 20, 1.2 * this.width, 20, -1.2 * this.width);
      pop();
    }
  }
  
  click(mx, my, prevelt) {
    let d = sqDistToLine(mx, my, this.x1, this.y1, this.x2, this.y2);
    if (d < pow(this.width, 2)) {
      //console.log("click edge");
      if (prevelt) {
        prevelt.style("visibility", "hidden");
      }
      if (this.element) {
        this.element.style("visibility", "");
      }
      for (let i = 0; i < rlist.length; i++) {
        rlist[i].highlight(false);
      }
      return this.element;
    }
    return false;
  }
}