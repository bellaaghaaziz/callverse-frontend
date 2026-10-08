"use client";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { FrontDesk, KnowledgeSearch } from "@/components/IntegrationTools";
import ConversationPanel from "@/components/ConversationPanel";
import { api, apiFetch, errorMessage } from "@/lib/api";
import type { Role, Schema } from "@/lib/contracts";
const roles: Role[] = ["CUSTOMER", "ADVISOR", "SUPERVISOR", "ADMIN"];
import {
  ShieldCheck,
  RefreshCw,
  Search,
  Users,
  UserPlus,
  ArrowUpRight,
  MessageSquare,
  Settings2,
} from "lucide-react";
import { roleLabel, initialsFor } from "@/lib/presentation";
export default function AdminPage() {
  const [tab, setTab] = useState("Utilisateurs");
  useEffect(() => {
    const handler = (event: Event) =>
      setTab((event as CustomEvent<string>).detail);
    window.addEventListener("callverse:navigate", handler);
    return () => window.removeEventListener("callverse:navigate", handler);
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("callverse:section", { detail: tab }));
  }, [tab]);
  const [users, setUsers] = useState<Schema["UserPage"] | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [currentId, setCurrentId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const [detail, setDetail] = useState<Schema["User"] | null>(null);
  const [conversationId, setConversationId] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<Schema["CreateUserRequest"]>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "CUSTOMER",
  });
  useEffect(() => {
    api
      .me()
      .then((user) => setCurrentId(user.userId))
      .catch((error) => setError(errorMessage(error)));
  }, []);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ page: String(page), size: "20" });
      if (search) params.set("q", search);
      if (roleFilter) params.set("role", roleFilter);
      if (activeFilter) params.set("active", activeFilter);
      try {
        const data = await apiFetch<Schema["UserPage"]>(
          `/admin/users?${params}`,
          { signal },
        );
        if (!signal?.aborted) {
          setUsers(data);
          setError("");
        }
      } catch (error) {
        if (!signal?.aborted) setError(errorMessage(error));
      }
    },
    [page, search, roleFilter, activeFilter],
  );
  useEffect(() => {
    if (tab !== "Utilisateurs") return;
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [tab, refresh, reload]);
  async function action(
    id: string,
    action: "block" | "unblock" | "role",
    role?: Role,
  ) {
    setBusy(true);
    setError("");
    try {
      const updated = await apiFetch<Schema["User"]>(
        `/admin/users/${id}/${action}`,
        {
          method: action === "role" ? "PUT" : "POST",
          ...(role ? { body: JSON.stringify({ role }) } : {}),
        },
      );
      if (detail?.id === updated.id) setDetail(updated);
      setReload((value) => value + 1);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Le mot de passe doit contenir au maximum 72 octets.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await apiFetch<Schema["User"]>("/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({
        email: "",
        firstName: "",
        lastName: "",
        password: "",
        role: "CUSTOMER",
      });
      setPage(0);
      setReload((value) => value + 1);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function inspect(id: string) {
    setError("");
    try {
      setDetail(await apiFetch<Schema["User"]>(`/admin/users/${id}`));
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  return (
    <AppShell role="Analyste / Admin" initials="AD" title="Administration">
      <div className="cv-page-heading">
        <div>
          <p className="cv-eyebrow">GESTION DE LA PLATEFORME</p>
          <h1>Un espace bien organisé.</h1>
          <p className="cv-subtitle">
            Gérez les comptes et retrouvez vos outils d’administration.
          </p>
        </div>
        <span className="cv-badge cv-badge-green">
          <ShieldCheck size={12} />
          Administration
        </span>
      </div>
      <div
        className="cv-tabs"
        role="tablist"
        aria-label="Sections d’administration"
      >
        {[
          "Utilisateurs",
          "Procédures",
          "Accueil",
          "Catalogue produits",
          "Conseillers",
          "Règles",
        ].map((label) => (
          <button
            key={label}
            role="tab"
            aria-selected={tab === label}
            onClick={() => setTab(label)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="cv-error mb-5">
          {error}
        </p>
      )}
      {tab === "Utilisateurs" && (
        <div className="cv-stack">
          <section className="cv-card">
            <div className="cv-card-heading">
              <div>
                <h2>Utilisateurs</h2>
                <p>
                  {users
                    ? users.page.totalElements + " comptes au total"
                    : "Chargement des comptes…"}
                </p>
              </div>
              <button
                className="cv-icon-button"
                aria-label="Actualiser les utilisateurs"
                onClick={() => setReload((v) => v + 1)}
              >
                <RefreshCw size={14} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSearch(query.trim());
                setPage(0);
              }}
              className="cv-toolbar p-5"
            >
              <input
                aria-label="Recherche utilisateurs"
                className="cv-input grow"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un nom ou un email"
              />
              <button className="cv-button">
                <Search size={13} />
                Rechercher
              </button>
              <select
                aria-label="Filtrer par rôle"
                className="cv-input"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tous les rôles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel[role]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrer par statut"
                className="cv-input"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs</option>
                <option value="false">Bloqués</option>
              </select>
            </form>
            <div className="cv-table-wrap">
              <table className="cv-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.content.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="flex gap-3 items-center">
                          <span className="cv-avatar cv-avatar-light">
                            {initialsFor(user.firstName + " " + user.lastName)}
                          </span>
                          <div>
                            <strong className="font-semibold">
                              {user.firstName} {user.lastName}
                            </strong>
                            <p className="cv-muted mt-1">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          aria-label={"Rôle de " + user.email}
                          disabled={busy || currentId === user.id}
                          className="cv-input"
                          value={user.role}
                          onChange={(e) =>
                            action(user.id, "role", e.target.value as Role)
                          }
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabel[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          className={
                            "cv-badge " +
                            (user.active ? "cv-badge-green" : "cv-badge-rose")
                          }
                        >
                          <span className="cv-status-dot" />
                          {user.active ? "Actif" : "Bloqué"}
                        </span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="cv-button cv-button-secondary cv-button-small"
                            disabled={busy || currentId === user.id}
                            onClick={() =>
                              action(user.id, user.active ? "block" : "unblock")
                            }
                          >
                            {user.active ? "Bloquer" : "Débloquer"}
                          </button>
                          <button
                            className="cv-button cv-button-secondary cv-button-small"
                            onClick={() => inspect(user.id)}
                          >
                            Détails
                            <ArrowUpRight size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {users?.content.length === 0 && (
              <div className="cv-empty">
                <Users size={24} />
                <strong>Aucun résultat</strong>Essayez un autre filtre ou une
                autre recherche.
              </div>
            )}
            <div className="flex items-center justify-between gap-3 p-4 border-t border-[#e8ede5]">
              <span className="cv-muted">
                Page {page + 1} / {Math.max(1, users?.page.totalPages || 0)}
              </span>
              <div className="flex gap-2">
                <button
                  className="cv-button cv-button-secondary cv-button-small"
                  disabled={page === 0}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Précédent
                </button>
                <button
                  className="cv-button cv-button-secondary cv-button-small"
                  disabled={!users || page + 1 >= users.page.totalPages}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Suivant
                </button>
              </div>
            </div>
          </section>
          {detail && (
            <section className="cv-card cv-card-pad">
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <span className="cv-avatar cv-avatar-light">
                    {initialsFor(detail.firstName + " " + detail.lastName)}
                  </span>
                  <div>
                    <h2 className="text-lg">
                      {detail.firstName} {detail.lastName}
                    </h2>
                    <p className="cv-subtitle">{detail.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="cv-button cv-button-secondary cv-button-small"
                >
                  Fermer
                </button>
              </div>
              <div className="flex flex-wrap gap-3 items-center mt-5">
                <span className="cv-badge cv-badge-gray">
                  {roleLabel[detail.role]}
                </span>
                <span
                  className={
                    "cv-badge " +
                    (detail.active ? "cv-badge-green" : "cv-badge-rose")
                  }
                >
                  {detail.active ? "Actif" : "Bloqué"}
                </span>
                <span className="cv-muted">
                  Créé le {new Date(detail.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
            </section>
          )}
          <section className="cv-card cv-card-pad">
            <h2 className="cv-tool-title">
              <UserPlus size={18} />
              Créer un compte
            </h2>
            <p className="cv-subtitle mb-5">
              Ajoutez un utilisateur et choisissez son accès à la plateforme.
            </p>
            <form onSubmit={create}>
              <div className="cv-form-row">
                {(["firstName", "lastName", "email", "password"] as const).map(
                  (field) => (
                    <label key={field} className="cv-field">
                      <span className="cv-label">
                        {
                          {
                            email: "Email",
                            firstName: "Prénom",
                            lastName: "Nom",
                            password: "Mot de passe temporaire",
                          }[field]
                        }
                      </span>
                      <input
                        className="cv-input"
                        autoComplete={
                          field === "password" ? "new-password" : "off"
                        }
                        type={
                          field === "email"
                            ? "email"
                            : field === "password"
                              ? "password"
                              : "text"
                        }
                        required
                        minLength={field === "password" ? 12 : 1}
                        maxLength={
                          field === "email"
                            ? 180
                            : field === "password"
                              ? 72
                              : 80
                        }
                        value={form[field]}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [field]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ),
                )}
              </div>
              <div className="cv-toolbar">
                <label className="grow">
                  <span className="cv-label">Rôle du nouveau compte</span>
                  <select
                    aria-label="Rôle du nouveau compte"
                    className="cv-input !w-full"
                    value={form.role}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        role: e.target.value as Role,
                      }))
                    }
                  >
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel[role]}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={busy} className="cv-button self-end">
                  <UserPlus size={14} />
                  Créer
                </button>
              </div>
              <p className="cv-muted mt-4 !leading-relaxed">
                Le mot de passe doit contenir 12 caractères minimum, 72 octets
                maximum et exclure le nom de l’adresse email. Pour un
                conseiller, le profil et les compétences doivent aussi être
                configurés.
              </p>
            </form>
          </section>
        </div>
      )}
      {tab === "Procédures" && (
        <div className="cv-stack">
          <KnowledgeSearch />
          <p className="cv-muted">
            La création et la modification d’articles ne sont pas encore
            disponibles.
          </p>
        </div>
      )}
      {tab === "Accueil" && (
        <div className="cv-stack">
          <FrontDesk
            onOpened={(conversation) =>
              setSelectedConversation(conversation.id)
            }
          />
          <section className="cv-card cv-card-pad">
            <h2 className="cv-tool-title">
              <MessageSquare size={18} />
              Consulter une conversation
            </h2>
            <form
              className="cv-inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                setSelectedConversation(conversationId.trim());
              }}
            >
              <input
                aria-label="Identifiant de conversation"
                className="cv-input"
                required
                pattern="[0-9a-fA-F-]{36}"
                value={conversationId}
                onChange={(e) => setConversationId(e.target.value)}
                placeholder="Identifiant de conversation"
              />
              <button className="cv-button">
                Ouvrir
                <ArrowUpRight size={13} />
              </button>
            </form>
          </section>
          {selectedConversation && (
            <ConversationPanel
              key={selectedConversation}
              id={selectedConversation}
              role="ADMIN"
            />
          )}
        </div>
      )}
      {["Catalogue produits", "Conseillers", "Règles"].includes(tab) && (
        <section className="cv-card">
          <div className="cv-empty !py-20">
            <span className="cv-empty-icon mx-auto">
              <Settings2 size={24} />
            </span>
            <strong className="!text-lg">{tab}</strong>Cette fonctionnalité
            n’est pas encore disponible.
            <p>Les outils disponibles restent accessibles dans le menu.</p>
          </div>
        </section>
      )}
    </AppShell>
  );
}
