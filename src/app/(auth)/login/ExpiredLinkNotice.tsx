"use client";

import { useSearchParams } from "next/navigation";
import { FormMessage } from "@/components/auth/ui";

/** Shown when /auth/confirm couldn't use an email link and sent the reader here. */
export function ExpiredLinkNotice() {
  if (useSearchParams().get("link") !== "expired") return null;
  return (
    <div className="mb-4">
      <FormMessage state={{ error: "That email link has expired or was already used. Log in, or request a new one." }} />
    </div>
  );
}
