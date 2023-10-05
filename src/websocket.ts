import { Server, ServerWebSocket } from "bun";
import k from "kleur";
import { createCounter } from "./counter";

type WebSocketParams = {
  server: Server;
  connectPathname: string;
};

export const createWebsocketHandlers = ({ server, connectPathname }: WebSocketParams) => {
  const counter = createCounter();

  return {
    logAvailableWs: () => {
      console.log(k.yellow("Available websocket:"));
      console.log(
        `- ${k.green(
          `ws://${server.hostname}:${server.port}${connectPathname}?channel=CHANNEL_NAME`,
        )}`,
      );
    },
    handleRequest: (request: Request) => {
      const url = new URL(request.url);

      if (url.pathname === connectPathname) {
        const channelName = url.searchParams.get("channel");
        if (!channelName) {
          return new Response('Missing "channel" in search params', {
            status: 400,
          });
        }

        const success = server.upgrade(request, { data: { channelName } });

        if (!success) {
          return new Response("Connection refused", { status: 400 });
        }

        return new Response("Connected");
      }

      if (url.pathname === `${connectPathname}/count`) {
        return new Response(JSON.stringify(counter.get()), {
          headers: {
            "content-type": "application/json",
          },
        });
      }
    },
    open: (ws: ServerWebSocket<{ channelName: string }>) => {
      const { channelName } = ws.data;
      ws.subscribe(channelName);
      counter.increment(channelName);
      console.log(`New connection to channel ${channelName}`);
    },
    close: (ws: ServerWebSocket<{ channelName: string }>) => {
      const { channelName } = ws.data;
      ws.subscribe(channelName);
      counter.increment(channelName);
      console.log(`Connection closed to channel ${channelName}`);
    },
    // More info about returned value here: https://bun.sh/docs/api/websockets#backpressure
    publish: (channel: string, message: string) => {
      return server.publish(channel, message);
    },
  };
};
