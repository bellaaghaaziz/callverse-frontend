import { Client } from "@stomp/stompjs";
import { getToken } from "@/lib/session";

let client: Client | null = null;

export function getStompClient(): Client {
  if (client) return client;

  client = new Client({
    brokerURL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws",
    connectHeaders: { Authorization: `Bearer ${getToken()}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: () => {
      if (client) client.connectHeaders = { Authorization: `Bearer ${getToken()}` };
    },
  });
  client.activate();
  return client;
}

/** Close the live connection and forget it, so the next user starts fresh. */
export function disconnectStomp(): void {
  if (!client) return;
  const current = client;
  client = null;
  void current.deactivate();
}
