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
const bcrypt = require('bcrypt');

const editJsonFile = require('edit-json-file');

const config = require(__dirname + '/config.js');

//const router = express.Router();
const app = express();

const mountUrl = process.env.MOUNT || '/'; // e.g. /~borelreducibility/

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
var job = schedule.scheduleJob('0 * * * *', () => {
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
    if (username === user.username) {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res == true) {
          return cb(null, user);
        } else {
          return cb(null, false);
        }
      });
    } else {
      return cb(null, false);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, cb) => {
  cb(null, config.users.find(x => x.id === id));
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
  if (req.url.endsWith('/submit')) {
    res.redirect(307, mountUrl + 'submit');
  } else if (req.url.endsWith('/approve')) {
    res.redirect(307, mountUrl + 'approve');
  } else if (req.url.endsWith('/reset')) {
    res.redirect(307, mountUrl + 'reset');
  } else {
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
          //res.write(result + '\n');
        });
        child.on('exit', code => {
          if (code != 0) {
            fs.unlink(__dirname + '/sessions/' + req.sessionID + '.json', (err) => {
              if (err) logger.error(err);
              res.write(`Exited with code ${code}, tex failed to compile`);
              res.end();
            });
          } else {
            obj = createEquivObject(req.session.fields, req.session.filename);
            
            if (!req.session.hasOwnProperty('equivdata')) {
              req.session.equivdata = [obj];
            } else {
              req.session.equivdata.push(obj);
            }
            
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
                res.redirect(mountUrl + 'preview');
                
                next();
              });
            });
          }
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
          if (code != 0) {
            fs.unlink(__dirname + '/sessions/' + req.sessionID + '.json', (err) => {
              if (err) logger.error(err);
              res.write(`Exited with code ${code}, tex failed to compile`);
              res.end();
            });
          } else {
            fs.readFile(__dirname + '/previews/' + req.sessionID + '/data.json', (err, data) => {
              if (err) logger.error(err);
              jsonstr = data.slice(data.indexOf('=') + 1);
              let json = JSON.parse(jsonstr);
              
              obj = createReducObject(req.session.fields, req.session.filename, json.equiv);
              
              if (!req.session.hasOwnProperty('reducdata')) {
                req.session.reducdata = [obj];
              } else {
                req.session.reducdata.push(obj);
              }
              
              json.reduc.push(obj);
              fs.writeFile(__dirname + '/previews/' + req.sessionID + '/data.json', "data = " + JSON.stringify(json), (err) => {
                if (err) logger.error(err);
                req.session.preview = true;
                while (req.session.submitted !== true || req.session.preview !== true) {
                  setTimeout(() => {}, 100);
                }
                res.redirect(mountUrl + 'preview');
                
                next();
              });
            });
          }
        });
      }
    } else {
      res.redirect(mountUrl);
      next();
    }
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

app.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err); }
    if (!user) { return res.redirect(mountUrl + 'login'); }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      req.session.save(() => {
        return res.redirect(mountUrl + 'admin/');
      });
    });
  })(req, res, next);
});

app.use('/admin/', (req, res, next) => {
  if (req.url.endsWith('/admin')) {
    res.redirect(307, mountUrl + 'admin/');
  }
  
  if (req.session.passport) {
    return express.static(__dirname + '/admin/')(req, res, next);
  } else {
    res.status('403').send("Forbidden");
  }
});

app.use('/admin/id/:id/', (req, res, next) => {
  if (req.url.endsWith('/submit')) {
    res.redirect(307, mountUrl + 'submit');
  } else if (req.url.endsWith('/approve')) {
    res.redirect(307, mountUrl + 'approve');
  } else if (req.url.endsWith('/reset')) {
    res.redirect(307, mountUrl + 'reset');
  } else {
    //res.send(`Your id is ${req.params.id}`);
    if (req.session.passport) {
      req.session.previewID = req.params.id;
      fs.readFile(__dirname + '/admin/admin.json', (err, result) => {
        if (err) logger.error(err);
        jsonstr = result.slice(result.indexOf('=') + 1);
        let data = JSON.parse(jsonstr);
        req.session.previewObj = data.sessionlist.find(x => x.id === req.params.id);
        req.session.save(() => {
          return express.static(__dirname + '/previews/' + req.params.id)(req, res, next);
        });
      });
    } else {
      res.status('403').send("Forbidden");
    }
  }
});

app.get('/admin/del/id/:id/', (req, res) => {
  if (req.session.passport) {
    // delete entry from admin.json
    fs.readFile(__dirname + '/admin/admin.json', (err, result) => {
      if (err) logger.error(err);
      jsonstr = result.slice(result.indexOf('=') + 1);
      let data = JSON.parse(jsonstr);
      data.sessionlist = data.sessionlist.filter(x => x.id !== req.params.id);
      fs.writeFile(__dirname + '/admin/admin.json', 'data = ' + JSON.stringify(data), (err) => {
        if (err) logger.error(err);
        // delete saved.txt
        fs.unlink(__dirname + '/previews/' + req.params.id + '/saved.txt', (err) => {
          if (err) logger.error(err);
          res.redirect(mountUrl + 'admin/');
        })
      })
    });
  } else {
    res.status('403').send('Forbidden');
  }
});

app.use('/admin/delete/id/:id/', (req, res, next) => {
  if (req.session.passport) {
    if (req.method == "POST") {
      // Confirmed deletion
      if (req.params.id.includes('-')) {
        // Reduction
        fs.unlink(__dirname + '/site/reductex/' + req.params.id + '.tex', (err) => {
          if (err) logger.error(err);
          fs.unlink(__dirname + '/site/reduc/' + req.params.id + '.html', (err) => {
            if (err) logger.error(err);
            fs.readFile(__dirname + '/site/data.json', (err, result) => {
              if (err) logger.error(err);
              jsonstr = result.slice(result.indexOf('=') + 1);
              let data = JSON.parse(jsonstr);
              var removeIndex = data.reduc.map(function(item) { return item.id; }).indexOf(req.params.id);
              ~removeIndex && data.reduc.splice(removeIndex, 1);
              fs.writeFile(__dirname + '/site/data.json', "data = " + JSON.stringify(data), (err) => {
                if (err) logger.error(err);
                res.redirect(mountUrl + 'admin/delete/');
              });
            });
          });
        });
      } else {
        // Equivalence
        fs.unlink(__dirname + '/site/equivtex/' + req.params.id + '.tex', (err) => {
          if (err) logger.error(err);
          fs.unlink(__dirname + '/site/equiv/' + req.params.id + '.html', (err) => {
            if (err) logger.error(err);
            fs.readFile(__dirname + '/site/data.json', (err, result) => {
              if (err) logger.error(err);
              jsonstr = result.slice(result.indexOf('=') + 1);
              let data = JSON.parse(jsonstr);
              var removeIndex = data.equiv.map(function(item) { return item.id; }).indexOf(req.params.id);
              ~removeIndex && data.equiv.splice(removeIndex, 1);
              fs.writeFile(__dirname + '/site/data.json', "data = " + JSON.stringify(data), (err) => {
                if (err) logger.error(err);
                res.redirect(mountUrl + 'admin/delete/');
              });
            });
          });
        });
      }
    } else if (req.method == "GET") {
      // Send confirmation of deletion
      res.write('<html><head><style>div {\nmargin: auto;\ntext-align: center\n}</style></head>');
      res.write(`<body><div>Are you sure you want to delete ${req.params.id}?</div>`);
      res.write('<form action="" method="post" id="delete" enctype="multipart/form-data">');
      res.write('<div><button onclick="location.href=\'../..\'">Cancel</button>');
      res.write('<button type="submit" form="delete" value="Delete">Delete</button></div></body>');
      res.end();
    }
  } else {
    res.status('403').send("Forbidden");
  }
});

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
        let newid = fields.id.toLowerCase();
        if (!/^[a-z]+$/.test(fields.id.toLowerCase())) {
          res.send(`Error: the id ${fields.id.toLowerCase()} must only contain lowercase letters`);
        }
        for (let i = 0; i < data.equiv.length; i++) {
          if (data.equiv[i].id === newid) {
            if (!req.session.passport) {
              res.send(`Error: The id ${newid} already exists`);
            } else {
              fs.unlink(__dirname + '/site/equiv/' + newid + '.html', (err) => {
                if (err) logger.error(err);
              });
            }
          }
        }
        
        req.session.submitted = true;
        req.session.preview = false;
        
        let newpath = __dirname + '/previews/' + req.sessionID + '/equivtex/' + newid + '.tex';
        ensureExists(__dirname + '/previews/' + req.sessionID, 0777, function (err, exists) {
          if (err) logger.error(err);
          if (!exists) {
            fs.copy(__dirname + '/site', __dirname + '/previews/' + req.sessionID, function (err) {
              if (err) logger.error(err);
              fs.copyFile(__dirname + '/preview.css', __dirname + '/previews/' + req.sessionID + '/index.css', function (err) {
                if (err) logger.error(err);
                let equivtemplate = '\\documentclass{article}\n';
                equivtemplate += '\\begin{document}\n'
                equivtemplate += `\\section{${fields.name}}\n`;
                equivtemplate += '\\subsection{Definition}\n';
                equivtemplate += fields.defn + '\n';
                equivtemplate += '\\subsection{History and Background}\n';
                equivtemplate += fields.history + '\n';
                equivtemplate += '\\subsection{Reducible to}\n';
                equivtemplate += `\\subsection{Equivalence Relations Reducible to ${fields.name}}\n`;
                equivtemplate += `\\subsection{Categories}\n`;
                equivtemplate += `\\end{document}`;
                fs.writeFile(newpath, equivtemplate, function (err) {
                  if (err) logger.error(err);
                  req.session.filename = newid + '.tex';
                  req.session.fields = fields;
                  req.session.new = [{ type: 'equiv', id: newid }];
                  req.session.submitted = true;
                  req.session.preview = false;
                  req.session.save(() => {
                    res.redirect(mountUrl + 'preview');
                  });
                });
              });
            });
          } else {
            let equivtemplate = '\\documentclass{article}\n';
            equivtemplate += '\\begin{document}\n'
            equivtemplate += `\\section{${fields.name}}\n`;
            equivtemplate += '\\subsection{Definition}\n';
            equivtemplate += fields.defn + '\n';
            equivtemplate += '\\subsection{History and Background}\n';
            equivtemplate += fields.history + '\n';
            equivtemplate += '\\subsection{Reducible to}\n';
            equivtemplate += `\\subsection{Equivalence Relations Reducible to ${fields.name}}\n`;
            equivtemplate += `\\subsection{Categories}\n`;
            equivtemplate += `\\end{document}`;
            fs.writeFile(newpath, equivtemplate, function (err) {
              if (err) logger.error(err);
              req.session.filename = newid + '.tex';
              req.session.fields = fields;
              req.session.new.push({ type: 'equiv', id: newid });
              req.session.submitted = true;
              req.session.preview = false;
              req.session.save(() => {
                res.redirect(mountUrl + 'preview');
              });
            });
          }
        });
      });
    });
  } else if (req.params.type === 'reduc') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      fs.readFile(__dirname + '/site/data.json', (err, result) => {
        if (err) logger.error(err);
        jsonstr = result.slice(result.indexOf('=') + 1);
        let data = JSON.parse(jsonstr);
        let newid = fields.upperselect + '-' + fields.lowerselect;
        for (let i = 0; i < data.reduc.length; i++) {
          if (data.reduc[i].id === newid) {
            if (!req.session.passport) {
              res.send(`Error: The reduction ${newid} already exists`);
            } else {
              fs.unlink(__dirname + '/site/reduc/' + newid + '.html', (err) => {
                if (err) logger.error(err);
              });
            }
          }
        }
        for (let i = 0; i < data.equiv.length; i++) {
          if (data.equiv[i].id === fields.upperselect) {
            fields.uppername = data.equiv[i].name;
          }
          if (data.equiv[i].id === fields.lowerselect) {
            fields.lowername = data.equiv[i].name;
          }
        }
        
        req.session.submitted = true;
        req.session.preview = false;
        
        let newpath = __dirname + '/previews/' + req.sessionID + '/reductex/' + newid + '.tex';
        ensureExists(__dirname + '/previews/' + req.sessionID, 0777, function (err, exists) {
          if (err) logger.error(err);
          if (!exists) {
            fs.copy(__dirname + '/site', __dirname + '/previews/' + req.sessionID, function (err) {
              if (err) logger.error(err);
              fs.copyFile(__dirname + '/preview.css', __dirname + '/previews/' + req.sessionID + '/index.css', function (err) {
                if (err) logger.error(err);
                let reductemplate = '\\documentclass{article}\n';
                reductemplate += '\\begin{document}\n'
                reductemplate += `\\section{Reduction of ${fields.uppername} to ${fields.lowername}}\n`;
                reductemplate += fields.proof;
                reductemplate += `\\end{document}`;
                fs.writeFile(newpath, reductemplate, function (err) {
                  if (err) logger.error(err);
                  req.session.filename = newid + '.tex';
                  req.session.fields = fields;
                  req.session.new = [{ type: 'reduc', id: newid }];
                  req.session.submitted = true;
                  req.session.preview = false;
                  req.session.save(() => {
                    res.redirect(mountUrl + 'preview');
                  });
                });
              });
            });
          } else {
            let reductemplate = '\\documentclass{article}\n';
            reductemplate += '\\begin{document}\n'
            reductemplate += `\\section{Reduction of ${fields.uppername} to ${fields.lowername}}\n`;
            reductemplate += fields.proof;
            reductemplate += `\\end{document}`;
            fs.writeFile(newpath, reductemplate, function (err) {
              if (err) logger.error(err);
              req.session.filename = newid + '.tex';
              req.session.fields = fields;
              req.session.new.push({ type: 'reduc', id: newid });
              req.session.submitted = true;
              req.session.preview = false;
              req.session.save(() => {
                res.redirect(mountUrl + 'preview');
              });
            });
          }
        });
      });
    });
  }
});

app.post('/approve', function (req, res) {
  if (req.session.passport) {
    let id;
    if (req.session.hasOwnProperty('previewID')) {
      id = req.session.previewID;
    } else {
      id = req.sessionID;
    }
    while (!id) {
      setTimeout(() => {}, 100);
    }
    let texpromises = req.session.previewObj.new.map(obj => {
      const source = __dirname + '/previews/' + id + '/' + obj.type + 'tex/' + obj.id + '.tex';
      const destination = __dirname + '/site/' + obj.type + 'tex/' + obj.id + '.tex';
      return copyFilePromise(source, destination);
    });
    let htmlpromises = req.session.previewObj.new.map(obj => {
      const source = __dirname + '/previews/' + id + '/' + obj.type + '/' + obj.id + '.html';
      const destination = __dirname + '/site/' + obj.type + '/' + obj.id + '.html';
      return copyFilePromise(source, destination);
    });
    const promises = texpromises.concat(htmlpromises);
    Promise.all(promises).then(() => {
      fs.readFile(__dirname + '/site/data.json', (err, result) => {
        if (err) logger.error(err);
        jsonstr = result.slice(result.indexOf('=') + 1);
        let data = JSON.parse(jsonstr);
        if (req.session.previewObj.equivdata) {
          data.equiv = data.equiv.concat(req.session.previewObj.equivdata);
        }
        if (req.session.previewObj.reducdata) {
          data.reduc = data.reduc.concat(req.session.previewObj.reducdata);
        }
        fs.writeFile(__dirname + '/site/data.json', 'data = ' + JSON.stringify(data), (err) => {
          if (err) logger.error(err);
          fs.unlink(__dirname + '/previews/' + id + '/saved.txt', (err) => {
            if (err) logger.error(err);
            fs.readFile(__dirname + '/admin/admin.json', (err, result) => {
              if (err) logger.error(err);
              jsonstr = result.slice(result.indexOf('=') + 1);
              let data = JSON.parse(jsonstr);
              data.sessionlist = data.sessionlist.filter(x => x.id !== id);
              fs.writeFile(__dirname + '/admin/admin.json', 'data = ' + JSON.stringify(data), (err) => {
                if (err) logger.error(err);
                logger.info('updated site with ' + req.session.previewObj.new.map(obj => obj.id).toString());
                res.redirect(mountUrl);
              });
            });
          });
        });
      });
    }).catch((err) => {
      logger.error(err);
    });
  } else {
    if (req.session.submitted == true && req.session.preview == true) {
      fs.writeFile(__dirname + '/previews/' + req.sessionID + '/saved.txt', req.sessionID + '/n', (err) => {
        if (err) logger.error(err);
        fs.readFile(__dirname + '/admin/admin.json', (err, result) => {
          if (err) logger.error(err);
          let adminjson = JSON.parse(result.slice(7));
          var now = new Date();
          adminjson.sessionlist.push({ id: req.sessionID, timestamp: `${now.toLocaleString('en-US')}`, new: req.session.new, equivdata: req.session.equivdata, reducdata: req.session.reducdata });
          let data = JSON.stringify(adminjson);
          console.log(data);
          fs.writeFile(__dirname + '/admin/admin.json', 'data = ' + data, (err) => {
            if (err) logger.error(err);
            fs.unlink(__dirname + '/sessions/' + req.sessionID + '.json', (err) => {
              if (err) logger.error(err);
              res.redirect(mountUrl);
            });
          });
        });
      });
    } else {
      res.redirect(mountUrl);
    }
  }
});

app.use('/reset', (req, res, next) => {
  fs.unlink(__dirname + '/sessions/' + req.sessionID + '.json', (err) => {
    if (err) logger.error(err);
    res.redirect(mountUrl + 'submit');
  });
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
            if (err.code == 'EEXIST') cb(null, true); // ignore the error if the folder already exists
            else cb(err, null); // something else went wrong
        } else cb(null, false); // successfully created folder
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

function createReducObject(fields, name, equivlist) {
  obj = {};
  for (var i = 0; i < equivlist.length; i++) {
    if (equivlist[i].id === fields.upperselect) {
      obj.upperlabel = equivlist[i].label;
    }
    if (equivlist[i].id === fields.lowerselect) {
      obj.lowerlabel = equivlist[i].label;
    }
  }
  obj.id = name.slice(0, name.indexOf('.'));
  if (fields.countable) {
    obj.countable = true;
  }
  if (fields.type === 'strict') {
    obj.edgetype = 'arrow';
  } else if (fields.type === 'bireduction') {
    obj.edgetype = 'doublearrow';
  } else if (fields.type === 'neither') {
    obj.edgetype = 'solid';
  }
  return obj;
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

function copyFilePromise(source, destination) {
    const input = fs.createReadStream(source);
    const output = fs.createWriteStream(destination);
    return new Promise((resolve, reject) => {

        output.on('error', reject);
        input.on('error', reject);
        input.on('end', resolve);
        input.pipe(output);
    });
}