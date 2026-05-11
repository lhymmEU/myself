/**
 * Login — magic link, email + password, and OAuth (configure providers in Supabase).
 */
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Life Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Create an account, sign in with a magic link or password, or use a
            linked OAuth provider.
          </p>
        </div>
        <LoginForm next={next ?? "/dashboard"} initialError={error} />
      </div>
    </div>
  );
}
