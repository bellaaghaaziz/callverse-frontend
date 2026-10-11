import { useEffect, useRef, useState } from "react";

// Ticket and escalation form state, with the focus contract: an opened form
// takes focus, and focus returns to its opener when it closes.
export function useActionForms(
  busy: boolean,
  selectedId: string | undefined,
  selectedCustomerId: string | undefined,
) {
  const [ticketOpen, setTicketOpen] = useState(false);
  const [ticket, setTicket] = useState({
    title: "",
    description: "",
    category: "FRAUD",
    severity: 3,
  });
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  // An opened form takes focus; once it closes, focus goes back to the
  // button that opened it, as soon as that button is usable again.
  const ticketButton = useRef<HTMLButtonElement>(null);
  const ticketTitle = useRef<HTMLInputElement>(null);
  const escalationButton = useRef<HTMLButtonElement>(null);
  const escalationField = useRef<HTMLTextAreaElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (ticketOpen) ticketTitle.current?.focus();
  }, [ticketOpen]);
  useEffect(() => {
    if (escalationOpen) escalationField.current?.focus();
  }, [escalationOpen]);
  useEffect(() => {
    const target = returnFocus.current;
    if (ticketOpen || escalationOpen || busy || !target) return;
    returnFocus.current = null;
    // Only recover focus the closed form took with it, never take it back
    // from wherever the advisor has moved since.
    const active = document.activeElement;
    if (active && active !== document.body) return;
    // After an escalation its button is disabled; the ticket button is not.
    (target.isConnected && !target.disabled
      ? target
      : ticketButton.current
    )?.focus();
  }, [ticketOpen, escalationOpen, busy]);
  // A new conversation closes the forms and forgets where focus came from.
  useEffect(() => {
    setTicketOpen(false);
    setEscalationOpen(false);
    returnFocus.current = null;
  }, [selectedId, selectedCustomerId]);
  return {
    ticketOpen,
    setTicketOpen,
    ticket,
    setTicket,
    escalationOpen,
    setEscalationOpen,
    escalationReason,
    setEscalationReason,
    ticketButton,
    ticketTitle,
    escalationButton,
    escalationField,
    returnFocus,
  };
}

export type ActionForms = ReturnType<typeof useActionForms>;
