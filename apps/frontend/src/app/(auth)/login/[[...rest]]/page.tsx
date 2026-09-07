import { SignIn } from "@clerk/nextjs";

import { AuthSplit } from "@/components/auth/auth-split";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthSplit>
      <div className="flex flex-col items-center gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Log in to FrameFlow</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome back — your studio is waiting.
          </p>
        </div>
        <SignIn signUpUrl="/register" />
      </div>
    </AuthSplit>
  );
}
