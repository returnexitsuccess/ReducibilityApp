let vlist = [];
let elist = [];
let shownElement;
let rlist = [];
let isHover;
let vdict = {};

let vlistcount = [];
let elistcount = [];
let countRegion;
let isCountDisplay = false;

// TODO
// Use p elements for displaying text
// Create countable subregion (expandable)
// Generate partial pages
// Auto scroll down to page on click
// Fill in more equivalence relations
// CSS the template for pages
// Create Github project
// Create pull request guide

function preload() {
  for (let i = 0; i < data.equiv.length; i++) {
    item = data.equiv[i];
    vdict[item.id] = loadStrings("equiv/" + item.id + ".html");
  }
}

function setup() {
  canvas = createCanvas(1200, 800);
  canvas.parent('canvasContainer');
  
  let body = select("#body");
  for (let i = 0; i < data.equiv.length; i++) {
    item = data.equiv[i];
    element = createDiv();
    element.id(item.id);
    element.style("display", "none");
    element.parent(body);
    
    if (item.id in vdict) {
      let result = vdict[item.id];
      let start = result.indexOf("<body>") + 1;
      let end = result.indexOf("</body>");
      let equivbody = result.slice(start, end).join('\n');
      element.html(equivbody);
    }
    
    if ("countable" in item.categories) {
      vlistcount.push(new Vertex(item.pos[0], item.pos[1], item.name, item.label, item.labeloffset, item.categories, element));
    } else {
      vlist.push(new Vertex(item.pos[0], item.pos[1], item.name, item.label, item.labeloffset, item.categories, element));
    }
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
  
  countRegion = new Region(100, 700, 150, 750, "Countable", x => {
    return (x-600)*(x-600) / 1500 + 600;
  }, 100, 200, "countable", null, color(0, 200, 200));
  
  if (window.location.href.indexOf("id") > -1) {
    let urlid = getUrlVars()["id"];
    shownElement = select("#" + urlid);
    shownElement.style("display", "");
  }
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
  
  // Display state for regular graph
  if (!isCountDisplay) {
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
    if (countRegion.animate(mx, my)) {
      isHover = true;
      document.getElementById("canvasContainer").style.cursor = "pointer";
    }
    countRegion.show();
    
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
  } else { // Display state for countable graph zoomed in
    // Animate Vertices
    if (isHover == true) {
      document.getElementById("canvasContainer").style.cursor = "default";
      isHover = false;
    }
    canvas.removeAttribute("title");
    for (let i = 0; i < vlistcount.length; i++) {
      if (vlistcount[i].animate(mx, my)) {
        isHover = true;
        document.getElementById("canvasContainer").style.cursor = "pointer";
        canvas.attribute("title", vlistcount[i].name);
      }
    }
    
    if (isHover) {
      // Change mouse position to not activate edges
      mx -= 2*width;
      my -= 2*height;
    }
    
    // Animate & Show Edges
    for (let i = 0; i < elistcount.length; i++) {
      if (elistcount[i].animate(mx, my)) {
        isHover = true;
        document.getElementById("canvasContainer").style.cursor = "pointer";
      }
      elistcount[i].show();
    }
    
    // Show Vertices
    for (let i = 0; i < vlistcount.length; i++) {
      vlistcount[i].show();
    }
  }
}

function mouseClicked() {
  let mx = mouseX;
  let my = mouseY;
  let isClicked;
  
  if (!isCountDisplay) {
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
    
    if (!isClicked) {
      let result = countRegion.click(mx, my, shownElement);
      if (result !== false) {
        shownElement = undefined;
        isCountDisplay = true;
        updateURL();
      }
    }
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
    if (id) {
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?id=' + id;
      window.history.pushState({path:newurl},'',newurl);
    } else {
      var newurl = window.location.protocol + "//" + window.location.host + window.location.pathname
      window.history.pushState({path:newurl},'',newurl);
    }
  }
}