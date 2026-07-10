import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthForm } from "../auth-form";
import { resendConfirmationAction } from "../actions";

export const metadata = { title: "check your inbox — sartor." };

export default async function CheckInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-medium tracking-tight text-ink">
        check your <span className="marker-mint">inbox</span>
      </h1>
      <p className="text-sm text-text-secondary">
        We sent a confirmation link{email ? ` to ${email}` : ""}. Click it and
        you&apos;re in — until then this account stays locked.
      </p>
      <AuthForm action={resendConfirmationAction} submitLabel="resend email">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={email ?? ""}
            autoComplete="email"
            required
          />
        </div>
      </AuthForm>
      <p className="font-mono text-xs text-text-muted">
        local dev: emails land in Mailpit → http://localhost:54324
      </p>
    </div>
  );
}
