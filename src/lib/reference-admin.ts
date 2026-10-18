import { apiFetch } from "./api";

export type ProductCategory = "CURRENT_ACCOUNT" | "SAVINGS" | "CONSUMER_LOAN" | "MORTGAGE";
export interface ProductInput { code: string; name: string; category: ProductCategory; monthlyFee: number; interestRate: number | null; active: boolean }
export interface ProductRecord extends ProductInput { id: string; accountCount: number }
export interface ArticleInput { category: string; title: string; content: string; tags: string[]; published: boolean; expectedVersion?: number }
export interface ArticleRecord extends ArticleInput { id: string; version: number; updatedAt: string; semanticIndexed: boolean }
export interface SlaInput { skill: string | null; targetSeconds: number; targetRatio: number; active: boolean }
export interface SlaRecord extends SlaInput { id: string }
export interface RoutingInput { name: string; intent: string | null; skill: string; priority: number; active: boolean }
export interface RoutingRecord extends RoutingInput { id: string; conditionsSupported: boolean }
export interface ReferenceOptions { skills: { code: string; label: string }[]; intents: string[] }

function save<T>(path: string, id: string | null, input: unknown) {
  return apiFetch<T>(path + (id ? "/" + encodeURIComponent(id) : ""), {
    method: id ? "PUT" : "POST", body: JSON.stringify(input),
  });
}
const query = (q: string) => "?" + new URLSearchParams({ q: q.trim() });
export const referenceAdmin = {
  products: (q = "", signal?: AbortSignal) => apiFetch<ProductRecord[]>("/admin/products" + query(q), { signal }),
  saveProduct: (id: string | null, input: ProductInput) => save<ProductRecord>("/admin/products", id, input),
  deleteProduct: (id: string) => apiFetch<void>("/admin/products/" + encodeURIComponent(id), { method: "DELETE" }),
  articles: (q = "", signal?: AbortSignal) => apiFetch<ArticleRecord[]>("/admin/knowledge-articles" + query(q), { signal }),
  saveArticle: (id: string | null, input: ArticleInput) => save<ArticleRecord>("/admin/knowledge-articles", id, input),
  deleteArticle: (id: string, expectedVersion: number) => apiFetch<void>("/admin/knowledge-articles/" + encodeURIComponent(id)
    + "?" + new URLSearchParams({ expectedVersion: String(expectedVersion) }), { method: "DELETE" }),
  options: (signal?: AbortSignal) => apiFetch<ReferenceOptions>("/admin/routing-rules/options", { signal }),
  slaPolicies: (signal?: AbortSignal) => apiFetch<SlaRecord[]>("/admin/sla-policies", { signal }),
  saveSla: (id: string | null, input: SlaInput) => save<SlaRecord>("/admin/sla-policies", id, input),
  deleteSla: (id: string) => apiFetch<void>("/admin/sla-policies/" + encodeURIComponent(id), { method: "DELETE" }),
  routingRules: (signal?: AbortSignal) => apiFetch<RoutingRecord[]>("/admin/routing-rules", { signal }),
  saveRouting: (id: string | null, input: RoutingInput) => save<RoutingRecord>("/admin/routing-rules", id, input),
  deleteRouting: (id: string) => apiFetch<void>("/admin/routing-rules/" + encodeURIComponent(id), { method: "DELETE" }),
};
