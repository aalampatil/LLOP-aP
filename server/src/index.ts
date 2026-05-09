console.log("Hello from Bun!");
import { createServer } from "node:http";
import express from "express";
import { Server } from "socket.io";

async function main() {
  const app = express();
  const port = 3000;
  const io = new Server();
  const server = createServer(app);

  io.attach(server);

  app.get("/health", (req, res) => {
    return res.send("I'm up and running");
  });
  app.get("/", (req, res) => {
    return res.send("LLOP-aP");
  });

  server.listen(port, () => {
    console.log(`server is listening on http://localhost:${port}`);
  });
}

main();
