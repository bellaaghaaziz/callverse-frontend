import type { ReactNode } from "react";
import CustomerShell from "@/components/customer/CustomerShell";

// Every page of the customer's space shares the banner, the session check and the profile.
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
