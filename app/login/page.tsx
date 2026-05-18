import { Suspense } from "react";
import { AuthPageFallback } from "@/components/auth/auth-page-fallback";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
