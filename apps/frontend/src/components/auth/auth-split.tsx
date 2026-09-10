import Image from "next/image";

import { Logo } from "@/components/logo";

export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div className="inline-flex w-fit rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
        <p className="text-center text-xs text-muted-foreground lg:text-left">
          © 2026 FrameFlow · A home for every photograph
        </p>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=80"
          alt="A photographer capturing moments at golden hour"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />
        <figure className="absolute inset-x-10 bottom-10 text-white">
          <blockquote className="font-display text-xl font-medium leading-snug">
            “We delivered 3,000 wedding photos the morning after the ceremony. The clients thought we
            hadn&apos;t slept — we had.”
          </blockquote>
          <figcaption className="mt-3 text-sm text-white/75">
            The House of Light · Wedding studio, Mumbai
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
