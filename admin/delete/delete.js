window.onload = function () {
  var col = [];
  for (var i = 0; i < data.equiv.length; i++) {
      for (var key in data.equiv[i]) {
          if (col.indexOf(key) === -1) {
              col.push(key);
          }
      }
  }

  // CREATE DYNAMIC TABLE.
  var table = document.createElement("table");

  // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

  var tr = table.insertRow(-1);                   // TABLE ROW.

  for (var i = 0; i < col.length; i++) {
      var th = document.createElement("th");      // TABLE HEADER.
      th.innerHTML = col[i];
      tr.appendChild(th);
  }

  // ADD JSON data.equiv TO THE TABLE AS ROWS.
  for (var i = 0; i < data.equiv.length; i++) {

      tr = table.insertRow(-1);

      for (var j = 0; j < col.length; j++) {
          var tabCell = tr.insertCell(-1);
          var celldata = data.equiv[i][col[j]];
          if (col[j] !== 'id') {
            tabCell.innerHTML = celldata;
          } else {
            tabCell.innerHTML = `<a href="id/${celldata}/">${celldata}</a>`;
          }
      }
  }

  // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON data.equiv TO A CONTAINER.
  var divContainer = document.getElementById('equivData');
  divContainer.innerHTML = "";
  divContainer.appendChild(table);
  
  
  // REPEAT FOR REDUC DATA
  var col = [];
  for (var i = 0; i < data.reduc.length; i++) {
      for (var key in data.reduc[i]) {
          if (col.indexOf(key) === -1) {
              col.push(key);
          }
      }
  }

  // CREATE DYNAMIC TABLE.
  var table = document.createElement("table");

  // CREATE HTML TABLE HEADER ROW USING THE EXTRACTED HEADERS ABOVE.

  var tr = table.insertRow(-1);                   // TABLE ROW.

  for (var i = 0; i < col.length; i++) {
      var th = document.createElement("th");      // TABLE HEADER.
      th.innerHTML = col[i];
      tr.appendChild(th);
  }

  // ADD JSON data.reduc TO THE TABLE AS ROWS.
  for (var i = 0; i < data.reduc.length; i++) {

      tr = table.insertRow(-1);

      for (var j = 0; j < col.length; j++) {
          var tabCell = tr.insertCell(-1);
          var celldata = data.reduc[i][col[j]];
          if (col[j] !== 'id') {
            tabCell.innerHTML = celldata;
          } else {
            tabCell.innerHTML = `<a href="id/${celldata}/">${celldata}</a>`;
          }
      }
  }

  // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON data.reduc TO A CONTAINER.
  var divContainer = document.getElementById('reducData');
  divContainer.innerHTML = "";
  divContainer.appendChild(table);
}