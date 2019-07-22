let vlist = [];
let elist = [];
let shownElement;
let rlist = [];
let isHover;
let vdict = {};
let edict = {};
let goBackRegion;

let vlistcount = [];
let elistcount = [];
let countRegion;
let isCountDisplay = false;

// TODO
// Use python script to generate json data (?)
// Use p elements for displaying text
// Fill in elements for countable vertices and edges
// Create placeholder tex files for each vertex
// Auto scroll down to page on click
// Fill in more equivalence relations
// CSS the template for pages

function preload() {
  for (let i = 0; i < data.equiv.length; i++) {
    item = data.equiv[i];
    vdict[item.id] = loadStrings("equiv/" + item.id + ".html");
  }
  for (let i = 0; i < data.reduc.length; i++) {
    item = data.reduc[i];
    edict[item.id] = loadStrings("reduc/" + item.id + ".html");
  }
}

function setup() {
  canvas = createCanvas(1200, 800);
  canvas.parent('canvasContainer');
  
  let body = select("#body");
  for (let i = 0; i < data.equiv.length; i++) {
    item = data.equiv[i];
    // Create html element
    element = createDiv();
    element.id(item.id);
    element.style("display", "none");
    element.parent(body);
    
    // Add html from file
    if (item.id in vdict) {
      let result = vdict[item.id];
      let start = result.indexOf("<body>") + 1;
      let end = result.indexOf("</body>");
      let equivbody = result.slice(start, end).join('\n');
      element.html(equivbody);
    }
    
    // Add either to regular or countable graph
    if (item.categories.indexOf("countable") >= 0) {
      vlistcount.push(new Vertex(item.pos[0], item.pos[1], item.name, item.label, item.labeloffset, item.categories, element));
      for (let i = 0; i < item.categories.length; i++) {
        cat = item.categories[i];
        addHTMLCats(element, cat);
      }
    } else {
      vlist.push(new Vertex(item.pos[0], item.pos[1], item.name, item.label, item.labeloffset, item.categories, element));
      for (let i = 0; i < item.categories.length; i++) {
        cat = item.categories[i];
        addHTMLCats(element, cat);
      }
    }
  }
  
  for (let i = 0; i < data.reduc.length; i++) {
    item = data.reduc[i];
    // Create html element
    element = createDiv();
    element.id(item.id);
    element.style("display", "none");
    element.parent(body);
    
    // Import html from file
    if (item.id in edict) {
      let result = edict[item.id];
      let start = result.indexOf("<body>") + 1;
      let end = result.indexOf("</body>");
      let reducbody = result.slice(start, end).join('\n');
      element.html(reducbody);
    }
    
    // Determine the upper and lower vertices of edge
    let upper;
    let lower;
    let upperindex;
    let lowerindex;
    if (!item.countable) {
      for (let j = 0; j < vlist.length; j++) {
        if (upper == null && vlist[j].label == item.upperlabel) {
          upper = [vlist[j].x, vlist[j].y];
          upperindex = j;
        }
        if (lower == null && vlist[j].label == item.lowerlabel) {
          lower = [vlist[j].x, vlist[j].y];
          lowerindex = j;
        }
      }
      // Add to graph
      if (upper != null && lower != null) {
        elist.push(new Edge(upper[0], upper[1], lower[0], lower[1], item.edgetype, element));
        addHTMLReducs(upperindex, lowerindex, vlist, item.id);
      } else {
        console.log(item);
        console.error("Couldn't find upper and lower vertex");
      }
    } else {
      for (let j = 0; j < vlistcount.length; j++) {
        if (upper == null && vlistcount[j].label == item.upperlabel) {
          upper = [vlistcount[j].x, vlistcount[j].y];
          upperindex = j;
        }
        if (lower == null && vlistcount[j].label == item.lowerlabel) {
          lower = [vlistcount[j].x, vlistcount[j].y];
          lowerindex = j;
        }
      }
      // Add to graph
      if (upper != null && lower != null) {
        elistcount.push(new Edge(upper[0], upper[1], lower[0], lower[1], item.edgetype, element));
        addHTMLReducs(upperindex, lowerindex, vlistcount, item.id);
      } else {
        console.log(item);
        console.error("Couldn't find upper and lower vertex");
      }
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
  
  countRegion = new Region(300, 720, 350, 750, "Countable", x => {
    return (x-350)*(x-350) / 500 + 690;
  }, 100, 600, "countable", null, color(0, 200, 200));
  
  goBackRegion = new Region(1000, 50, 1100, 100, "Go Back", x => {
    return (x-600)*(x-600) / 4000 + 50;
  }, -50, 1250, "goback", null, color(0, 200, 200));
  
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
  text(String(floor(mx)) + ", " + String(floor(my)), 1120, 790);
  
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
    
    //Animate and show Go Back region
    if (goBackRegion.animate(mx, my)) {
      isHover = true;
      document.getElementById("canvasContainer").style.cursor = "pointer";
    }
    goBackRegion.show();
    
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
  } else {
    for (let i = 0; i < vlistcount.length; i++) {
      isClicked = vlistcount[i].click(mx, my, shownElement);
      if (isClicked !== false) {
        shownElement = isClicked;
        isClicked = true;
        break;
      }
    }
    if (!isClicked) {
      for (let i = 0; i < elistcount.length; i++) {
        isClicked = elistcount[i].click(mx, my, shownElement);
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
      let result = goBackRegion.click(mx, my, shownElement);
      if (result !== false) {
        shownElement = undefined;
        isCountDisplay = false;
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

function addHTMLReducs(up, lo, vertices, id) {
  let eltstring = vertices[lo].element.html();
  let i = eltstring.indexOf("</h2>", eltstring.indexOf('id="reducible-to"')) + 5;
  let linkstr = '<p><a href="./?id=' + id + '">' + vertices[up].name + '</a></p>\n';
  let result = [eltstring.slice(0, i), linkstr, eltstring.slice(i)].join('');
  vertices[lo].element.html(result);
  
  eltstring = vertices[up].element.html();
  i = eltstring.indexOf("</h2>", eltstring.indexOf('id="reducible-from"')) + 5;
  linkstr = '<p><a href="./?id=' + id + '">' + vertices[lo].name + '</a></p>\n';
  result = [eltstring.slice(0, i), linkstr, eltstring.slice(i)].join('');
  vertices[up].element.html(result);
}

function addHTMLCats(element, cat) {
  let innerstr = element.html();
  let linkstr;
  if (cat == "sinf") {
    linkstr = '<p><a href="./?id=' + cat + '">' + "S Infinity" + '</a></p>';
  } else if (cat == "borel") {
    linkstr = '<p><a href="./?id=' + cat + '">' + "Borel" + '</a></p>';
  } else if (cat == "polish") {
    linkstr = '<p><a href="./?id=' + cat + '">' + "Polish group actions" + '</a></p>';
  } else {
    return;
  }
  
  element.html(innerstr + linkstr);
}