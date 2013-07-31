var express = require('express'),
    path = require('path'),
    fs = require('fs'),
    request = require('request');

var tmpdir = process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp',
    port = process.env.VCAP_APP_PORT || 8000,
    maxage = 60 * 60 * 24, // 1 day
    deleteTimeout = 60 * 1000, // 1 min
    deleteTimers = {},
    app = express();

app.use(express.bodyParser({ keepExtensions: true, uploadDir: tmpdir }));

function deleteFile(filename) {
  clearTimeout(deleteTimers[filename]);
  delete deleteTimers[filename];

  fs.exists(filename, function(exists) {
    if (exists) {
      fs.unlink(filename);
    }
  });
}

function setDownload(filepath) {
  var filename = path.basename(filepath);

  deleteTimers[filepath] = setTimeout(deleteFile.bind(null, filepath),
    deleteTimeout);

  return '<a href="/download/' + filename + '">' + filename + '</a>';
}

function upload(cb, req, res) {
  var url = (req.params && req.params[0]) || (req.query && req.query.url),
      ext = path.extname(url),
      tmpfile = Array.apply(0, Array(2)).reduce(function(p) {
        return p + (Math.random() * 1e18).toString(36);
      }, '');

  tmpfile = path.join(tmpdir, tmpfile + ext);
  
  request.get(url, function(err, response) {
    var status = response && response.statusCode;

    if (err || status !== 200) {
      res.status(err && 500 || status).send(err || status);
    } else if (cb) {
      cb(tmpfile);
    } else {
      res.send(setDownload(tmpfile));
    }
  }).pipe(fs.createWriteStream(tmpfile));
}

function download(req, res) {
  var filepath = path.join(tmpdir, req.params.filename);

  fs.exists(filepath, function(exists) {
    if (exists) {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=' + maxage,
        'Expires': new Date(new Date().getTime() +
          (maxage * 1000)).toUTCString()
      });
      fs.createReadStream(filepath).pipe(res).on('finish', function() {
        deleteFile(filepath);
      });
    } else {
      res.send(404);
    }
  });
}

function upAndDown(req, res) {
  upload(function(filename) {
    download({params: {filename: path.basename(filename)}}, res);
  }, req, res);
}

app.get('/favicon.ico', function(req, res) {
  res.sendfile(path.join(__dirname, 'favicon.ico'), {
    maxage: 1000 * 60 * 60 * 24 * 180 // 6 months
  });
});

// uploads
app.post('/upload', function(req, res) {
  res.send(setDownload(req.files.img.path));
});
app.get('/upload/:url', upload.bind(null, null));
app.get('/upload', upload.bind(null, null));

// download
app.get('/download/:filename', download);

// upload then download
app.get(/^\/(.+)$/, upAndDown);
app.get('/', function(req, res) {
  if (req.query && req.query.url) {
    return upAndDown(req, res);
  }
  // default form
  res.send(
    '<form method="post" action="/upload" enctype="multipart/form-data">' +
    '<input name="img" type="file"><input type="submit">' +
    '</form>' +
    '<form method="get" action="/upload">' +
    '<input name="url" placeholder="url"><input type="submit">' +
    '</form>'
  );
});

app.listen(port);
console.log('server listening on port %s', port);
