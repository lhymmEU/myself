import { UpdatePasswordForm } from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Set password</h1>
          <p className="text-sm text-muted-foreground">
            Choose a password you can use next time on the sign-in page.
          </p>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
