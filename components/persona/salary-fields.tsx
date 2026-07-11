"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SALARY_MAX_CAD } from "@/lib/validation/persona";

// Salary range in CAD — mono per DESIGN ("mono for data"). Values are raw
// digit strings clamped to the schema's own ceiling, so the input can't
// carry a value the boundary would reject; the server action converts and
// Zod validates the range (skippable: both may stay empty —
// DECISIONS 2026-07-11 §5).
export function SalaryFields({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: string;
  max: string;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  const digitsOnly = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 7);
    return digits === "" ? "" : String(Math.min(Number(digits), SALARY_MAX_CAD));
  };

  return (
    <div className="flex items-end gap-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="salary_min_display">min</Label>
        <Input
          id="salary_min_display"
          value={min}
          onChange={(e) => onMinChange(digitsOnly(e.target.value))}
          inputMode="numeric"
          placeholder="55000"
          className="font-mono"
        />
      </div>
      <span className="pb-1.5 text-text-muted">—</span>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="salary_max_display">max</Label>
        <Input
          id="salary_max_display"
          value={max}
          onChange={(e) => onMaxChange(digitsOnly(e.target.value))}
          inputMode="numeric"
          placeholder="85000"
          className="font-mono"
        />
      </div>
      <span className="pb-2 font-mono text-xs text-text-muted">CAD/yr</span>
    </div>
  );
}
