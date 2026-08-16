import { createServer, type Server } from "node:http";
import type { Client } from "discord.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export function startHealthServer(client: Client): Server {
  const server = createServer((request, response) => {
    if (request.url !== "/" && request.url !== "/health") {
      response.writeHead(404).end("Not found");
      return;
    }

    const ready = client.isReady();
    response.writeHead(ready ? 200 : 503, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({
      status: ready ? "online" : "starting",
      bot: client.user?.tag ?? null,
      guilds: client.guilds.cache.size,
      uptimeSeconds: Math.floor(process.uptime()),
    }));
  });

  server.listen(env.HEALTH_PORT, "0.0.0.0", () => {
    logger.info(`Health check disponível na porta ${env.HEALTH_PORT}.`);
  });
  return server;
}
