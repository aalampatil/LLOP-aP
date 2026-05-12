import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { clerkMiddleware } from "@clerk/express";
import { userRouter } from "./modules/user/user.routes";
import { pollRouter } from "./modules/poll/poll.routes";
import { adminRouter } from "./modules/admin/admin.routes";
import { registerSocketHandlers } from "./socket";
import { env } from "./env";
import { initIO } from "./lib/socket";
import { closeSocketPubSub, setupSocketPubSub } from "./lib/socket-adapter";
import { errorHandler } from "./lib/http";
import { startPollExpiryJob } from "./jobs/expire-polls";

const app = express();
const server = createServer(app);

// ── Export io so controllers can use getIO() ──────────────
const io = new Server(server, {
  cors: { origin: env.CLIENT },
});

initIO(io);

async function main() {
  const port = Number(env.PORT || 3000);
  await setupSocketPubSub(io);
  registerSocketHandlers(io);

  app.use(
    cors({
      origin: env.CLIENT || "https://llop-ap.aalampatil.online",
      credentials: true,
    }),
  );
  app.use(clerkMiddleware());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (req, res) => {
    return res.send("I'm up and running");
  });
  app.get("/", (req, res) => {
    return res.send("LLOP-aP");
  });

  app.use("/api/user", userRouter);
  app.use("/api/poll", pollRouter);
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);
  const stopPollExpiryJob = startPollExpiryJob();

  server.listen(port, () => {
    console.log(`server is listening on http://localhost:${port}`);
  });

  const shutdown = async () => {
    stopPollExpiryJob();
    await closeSocketPubSub();
    server.close(() => process.exit(0));
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main();
