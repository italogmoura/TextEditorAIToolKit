import { createServer } from "http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(
    { maxHeaderSize: 65536 },
    (req, res) => {
      handle(req, res);
    }
  );

  const io = new SocketIOServer(server, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[socket.io] Client disconnected: ${socket.id}`);
    });

    socket.on("agent:start", (data) => {
      console.log(`[socket.io] Agent start requested:`, data);
    });

    socket.on("chat:message", (data) => {
      console.log(`[socket.io] Chat message:`, data);
    });
  });

  (globalThis as Record<string, unknown>).__socketIO = io;

  server.listen(port, () => {
    console.log(`> TextEditor AI ToolKit running on http://localhost:${port}`);
    console.log(`> Socket.io server ready`);
    console.log(`> Environment: ${dev ? "development" : "production"}`);
  });
});
