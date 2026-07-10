"use client";

import { useActionState } from "react";
import type { AuthFormState } from "./actions";

// Shared client wrapper: renders a server-action form with inline error
// display (amber marker per DESIGN marker semantics: attention, not death).
export function AuthForm({
  action,
  children,
  submitLabel,
}: {
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  children: React.ReactNode;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {children}
      {state.error && (
        <p role="alert" className="text-sm">
          <span className="marker-amber">{state.error}</span>
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
      >
        {pending ? "one sec…" : submitLabel}
      </button>
    </form>
  );
}
