"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

const MAX_ROLES = 10;

// Tag input for desired roles: type + Enter adds a removable pill.
// Enter is consumed (preventDefault) ONLY when it adds a role — an empty
// Enter bubbles to the surrounding form (advance step in onboarding,
// native submit in settings).
export function RolesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const addDraft = () => {
    const role = draft.trim();
    if (role.length < 2 || value.length >= MAX_ROLES) return;
    if (!value.some((r) => r.toLowerCase() === role.toLowerCase())) {
      onChange([...value, role]);
    }
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim() !== "") {
            e.preventDefault();
            addDraft();
          }
        }}
        placeholder="e.g. frontend developer"
        maxLength={80}
        aria-label="desired role"
        disabled={value.length >= MAX_ROLES}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((role) => (
            <li
              key={role}
              className="flex items-center gap-1.5 rounded-pill bg-mint-tint px-3 py-1 text-sm text-mint-text"
            >
              {role}
              <button
                type="button"
                aria-label={`remove ${role}`}
                onClick={() => onChange(value.filter((r) => r !== role))}
                className="text-mint-text/70 transition-colors hover:text-mint-text"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="font-mono text-xs text-text-muted">
        {value.length}/{MAX_ROLES} · ↵ adds a role
      </p>
    </div>
  );
}
