window.onload = function () {
  var col = [];
  for (var i = 0; i < data.sessionlist.length; i++) {
      for (var key in data.sessionlist[i]) {
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
    if (col[i] !== 'new') {
      var th = document.createElement("th");      // TABLE HEADER.
      th.innerHTML = col[i];
      tr.appendChild(th);
    }
  }
  
  var th = document.createElement("th");
  th.innerHTML = "Delete";
  tr.appendChild(th);

  // ADD JSON data.sessionlist TO THE TABLE AS ROWS.
  for (var i = 0; i < data.sessionlist.length; i++) {

      tr = table.insertRow(-1);

      for (var j = 0; j < col.length; j++) {
        if (col[j] !== 'new') {
          var tabCell = tr.insertCell(-1);
          var celldata = data.sessionlist[i][col[j]];
          if (col[j] == 'id') {
            tabCell.innerHTML = `<a href="id/${celldata}/">${celldata}</a>`;
            var id = celldata;
          } else if (col[j] == 'equivdata' || col[j] == 'reducdata') {
            if (celldata) {
              tabCell.innerHTML = celldata.map(obj => obj.id).join(', ');
            } else {
              tabCell.innerHTML = "";
            }
          } else {
            tabCell.innerHTML = celldata;
          }
        }
      }
      var tabCell = tr.insertCell(-1);
      tabCell.innerHTML = `<a href="del/id/${id}/">Delete submission</a>`;
  }

  // FINALLY ADD THE NEWLY CREATED TABLE WITH JSON data.sessionlist TO A CONTAINER.
  var divContainer = document.getElementById('showData');
  divContainer.innerHTML = "";
  divContainer.appendChild(table);
}