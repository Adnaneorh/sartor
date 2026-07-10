import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "../auth-form";
import { signUpAction } from "../actions";

export const metadata = { title: "sign up — sartor." };

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink">
        make your <span className="marker-mint">move</span>
      </h1>

      <AuthForm action={signUpAction} submitLabel="create account">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="full_name">full name</Label>
          <Input id="full_name" name="full_name" autoComplete="name" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">
            phone <span className="text-text-muted">(optional)</span>
          </Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
        <label className="flex items-start gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            name="age_confirmed"
            required
            className="mt-0.5 accent-[var(--primary)]"
          />
          I confirm I am 16 or older
        </label>
      </AuthForm>

      <p className="text-sm text-text-secondary">
        already have an account?{" "}
        <Link href="/signin" className="text-mint-text underline-offset-4 hover:underline">
          sign in
        </Link>
      </p>
    </div>
  );
}
