"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, errorMessage } from "@/lib/api";
import { expireSession } from "@/lib/auth";
import { roleHome, type Role } from "@/lib/contracts";
export default function SessionGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let warningTimer: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    async function verify() {
      if (!sessionStorage.getItem("jwt")) {
        expireSession();
        return;
      }
      const expiresAt = sessionStorage.getItem("expiresAt");
      const remaining = expiresAt ? Date.parse(expiresAt) - Date.now() : NaN;
      if (Number.isFinite(remaining) && remaining <= 0) {
        expireSession();
        return;
      }
      try {
        const user = await api.me();
        if (!active) return;
        const home = roleHome[user.role as Role];
        if (!home) {
          expireSession();
          return;
        }
        sessionStorage.setItem("user", JSON.stringify(user));
        document.cookie = `role=${user.role}; path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        if (!(pathname === home || pathname.startsWith(home + "/"))) {
          router.replace(home);
          return;
        }
        setReady(true);
        setError("");
      } catch (error) {
        if (active) setError(errorMessage(error));
      }
    }
    void verify();
    const expiry = sessionStorage.getItem("expiresAt");
    const remaining = expiry ? Date.parse(expiry) - Date.now() : NaN;
    if (Number.isFinite(remaining) && remaining > 0) {
      expiryTimer = setTimeout(expireSession, remaining);
      warningTimer = setTimeout(
        () =>
          setWarning(
            "Votre session expire dans moins de deux minutes. Terminez votre action puis reconnectez-vous.",
          ),
        Math.max(0, remaining - 120000),
      );
    }
    const check = () => {
      void verify();
    };
    window.addEventListener("callverse:auth-check", check);
    return () => {
      active = false;
      clearTimeout(expiryTimer);
      clearTimeout(warningTimer);
      window.removeEventListener("callverse:auth-check", check);
    };
  }, [pathname, router, retry]);
  if (!ready)
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-[#60766b]">
        <div>
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button
                onClick={() => setRetry((value) => value + 1)}
                className="cv-button mt-4"
              >
                Réessayer
              </button>
            </>
          ) : (
            "Vérification de la session…"
          )}
        </div>
      </div>
    );
  return (
    <>
      {warning && (
        <div
          role="status"
          className="fixed top-0 inset-x-0 z-50 bg-amber-900 p-2 text-center text-sm text-white"
        >
          {warning}
        </div>
      )}
      {children}
    </>
  );
}
