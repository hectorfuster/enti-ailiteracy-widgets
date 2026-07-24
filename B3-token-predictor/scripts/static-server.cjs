const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const port = Number(process.argv[2]) || 4174;
const root = path.resolve(__dirname, "..");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url, `http://127.0.0.1:${port}`).pathname;
  const relativePath =
    requestPath === "/" ? "index.html" : requestPath.slice(1);
  const resolvedPath = path.resolve(root, relativePath);

  if (!resolvedPath.startsWith(`${root}${path.sep}`) && resolvedPath !== root) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(resolvedPath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type":
        contentTypes[path.extname(resolvedPath)] || "application/octet-stream",
    });
    fs.createReadStream(resolvedPath).pipe(response);
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`B3 server listening on http://127.0.0.1:${port}/\n`);
});
