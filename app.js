const express = require('express');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const formidable = require('formidable');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const router = express.Router();
const app = express();

const schedule = require('node-schedule');
var job = schedule.scheduleJob('*/10 * * * *', () => {
  getDirs(__dirname + '/previews', dirs => {
    console.log(dirs);
    for (let i = 0; i < dirs.length; i++) {
      fs.stat(__dirname + '/sessions/' + dirs[i] + '.json', function (err, stat) {
        if (err == null) {
          // file exists
          console.log("file exists");
        } else if (err.code === 'ENOENT') {
          // file does not exist
          console.log("file does not exist");
          //console.log(__dirname + '/previews/' + dirs[i]);
          fs.remove(__dirname + '/previews/' + dirs[i], err => {
            if (err) throw err;
          });
        } else {
          throw err;
        }
      }.bind({dirs: dirs, i: i}));
    }
  });
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'reductions',
    store: new FileStore(),
    saveUninitialized: true,
    resave: false,
    genid:function(req){
      return uuidv4();
    },
}));

app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));

// Setup session variables
app.use((req, res, next) => {
  if (req.session === undefined || req.session.submitted === undefined) {
    req.session.submitted = false;
    req.session.preview = false;
  }
  next();
});

// Previewing changes to site
app.use('/preview', (req, res, next) => {
  if (req.session.submitted == true && req.session.preview == true) {
    return express.static(__dirname + '/previews/' + req.sessionID)(req, res, next);
  } else if (req.session.submitted == true && req.session.preview == false) {
    var basepath = 'previews/' + req.sessionID;
    const child = spawn('python', ['convert.py', basepath + '/equivtex/', basepath + '/equiv/']);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', result => {
      console.log('stderr:' + result)
    });
    child.on('exit', code => {
      console.log(`Exited with ${code}`);
      req.session.preview = true;
      res.redirect('/preview');
      
      next();
    });
  } else {
    res.redirect('/');
    next();
  }
});

// Display regularly by default
app.use('/', (req, res, next) => {
  if (req.path.slice(0, 8) !== '/preview') {
    console.log(req.path);
    return express.static(__dirname + '/site')(req, res, next);
  } else {
    next();
  }
});

// Submitting file
app.post('/submit', function (req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    var oldpath = files.uploadedfile.path;
    var newpath = __dirname + '/previews/' + req.sessionID + '/equivtex/' + files.uploadedfile.name;
    ensureExists(__dirname + '/previews/' + req.sessionID, 0777, function (err) {
      if (err) throw err;
      fs.copy(__dirname + '/site', __dirname + '/previews/' + req.sessionID, function (err) {
        if (err) throw err;
        fs.copyFile(__dirname + '/preview.css', __dirname + '/previews/' + req.sessionID + '/index.css', function (err) {
          if (err) throw err;
          fs.copyFile(oldpath, newpath, function (err) {
            if (err) throw err;
            fs.unlink(oldpath, function (err) {
              if (err) throw err;
            });
            req.session.submitted = true;
            req.session.preview = false;
            res.redirect('preview');
            res.end();
          });
        });
      }.bind({oldpath: oldpath, newpath: newpath}));
    }.bind({oldpath: oldpath, newpath: newpath, req: req}));
  });
});


 
// Listen
app.listen(process.env.PORT || 8080, () => {
    console.log(`App Started on PORT ${process.env.PORT || 8080}`);
});

// Helper functions

function ensureExists(path, mask, cb) {
    if (typeof mask == 'function') { // allow the `mask` parameter to be optional
        cb = mask;
        mask = 0777;
    }
    fs.mkdir(path, mask, function(err) {
        if (err) {
            if (err.code == 'EEXIST') cb(null); // ignore the error if the folder already exists
            else cb(err); // something else went wrong
        } else cb(null); // successfully created folder
    });
}

function getDirs(rootDir, cb) { 
    fs.readdir(rootDir, function(err, files) { 
        var dirs = []; 
        for (var index = 0; index < files.length; ++index) { 
            var file = files[index]; 
            if (file[0] !== '.') { 
                var filePath = rootDir + '/' + file; 
                fs.stat(filePath, function(err, stat) {
                    if (stat.isDirectory()) { 
                        dirs.push(this.file); 
                    } 
                    if (files.length === (this.index + 1)) { 
                        return cb(dirs); 
                    } 
                }.bind({index: index, file: file})); 
            }
        }
    });
}