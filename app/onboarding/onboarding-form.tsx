"use client";

import { useActionState, useState } from "react";
import { ChoicePills } from "@/components/persona/choice-pills";
import { CityMultiSelect, ProvinceSelect } from "@/components/persona/location-fields";
import { RolesInput } from "@/components/persona/roles-input";
import { SalaryFields } from "@/components/persona/salary-fields";
import { REMOTE_PREFERENCES, SENIORITY_LEVELS } from "@/lib/validation/persona";
import { savePersonaAction } from "./actions";

// 4-step persona capture (ROADMAP 1.2, Mockup D): highlighter headline per
// step, progress dots, Enter-to-advance, keycap hints. Roles, location and
// seniority are required; the salary step is skippable (DECISIONS
// 2026-07-11 §5).
// Client-side gating is UX only — savePersonaAction re-validates everything.
const STEP_COUNT = 4;

export function OnboardingForm() {
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [province, setProvince] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [remotePref, setRemotePref] = useState("any");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [seniority, setSeniority] = useState("");
  const [state, formAction, pending] = useActionState(savePersonaAction, {
    error: null,
    saved: false,
  });

  const stepValid = [
    roles.length > 0,
    province !== "",
    true, // range is skippable
    seniority !== "",
  ][step];
  const lastStep = step === STEP_COUNT - 1;

  // Enter advances (unless a field already consumed it to add a role /
  // toggle a city); on the last step the native submit takes over.
  const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter" || e.defaultPrevented) return;
    if (!lastStep) {
      e.preventDefault();
      if (stepValid) setStep(step + 1);
    } else if (!stepValid || pending) {
      e.preventDefault();
    }
  };

  return (
    <form action={formAction} onKeyDown={onKeyDown} className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 w-1.5 rounded-full ${
              i === step ? "bg-primary" : i < step ? "bg-mint-text" : "bg-border-strong"
            }`}
          />
        ))}
        <span className="ml-1 font-mono text-xs text-text-muted">
          {step + 1}/{STEP_COUNT}
        </span>
      </div>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            what do you <span className="marker-mint">do</span>?
          </h1>
          <p className="text-sm text-text-secondary">
            the roles you want — they seed your deck and your match score.
          </p>
          <RolesInput value={roles} onChange={setRoles} />
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            where in <span className="marker-mint">canada</span>?
          </h1>
          <ProvinceSelect
            value={province}
            onChange={(code) => {
              setProvince(code);
              setCities([]); // cities cascade from the province
            }}
          />
          <CityMultiSelect provinceCode={province} value={cities} onChange={setCities} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">remote?</span>
            <ChoicePills
              options={REMOTE_PREFERENCES}
              value={remotePref}
              onChange={setRemotePref}
              ariaLabel="remote preference"
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            your <span className="marker-mint">range</span>
          </h1>
          <p className="text-sm text-text-secondary">
            yearly salary in CAD — optional, skip if you&apos;d rather not say.
          </p>
          <SalaryFields
            min={salaryMin}
            max={salaryMax}
            onMinChange={setSalaryMin}
            onMaxChange={setSalaryMax}
          />
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-medium tracking-tight text-ink">
            how <span className="marker-mint">senior</span>?
          </h1>
          <ChoicePills
            options={SENIORITY_LEVELS}
            value={seniority}
            onChange={setSeniority}
            ariaLabel="seniority level"
          />
        </div>
      )}

      {/* the submitted persona lives in hidden fields so every step's
          choices survive step switches; visible controls carry no name */}
      {roles.map((r) => (
        <input key={r} type="hidden" name="desired_roles" value={r} />
      ))}
      <input type="hidden" name="province" value={province} />
      {cities.map((c) => (
        <input key={c} type="hidden" name="cities" value={c} />
      ))}
      <input type="hidden" name="remote_preference" value={remotePref} />
      <input type="hidden" name="salary_min_cad" value={salaryMin} />
      <input type="hidden" name="salary_max_cad" value={salaryMax} />
      <input type="hidden" name="seniority" value={seniority} />
      <input type="hidden" name="from" value="onboarding" />

      {state.error && (
        <p role="alert" className="text-sm">
          <span className="marker-amber">{state.error}</span>
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className={`h-9 rounded-pill bg-secondary px-5 text-sm text-secondary-foreground transition-colors hover:bg-surface-tint ${
            step === 0 ? "invisible" : ""
          }`}
        >
          back
        </button>
        {lastStep ? (
          <button
            type="submit"
            disabled={!stepValid || pending}
            className="h-9 rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {pending ? "one sec…" : "save & go"}
          </button>
        ) : (
          <button
            type="button"
            disabled={!stepValid}
            onClick={() => setStep(step + 1)}
            className="h-9 rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            continue
          </button>
        )}
      </div>

      <p className="font-mono text-[11px] text-text-muted">
        <kbd className="hairline rounded px-1 py-0.5">↵ enter</kbd> to continue
      </p>
    </form>
  );
}
