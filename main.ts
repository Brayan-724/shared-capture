import { serve } from "https://deno.land/std@0.182.0/http/server.ts";
import { serveFile } from "https://deno.land/std@0.182.0/http/file_server.ts";

const sockets = new Map<string, WebSocket>();
const chunks: ArrayBuffer[] = [];

await serve((req) => {
  const url = new URL(req.url);
  if (url.pathname === "/") return serveFile(req, "./client/index.html");
  if (url.pathname === "/client.js") {
    return serveFile(req, "./client/client.js");
  }
  if (url.pathname === "/ws") {
    return http_ws(req);
  }

  return Response.redirect(new URL("/", url), 301);
}, {
  onListen(params) {
    console.log(`Server started at http://${params.hostname}:${params.port}`);
  },
  hostname: "127.0.0.1",
  port: 4987,
});

function http_ws(req: Request) {
  const { socket, response } = Deno.upgradeWebSocket(req);
  const id = response.headers.get("sec-websocket-accept");

  if (!id) throw new Error("NO ID. Deno upgrade error");

  socket.onopen = async () => {
    console.log("Socket connected:", id);
    sockets.set(id, socket);
    socket.send("open:" + id);
    socket.send(await (new Blob(chunks)).arrayBuffer());
  };
  socket.onmessage = (event) => {
    sockets.forEach((socket, socketId) => {
      if (socketId === id) return;
      if (typeof event.data === "object") chunks.push(event.data);
      socket.send(event.data);
    });
  };
  socket.onerror = (ev) => {
    console.error(ev);
    socket.close(1, "Error detected");
    sockets.delete(id);
  };
  socket.onclose = () => {
    console.log("Socket has been disconnected:", id);
    sockets.delete(id);
  };
  return response;
}
