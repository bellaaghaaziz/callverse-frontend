import { Client, type StompSubscription } from "@stomp/stompjs";
type Listener = {
  topic: string;
  receive: (event: unknown) => void;
  subscription?: StompSubscription;
};
const listeners = new Map<number, Listener>();
let nextId = 0;
let client: Client | null = null;
export type ConnectionState =
  "disconnected" | "connecting" | "connected" | "error";
let state: ConnectionState = "disconnected";
const stateListeners = new Set<() => void>();
function updateState(next: ConnectionState) {
  state = next;
  stateListeners.forEach((listener) => listener());
}
export const connectionSnapshot = () => state;
export const serverConnectionSnapshot = (): ConnectionState => "disconnected";
export function watchConnection(listener: () => void) {
  stateListeners.add(listener);
  return () => {
    stateListeners.delete(listener);
  };
}
function attach(listener: Listener) {
  if (!client?.connected) return;
  listener.subscription = client.subscribe(listener.topic, (frame) => {
    try {
      const event: unknown = JSON.parse(frame.body);
      if (
        typeof event === "object" &&
        event !== null &&
        "schemaVersion" in event &&
        event.schemaVersion === 1
      )
        listener.receive(event);
    } catch {
      updateState("error");
    }
  });
}
export function getStompClient(): Client {
  if (client) return client;
  updateState("connecting");
  const created = new Client({
    brokerURL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws",
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    beforeConnect: () => {
      const token = sessionStorage.getItem("jwt");
      if (client !== created) return;
      created.connectHeaders = token
        ? { Authorization: `Bearer ${token}` }
        : {};
      updateState("connecting");
    },
    onConnect: () => {
      if (client !== created) return;
      listeners.forEach(attach);
      updateState("connected");
      window.dispatchEvent(new Event("callverse:reconnected"));
    },
    onWebSocketClose: () => {
      if (client !== created) return;
      listeners.forEach((listener) => {
        listener.subscription = undefined;
      });
      updateState("disconnected");
    },
    onWebSocketError: () => {
      if (client === created) updateState("error");
    },
    onStompError: () => {
      if (client !== created) return;
      updateState("error");
      // Stop retrying a refused subscription. REST /auth/me decides whether the session is still valid.
      void created.deactivate();
      window.dispatchEvent(new Event("callverse:auth-check"));
    },
  });
  client = created;
  created.activate();
  return created;
}
export function subscribeTopic(
  topic: string,
  receive: (event: unknown) => void,
) {
  const id = ++nextId;
  const listener: Listener = { topic, receive };
  listeners.set(id, listener);
  getStompClient();
  attach(listener);
  return () => {
    if (client?.connected) listener.subscription?.unsubscribe();
    listeners.delete(id);
  };
}
export function disconnectStomp() {
  const oldClient = client;
  client = null;
  listeners.clear();
  updateState("disconnected");
  void oldClient?.deactivate();
}

export function reconnectStomp() {
  if (!sessionStorage.getItem("jwt")) return;
  const activeClient = getStompClient();
  if (!activeClient.active) activeClient.activate();
}
