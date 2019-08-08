const express = require('express');
const session = require('express-session');
const uuidv4 = require('uuid/v4');
const formidable = require('formidable');
const fs = require('fs-extra');
const { spawn } = require('child_process');
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const editJsonFile = require('edit-json-file');

const config = require(__dirname + '/config.js');

//const router = express.Router();
const app = express();

const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'user-service' },
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log` 
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'error.log', level: 'error', timestamp: true }),
    new winston.transports.File({ filename: 'combined.log', timestamp: true })
  ]
});
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const schedule = require('node-schedule');
var job = schedule.scheduleJob('*/10 * * * *', () => {
  getDirs(__dirname + '/previews', dirs => {
    for (let i = 0; i < dirs.length; i++) {
      logger.info(dirs[i]);
      fs.stat(__dirname + '/sessions/' + dirs[i] + '.json', function (err, stat) {
        if (err == null) {
          // file exists
          logger.info("  file exists");
        } else if (err.code === 'ENOENT') {
          // file does not exist
          logger.info("  file does not exist");
          fs.stat(__dirname + '/previews/' + dirs[i] + '/saved.txt', function (err, stat) {
            if (err == null) {
              // saved.txt exists
              logger.info("    saved session");
            } else if (err.code === 'ENOENT') {
              // saved.txt does not exist
              logger.info("    deleting session");
              fs.remove(__dirname + '/previews/' + dirs[i], err => {
                if (err) logger.error(err);
              });
            } else {
              logger.error(err);
            }
          });
          
        } else {
          logger.error(err);
        }
      }.bind({dirs: dirs, i: i}));
    }
  });
});

// Configure passport
passport.use(new LocalStrategy(
  function (username, password, cb) {
    const user = config.users[0];
    if (username === user.username && password === user.password) {
      return cb(null, user);
    } else {
      return cb(null, false);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, cb) => {
  cb(null, config.users[0]);
});


app.use(bodyParser.json());      
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
    secret: process.env.SESSION_SECRET || 'reductions',
    store: new FileStore(),
    saveUninitialized: true,
    resave: false,
    genid:function(req){
      return uuidv4();
    },
}));

app.use(passport.initialize());
app.use(passport.session());

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
  //console.log(req.session.submitted);
  if (req.session.submitted == true && req.session.preview == true) {
    return express.static(__dirname + '/previews/' + req.sessionID)(req, res, next);
  } else if (req.session.submitted == true && req.session.preview == false) {
    if (req.session.type === 'equiv') {
      var basepath = 'previews/' + req.sessionID;
      let prog;
      if (process.platform === "win32") {
        prog = 'python';
      } else {
        prog = 'python3';
      }
      while (prog === undefined) {
        setTimeout(() => {}, 50);
      }
      const child = spawn(prog, ['convert.py', basepath + '/equivtex/', basepath + '/equiv/']);
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', result => {
        //console.log('stderr:' + result)
      });
      child.on('exit', code => {
        //console.log(`Exited with ${code}`);
        obj = createEquivObject(req.session.fields, req.session.filename);
        fs.readFile(__dirname + '/previews/' + req.sessionID + '/data.json', (err, data) => {
          if (err) logger.error(err);
          jsonstr = data.slice(data.indexOf('=') + 1);
          let json = JSON.parse(jsonstr);
          json.equiv.push(obj);
          fs.writeFile(__dirname + '/previews/' + req.sessionID + '/data.json', "data = " + JSON.stringify(json), (err) => {
            if (err) logger.error(err);
            req.session.preview = true;
            while (req.session.submitted !== true || req.session.preview !== true) {
              setTimeout(() => {}, 100);
            }
            res.redirect('/preview');
            
            next();
          });
        });
      });
    } else if (req.session.type === 'reduc') {
      var basepath = 'previews/' + req.sessionID;
      let prog;
      if (process.platform === "win32") {
        prog = 'python';
      } else {
        prog = 'python3';
      }
      while (prog === undefined) {
        setTimeout(() => {}, 50);
      }
      const child = spawn(prog, ['convert.py', basepath + '/reductex/', basepath + '/reduc/']);
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', result => {
        //console.log('stderr:' + result)
      });
      child.on('exit', code => {
        //console.log(`Exited with ${code}`);
        obj = createReducObject(req.session.fields, req.session.filename);
        fs.readFile(__dirname + '/previews/' + req.sessionID + '/data.json', (err, data) => {
          if (err) logger.error(err);
          jsonstr = data.slice(data.indexOf('=') + 1);
          let json = JSON.parse(jsonstr);
          json.reduc.push(obj);
          fs.writeFile(__dirname + '/previews/' + req.sessionID + '/data.json', "data = " + JSON.stringify(json), (err) => {
            if (err) logger.error(err);
            req.session.preview = true;
            while (req.session.submitted !== true || req.session.preview !== true) {
              setTimeout(() => {}, 100);
            }
            res.redirect('/preview');
            
            next();
          });
        });
      });
    }
  } else {
    res.redirect('/');
    next();
  }
});

// Display regularly by default
app.use('/', (req, res, next) => {
  if (req.path.slice(0, 8) !== '/preview') {
    //console.log(req.path);
    return express.static(__dirname + '/site')(req, res, next);
  } else {
    next();
  }
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
  res.end();
});

app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/admin');
  }
);

app.use('/admin/', (req, res, next) => {
  if (req.url.endsWith('/admin')) {
    res.redirect(301, '/admin/');
  }
  
  if (req.session.passport) {
    return express.static(__dirname + '/admin/')(req, res, next);
  } else {
    res.status('403').send("Forbidden");
  }
});

app.use('/admin/id/:id/', (req, res, next) => {
  //res.send(`Your id is ${req.params.id}`);
  return express.static(__dirname + '/previews/' + req.params.id)(req, res, next);
})

// Submitting file
app.post('/submit/type/:type/', function (req, res) {
  req.session.type = req.params.type;
  if (req.params.type === 'equiv') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      fs.readFile(__dirname + '/site/data.json', (err, result) => {
        if (err) logger.error(err);
        jsonstr = result.slice(result.indexOf('=') + 1);
        let data = JSON.parse(jsonstr);
        let newid = files.uploadedfile.name.slice(0, files.uploadedfile.name.indexOf('.'));
        for (let i = 0; i < data.equiv.length; i++) {
          if (data.equiv[i].id === newid) {
            res.send(`Error: The file ${files.uploadedfile.name} already exists`);
          }
        }
        
        req.session.submitted = true;
        req.session.preview = false;
        
        var oldpath = files.uploadedfile.path;
        var newpath = __dirname + '/previews/' + req.sessionID + '/equivtex/' + files.uploadedfile.name;
        ensureExists(__dirname + '/previews/' + req.sessionID, 0777, function (err) {
          if (err) logger.error(err);
          fs.copy(__dirname + '/site', __dirname + '/previews/' + req.sessionID, function (err) {
            if (err) logger.error(err);
            fs.copyFile(__dirname + '/preview.css', __dirname + '/previews/' + req.sessionID + '/index.css', function (err) {
              if (err) logger.error(err);
              fs.copyFile(oldpath, newpath, function (err) {
                if (err) logger.error(err);
                fs.unlink(oldpath, function (err) {
                  if (err) logger.error(err);
                });
                req.session.filename = files.uploadedfile.name;
                req.session.fields = fields;
                req.session.submitted = true;
                req.session.preview = false;
                while (req.session.submitted !== true || req.session.preview !== false) {
                  setTimeout(() => {}, 200);
                }
                res.redirect('/preview');
              });
            });
          }.bind({oldpath: oldpath, newpath: newpath}));
        }.bind({oldpath: oldpath, newpath: newpath}));
      });
    });
  } else if (req.params.type === 'reduc') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      fs.readFile(__dirname + '/site/data.json', (err, result) => {
        if (err) logger.error(err);
        jsonstr = result.slice(result.indexOf('=') + 1);
        let data = JSON.parse(jsonstr);
        let newid = files.uploadedfile.name.slice(0, files.uploadedfile.name.indexOf('.'));
        for (let i = 0; i < data.reduc.length; i++) {
          if (data.reduc[i].id === newid) {
            res.send(`Error: The file ${files.uploadedfile.name} already exists`);
          }
        }
        
        req.session.submitted = true;
        req.session.preview = false;
        
        var oldpath = files.uploadedfile.path;
        var newpath = __dirname + '/previews/' + req.sessionID + '/reductex/' + files.uploadedfile.name;
        ensureExists(__dirname + '/previews/' + req.sessionID, 0777, function (err) {
          if (err) logger.error(err);
          fs.copy(__dirname + '/site', __dirname + '/previews/' + req.sessionID, function (err) {
            if (err) logger.error(err);
            fs.copyFile(__dirname + '/preview.css', __dirname + '/previews/' + req.sessionID + '/index.css', function (err) {
              if (err) logger.error(err);
              fs.copyFile(oldpath, newpath, function (err) {
                if (err) logger.error(err);
                fs.unlink(oldpath, function (err) {
                  if (err) logger.error(err);
                });
                req.session.filename = files.uploadedfile.name;
                req.session.fields = fields;
                req.session.submitted = true;
                req.session.preview = false;
                while (req.session.submitted !== true || req.session.preview !== false) {
                  setTimeout(() => {}, 200);
                }
                res.redirect('/preview');
              });
            });
          }.bind({oldpath: oldpath, newpath: newpath}));
        }.bind({oldpath: oldpath, newpath: newpath}));
      });
    });
  }
});

app.post('/approve', function (req, res) {
  if (req.session.submitted == true && req.session.preview == true) {
    fs.writeFile(__dirname + '/previews/' + req.sessionID + '/saved.txt', req.sessionID + '/n', (err) => {
      if (err) logger.error(err);
      fs.readFile(__dirname + '/admin/admin.json', (err, result) => {
        if (err) logger.error(err);
        let adminjson = JSON.parse(result.slice(7));
        var now = new Date();
        adminjson.sessionlist.push({ id: req.sessionID, timestamp: `${now.toLocaleString('en-US')}` });
        let data = JSON.stringify(adminjson);
        console.log(data);
        fs.writeFile(__dirname + '/admin/admin.json', 'data = ' + data, (err) => {
          if (err) logger.error(err);
          fs.unlink(__dirname + '/sessions/' + req.sessionID + '.json', (err) => {
            if (err) logger.error(err);
              res.redirect('/');
          });
        });
      });
    });
  } else {
    res.redirect('/');
  }
});
 
// Listen
app.listen(process.env.PORT || 8080, () => {
    logger.info(`App Started on PORT ${process.env.PORT || 8080}`);
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

function createEquivObject(fields, name) {
  obj = {};
  obj.name = fields.name;
  obj.label = fields.label;
  obj.labeloffset = [0,0];
  obj.pos = [parseInt(fields.x), parseInt(fields.y)];
  obj.id = name.slice(0, name.indexOf('.'));
  obj.categories = [];
  if (fields.sinf === 'sinf') {
    obj.categories.push('sinf');
  }
  if (fields.borel === 'borel') {
    obj.categories.push('borel');
  }
  if (fields.polish === 'polish') {
    obj.categories.push('polish');
  }
  if (fields.countable === 'countable') {
    obj.categories.push('countable');
  }
  return obj;
}

function createReducObject(fields, name) {
  obj = {};
  obj.upperlabel = fields.upper;
  obj.lowerlabel = fields.lower;
  obj.id = name.slice(0, name.indexOf('.'));
  if (fields.countable) {
    obj.countable = true;
  }
  if (fields.type === 'strict') {
    obj.edgetype = 'arrow';
  } else if (fields.type === 'bireduction') {
    obj.edgetype = 'solid';
  } else if (fields.type === 'neither') {
    obj.edgetype = 'doublearrow';
  }
  return obj;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}