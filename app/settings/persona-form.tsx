"use client";

import { useActionState, useState } from "react";
import { ChoicePills } from "@/components/persona/choice-pills";
import { CityMultiSelect, ProvinceSelect } from "@/components/persona/location-fields";
import { RolesInput } from "@/components/persona/roles-input";
import { SalaryFields } from "@/components/persona/salary-fields";
import { REMOTE_PREFERENCES, SENIORITY_LEVELS } from "@/lib/validation/persona";
import { savePersonaAction } from "@/app/onboarding/actions";

// Settings persona editor: the onboarding fields on ONE page, pre-filled,
// saving through the SAME action (ROADMAP 1.2 "persona editable later in
// Settings"). No "from" field → the action returns state instead of
// redirecting.
export type PersonaInitial = {
  desired_roles: string[];
  province: string;
  cities: string[];
  remote_preference: string;
  salary_min_cad: number | null;
  salary_max_cad: number | null;
  seniority: string;
};

export function PersonaForm({ initial }: { initial: PersonaInitial }) {
  const [roles, setRoles] = useState(initial.desired_roles);
  const [province, setProvince] = useState(initial.province);
  const [cities, setCities] = useState(initial.cities);
  const [remotePref, setRemotePref] = useState(initial.remote_preference || "any");
  const [salaryMin, setSalaryMin] = useState(initial.salary_min_cad?.toString() ?? "");
  const [salaryMax, setSalaryMax] = useState(initial.salary_max_cad?.toString() ?? "");
  const [seniority, setSeniority] = useState(initial.seniority);
  const [state, formAction, pending] = useActionState(savePersonaAction, {
    error: null,
    saved: false,
  });

  const valid = roles.length > 0 && province !== "" && seniority !== "";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">desired roles</h2>
        <RolesInput value={roles} onChange={setRoles} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">location</h2>
        <ProvinceSelect
          value={province}
          onChange={(code) => {
            setProvince(code);
            setCities([]); // cities cascade from the province
          }}
        />
        <CityMultiSelect provinceCode={province} value={cities} onChange={setCities} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">remote</h2>
        <ChoicePills
          options={REMOTE_PREFERENCES}
          value={remotePref}
          onChange={setRemotePref}
          ariaLabel="remote preference"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">
          salary range <span className="font-normal text-text-muted">(optional)</span>
        </h2>
        <SalaryFields
          min={salaryMin}
          max={salaryMax}
          onMinChange={setSalaryMin}
          onMaxChange={setSalaryMax}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">seniority</h2>
        <ChoicePills
          options={SENIORITY_LEVELS}
          value={seniority}
          onChange={setSeniority}
          ariaLabel="seniority level"
        />
      </section>

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

      {state.error && (
        <p role="alert" className="text-sm">
          <span className="marker-amber">{state.error}</span>
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!valid || pending}
          className="h-9 w-fit rounded-pill bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80 disabled:opacity-50"
        >
          {pending ? "one sec…" : "save changes"}
        </button>
        {state.saved && !state.error && !pending && (
          <span className="text-sm">
            <span className="marker-mint">saved ✓</span>
          </span>
        )}
      </div>
    </form>
  );
}
