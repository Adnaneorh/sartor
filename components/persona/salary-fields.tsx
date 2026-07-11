"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Salary range in CAD — mono per DESIGN ("mono for data"). Values are raw
// digit strings; the server action converts and Zod validates the range
// (skippable: both may stay empty — DECISION 4).
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
  const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 7);

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
