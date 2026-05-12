import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import type { Server } from "socket.io";
import { env } from "../env";

let pubClient: Redis | null = null;
let subClient: Redis | null = null;

export async function setupSocketPubSub(io: Server) {
  pubClient = new Redis(env.VALKEY_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });
  subClient = pubClient.duplicate();

  pubClient.on("error", (error) => {
    console.warn(`Socket pub client unavailable: ${error.message}`);
  });
  subClient.on("error", (error) => {
    console.warn(`Socket sub client unavailable: ${error.message}`);
  });

  try {
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    console.log("Socket.IO pub/sub adapter connected through Valkey");
  } catch (error) {
    console.warn(
      error instanceof Error
        ? `Socket.IO Valkey pub/sub disabled: ${error.message}`
        : "Socket.IO Valkey pub/sub disabled",
    );
    await closeSocketPubSub();
  }
}

export async function closeSocketPubSub() {
  const clients = [pubClient, subClient].filter(Boolean) as Redis[];
  pubClient = null;
  subClient = null;
  await Promise.all(
    clients.map((client) =>
      client.quit().catch(() => {
        client.disconnect();
      }),
    ),
  );
}
