import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The action is running: the button shows a spinner, is busy and ignores clicks. */
  pending?: boolean;
}

export function Button({ pending = false, disabled, children, type = "button", className, ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      {...rest}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={className}
    >
      {pending && <Loader2 aria-hidden size={14} className="shrink-0 animate-spin motion-reduce:animate-none" />}
      {children}
    </button>
  );
}
