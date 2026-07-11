"use client";

// Single-select pill row (DESIGN shape language). Selected = mint tint
// (marker semantics: mint = positive), unselected = hairline + surface —
// the one saturated object per screen stays the primary action button.
export function ChoicePills({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<string>;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={
              selected
                ? "h-8 rounded-pill bg-mint-tint px-4 text-sm font-medium text-mint-text"
                : "h-8 rounded-pill hairline bg-surface px-4 text-sm text-text-secondary transition-colors hover:bg-surface-tint"
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
