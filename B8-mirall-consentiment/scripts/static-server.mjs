import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 43178);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", `http://${host}:${port}`);
      const relative = decodeURIComponent(
        requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname,
      ).replace(/^\/+/, "");
      const filePath = resolve(root, relative);
      if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }

      const bytes = await readFile(filePath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
        "Content-Type":
          contentTypes[extname(filePath).toLowerCase()] ||
          "application/octet-stream",
        "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      });
      response.end(bytes);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
}

export async function startStaticServer() {
  const server = createStaticServer();
  await new Promise((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(port, host, resolvePromise);
  });
  console.log(`B8 test server listening at http://${host}:${port}`);
  return server;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await startStaticServer();
}
