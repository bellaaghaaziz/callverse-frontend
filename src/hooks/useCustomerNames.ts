import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Customer } from "@/lib/contracts";
import { customerDisplayName, customerIdsKey } from "@/lib/advisor";

// Display names for the customers behind a list (conversations, alerts),
// loaded once per change in the set of customers; ids map to « Prénom Nom ».
export function useCustomerNames(items: { customerId: string }[]) {
  const [customerNames, setCustomerNames] = useState<Record<string, string>>(
    {},
  );
  const customerIds = customerIdsKey(items);
  useEffect(() => {
    if (!customerIds) return;
    const controller = new AbortController();
    void Promise.allSettled(
      customerIds.split(",").map(async (id) => {
        const profile = await apiFetch<Customer>("/customers/" + id, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted)
          setCustomerNames((previous) => ({
            ...previous,
            [id]: customerDisplayName(profile),
          }));
      }),
    );
    return () => controller.abort();
  }, [customerIds]);
  return customerNames;
}
