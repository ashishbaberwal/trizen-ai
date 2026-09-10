import { SignUp } from "@clerk/nextjs";

import { AuthSplit } from "@/components/auth/auth-split";

export const metadata = { title: "Create your account" };

export default function RegisterPage() {
  return (
    <AuthSplit>
      <div className="flex flex-col items-center gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Join FrameFlow</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create an account to run your photography team.
          </p>
        </div>
        <SignUp signInUrl="/login" />
      </div>
    </AuthSplit>
  );
}
