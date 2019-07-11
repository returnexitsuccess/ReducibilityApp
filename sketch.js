let vlist = [];
let elist = [];
let shownElement;
let rlist = [];
let isHover;

// TODO
// Use p elements for displaying text
// Create countable subregion (expandable)
// Generate partial pages
// Auto scroll down to page on click
// Fill in more equivalence relations
// CSS the template for pages
// Create Github project
// Create pull request guide

function setup() {
  canvas = createCanvas(1200, 800);
  canvas.parent('canvasContainer');
  
  if (window.location.href.indexOf("id") > -1) {
    let urlid = getUrlVars()["id"];
    shownElement = select("#" + urlid);
    shownElement.style("display", "");
  }
  
  for (let i = 0; i < data.equiv.length; i++) {
    item = data.equiv[i];
    element = select("#" + item.id);
    vlist.push(new Vertex(item.pos[0], item.pos[1], item.name, item.label, item.labeloffset, item.categories, element));
  }
  
  for (let i = 0; i < data.reduc.length; i++) {
    item = data.reduc[i];
    element = select("#" + item.id);
    let upper;
    let lower;
    for (let j = 0; j < vlist.length; j++) {
      if (upper == null && vlist[j].label == item.upperlabel) {
        upper = [vlist[j].x, vlist[j].y];
      }
      if (lower == null && vlist[j].label == item.lowerlabel) {
        lower = [vlist[j].x, vlist[j].y];
      }
    }
    if (upper != null && lower != null) {
      elist.push(new Edge(upper[0], upper[1], lower[0], lower[1], item.edgetype, element));
    } else {
      console.log(item);
      console.error("Couldn't find upper and lower vertex");
    }
  }
  
  element = select("#sinf");
  rlist.push(new Region(1100, 700, 1200, 750, "S Infinity", x => {
    return (x-600) * (x-600) / 1200 + 600;
  }, 100, 1100, "sinf", element, color(0, 0, 200)));
  
  element = select("#borel");
  rlist.push(new Region(50, 250, 100, 300, "Borel", x => {
    return x*x / 1000 + 200;
  }, -100, 1000, "borel", element, color(200, 0, 0)));
  
  element = select("#polish");
  rlist.push(new Region(1000, 200, 1100, 250, "Polish group actions", x => {
    return (x-1050)*(x-1050) / 1500 + 200;
  }, 50, 1250, "polish", element, color(0, 200, 0)));
}

function draw() {
  background(150);
  let mx = mouseX;
  let my = mouseY;
  fill(255);
  stroke(0);
  strokeWeight(2);
  textSize(14);
  text(String(mx) + ", " + String(my), 1120, 790);
  
  // Animate Vertices
  if (isHover == true) {
    document.getElementById("canvasContainer").style.cursor = "default";
    isHover = false;
  }
  canvas.removeAttribute("title");
  for (let i = 0; i < vlist.length; i++) {
    if (vlist[i].animate(mx, my)) {
      isHover = true;
      document.getElementById("canvasContainer").style.cursor = "pointer";
      canvas.attribute("title", vlist[i].name);
    }
  }
  
  // Animate and Show Regions
  for (let i = 0; i < rlist.length; i++) {
    rlist[i].showHighlight();
  }
  for (let i = 0; i < rlist.length; i++) {
    if (rlist[i].animate(mx, my)) {
      isHover = true;
      document.getElementById("canvasContainer").style.cursor = "pointer";
    }
    rlist[i].show();
  }
  
  if (isHover) {
    // Change mouse position to not activate edges
    mx -= 2*width;
    my -= 2*height;
  }
  
  // Animate & Show Edges
  for (let i = 0; i < elist.length; i++) {
    if (elist[i].animate(mx, my)) {
      isHover = true;
      document.getElementById("canvasContainer").style.cursor = "pointer";
    }
    elist[i].show();
  }
  
  // Show Vertices
  for (let i = 0; i < vlist.length; i++) {
    vlist[i].show();
  }
}

function mouseClicked() {
  let mx = mouseX;
  let my = mouseY;
  let isClicked;
  for (let i = 0; i < vlist.length; i++) {
    isClicked = vlist[i].click(mx, my, shownElement);
    if (isClicked !== false) {
      shownElement = isClicked;
      isClicked = true;
      break;
    }
  }
  if (!isClicked) {
    for (let i = 0; i < elist.length; i++) {
      isClicked = elist[i].click(mx, my, shownElement);
      if (isClicked !== false) {
        shownElement = isClicked;
        isClicked = true;
        break;
      }
    }
  }
  if (!isClicked) {
    for (let i = 0; i < rlist.length; i++) {
      isClicked = rlist[i].click(mx, my, shownElement);
      if (isClicked !== false) {
        shownElement = isClicked;
        isClicked = true;
        break;
      }
    }
  }
  
  if (isClicked) {
    updateURL(shownElement.id());
  }
}

function sqDistToLine(mx, my, x1, y1, x2, y2) {
  let d;
  let dot = (mx - x1) * (x2 - x1) + (my - y1) * (y2 - y1);
  let lenSq = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  let t = dot / lenSq
  if (t > 0 && t < 1) {
    d = pow(mx - x1, 2) + pow(my - y1, 2) - t * t * lenSq;
  }
  else {
    d = Infinity;
  }
  return d;
}

function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

function updateURL(id) {
  if (history.pushState) {
    var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + id;
    window.history.pushState({path:newurl},'',newurl);
  }
}