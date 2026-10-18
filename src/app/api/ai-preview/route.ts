import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
const backend = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");
const ai = process.env.AI_PREVIEW_URL || "http://127.0.0.1:8001";
class PreviewError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function modelText(text: string) {
  return text.replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi, "[IBAN masqué]")
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, "[e-mail masqué]")
    .replace(/\b(?:\d[ -]?){12,19}\b/g, "[numéro masqué]");
}
async function identity(request: NextRequest) {
  if (!process.env.AI_PREVIEW_KEY) throw new PreviewError(503, "L’espace IA expérimental est désactivé.");
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new PreviewError(401, "Connexion requise.");
  const get = async (path: string) => {
    const response = await fetch(backend + path, { headers: { Authorization: authorization }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new PreviewError(response.status, "Accès aux données refusé ou backend indisponible.");
    return response.json();
  };
  const user = await get("/auth/me");
  if (!["ADVISOR", "SUPERVISOR", "ADMIN"].includes(user.role)) throw new PreviewError(403, "Réservé aux équipes internes.");
  const call = async (path: string, body?: unknown, customerId = "") => {
    const response = await fetch(ai + path, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "x-ai-key": process.env.AI_PREVIEW_KEY!, "x-preview-key": process.env.AI_PREVIEW_KEY!, "x-backend-authorization": authorization, "x-customer-id": customerId },
      body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(180000),
    });
    if (!response.ok) throw new PreviewError(response.status === 504 ? 504 : response.status >= 500 ? 503 : response.status,
      response.status === 504 ? "Le modèle local a dépassé le délai de traitement. Réessayez avec moins de charge." : "Le service IA n’a pas pu traiter cette demande. Vérifiez sa configuration ou le scénario.");
    return response.json();
  };
  return { get, call, user };
}
function failure(error: unknown) {
  return NextResponse.json({ message: error instanceof PreviewError ? error.message : "Le service IA est inaccessible ou a dépassé le délai." }, { status: error instanceof PreviewError ? error.status : 503 });
}
export async function GET(request: NextRequest) {
  try {
    const { call } = await identity(request);
    return NextResponse.json({ health: await call("/health"), workforce: await call("/ai/workforce/capabilities") });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 64000) throw new PreviewError(413, "Demande trop volumineuse.");
    const { get, call, user } = await identity(request);
    const body = await request.json();
    if (body.feature === "workforce") {
      if (!["SUPERVISOR", "ADMIN"].includes(user.role)) throw new PreviewError(403, "Réservé à la supervision.");
      const strategy = ["PPO", "THRESHOLD", "STATIC_FIFO"].includes(body.strategy) ? body.strategy : "THRESHOLD";
      return NextResponse.json(await call("/ai/workforce/decide?strategy=" + strategy, body.state));
    }
    if (body.feature === "simulation") {
      return NextResponse.json(await call("/ai/simulator/next-message", body.scenario));
    }
    if (!["suggestion", "quality"].includes(body.feature)) throw new PreviewError(400, "Fonction inconnue.");
    if (typeof body.conversationId !== "string" || !/^[0-9a-f-]{36}$/i.test(body.conversationId)) throw new PreviewError(400, "Identifiant de conversation invalide.");
    const id = encodeURIComponent(body.conversationId);
    const conversation = await get("/conversations/" + id);
    const transcript = await get("/conversations/" + id + "/messages?limit=200");
    const messages = transcript.messages.filter((m: {sender: string}) => ["CUSTOMER", "ADVISOR"].includes(m.sender));
    if (body.feature === "quality") {
      if (!["SUPERVISOR", "ADMIN"].includes(user.role)) throw new PreviewError(403, "Réservé à la supervision.");
      if (messages.length < 2 || !messages.some((m: {sender: string}) => m.sender === "ADVISOR")) throw new PreviewError(400, "L’évaluation nécessite au moins deux messages, dont une réponse conseiller.");
      return NextResponse.json(await call("/ai/quality/evaluate", { conversation_id: conversation.id,
        messages: messages.map((m: {sender: string; content: string}) => ({ sender: m.sender, content: m.content })), resolved: conversation.status === "RESOLVED" }));
    }
    let last = messages.length - 1;
    while (last >= 0 && messages[last].sender !== "CUSTOMER") last--;
    if (last < 0) throw new PreviewError(400, "Cette conversation ne contient pas encore de message client.");
    const customer = await get("/customers/" + encodeURIComponent(conversation.customerId));
    return NextResponse.json(await call("/ai/advisor/respond", {
      conversation_id: conversation.id, customer_id: conversation.customerId,
      message: modelText(messages[last].content),
      history: messages.slice(0, last).map((m: {sender: string; content: string; sentAt: string}) => ({ role: m.sender === "CUSTOMER" ? "customer" : "advisor", content: modelText(m.content), ts: m.sentAt })),
      context: { tenure_months: customer.tenureMonths, segment: customer.segment }, mode: "SIMULATION",
    }, conversation.customerId));
  } catch (error) { return failure(error); }
}
