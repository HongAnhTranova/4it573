var http = require("http");
var fs = require("fs");
var path = require("path");

var mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};

var dir = __dirname;

var server = http.createServer(function (req, res) {
  if (req.url === "/") {
    var indexPath = path.join(dir, "index.html");
    fs.readFile(indexPath, function (err, data) {
      if (err) {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Chyba serveru");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(data);
    });
    return;
  }

  var filePath = path.join(dir, "public", req.url);
  var ext = path.extname(filePath);
  var contentType = mimeTypes[ext] || "application/octet-stream";

  fs.readFile(filePath, function (err, data) {
    if (err) {
      fs.readFile(path.join(dir, "404.html"), function (err2, data404) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(err2 ? "404 - Stranka nenalezena" : data404);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(3000, function () {
  console.log("Server bezi na http://localhost:3000");
});
