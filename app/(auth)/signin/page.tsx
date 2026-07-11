import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "../auth-form";
import { signInAction } from "../actions";

export const metadata = { title: "sign in — sartor." };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Set by the middleware when it bounced a protected route; carried
  // through the form and validated in signInAction (safeRedirectPath).
  const { next } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink">
        welcome <span className="marker-mint">back</span>
      </h1>

      <AuthForm action={signInAction} submitLabel="sign in">
        {next && <input type="hidden" name="next" value={next} />}
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
            autoComplete="current-password"
            required
          />
        </div>
      </AuthForm>

      <p className="text-sm text-text-secondary">
        new here?{" "}
        <Link href="/signup" className="text-mint-text underline-offset-4 hover:underline">
          create an account
        </Link>
      </p>
    </div>
  );
}
