"use client";

import { useId, useMemo, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check, UserPlus } from "lucide-react";
import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { PasswordField } from "@/components/auth/password-field";
import { SignupBenefits } from "@/components/auth/signup-benefits";
import { AuthShell } from "@/components/auth-shell";
import {
  firstPasswordPolicyMessage,
  getPasswordRequirementStatus,
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS,
  passwordMeetsPolicy,
} from "@/lib/auth/password-policy";

type SignupErrorField = "email" | "password" | "confirm" | "disclaimer";

type FieldErrorState = {
  message: string;
  field: SignupErrorField;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function focusField(
  field: SignupErrorField,
  refs: Record<SignupErrorField, RefObject<HTMLElement | null>>,
) {
  requestAnimationFrame(() => {
    refs[field].current?.focus();
  });
}

export function SignupForm() {
  const router = useRouter();
  const errorId = useId();
  const emailHintId = useId();
  const confirmHintId = useId();
  const passwordRequirementsId = useId();
  const disclaimerLegalId = useId();

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const disclaimerRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<SignupErrorField, RefObject<HTMLElement | null>> = {
    email: emailRef,
    password: passwordRef,
    confirm: confirmRef,
    disclaimer: disclaimerRef,
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<FieldErrorState | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirm: false });

  const passwordChecks = useMemo(
    () => getPasswordRequirementStatus(password),
    [password],
  );

  const passwordsMatch =
    confirmPassword.length === 0 || password === confirmPassword;

  const emailInvalid = touched.email && email.length > 0 && !isValidEmail(email);
  const passwordInvalid =
    touched.password && password.length > 0 && !passwordMeetsPolicy(password);
  const confirmInvalid = touched.confirm && confirmPassword.length > 0 && !passwordsMatch;

  const emailAriaInvalid =
    emailInvalid || fieldError?.field === "email" ? true : undefined;
  const passwordAriaInvalid =
    passwordInvalid || fieldError?.field === "password" ? true : undefined;
  const confirmAriaInvalid =
    confirmInvalid || fieldError?.field === "confirm" ? true : undefined;
  const disclaimerAriaInvalid =
    fieldError?.field === "disclaimer" ? true : undefined;

  function setClientFieldError(message: string, field: SignupErrorField) {
    setFieldError({ message, field });
    setError(null);
    focusField(field, fieldRefs);
  }

  function validateFields(): boolean {
    setTouched({ email: true, password: true, confirm: true });
    if (!isValidEmail(email)) {
      setClientFieldError("Enter a valid email address.", "email");
      return false;
    }
    if (!passwordMeetsPolicy(password)) {
      setClientFieldError(
        firstPasswordPolicyMessage(password) ??
          "Password does not meet all requirements.",
        "password",
      );
      return false;
    }
    if (password !== confirmPassword) {
      setClientFieldError("Passwords do not match.", "confirm");
      return false;
    }
    if (!acceptedDisclaimer) {
      setClientFieldError(
        "Please confirm you understand this is not medical care.",
        "disclaimer",
      );
      return false;
    }
    setFieldError(null);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError(null);
    if (!validateFields()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          acceptedDisclaimer: true,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Could not create your account. Try again.";
        if (res.status === 409) {
          setFieldError({ message: msg, field: "email" });
          focusField("email", fieldRefs);
        } else {
          setError(msg);
        }
        setLoading(false);
        return;
      }

      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        setError("Account created. Please sign in with your email and password.");
        setLoading(false);
        return;
      }
      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Connection problem. Check your network and try again.");
    } finally {
      setLoading(false);
    }
  }

  const showFieldAlert = fieldError != null;
  const showServerAlert = error != null;

  const emailDescribedBy = [
    emailHintId,
    fieldError?.field === "email" ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const passwordDescribedBy = [
    passwordRequirementsId,
    fieldError?.field === "password" ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const confirmDescribedBy = [
    confirmInvalid ? confirmHintId : undefined,
    fieldError?.field === "confirm" ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const disclaimerDescribedBy = [
    disclaimerLegalId,
    fieldError?.field === "disclaimer" ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <AuthShell
      size="split"
      title="Create account"
      nav="signup"
      aside={<SignupBenefits variant="aside" />}
    >
      <SignupBenefits variant="mobile" />

      <div className="mb-8 flex flex-col items-center text-center lg:items-start lg:text-left">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--protein-tint)] text-[color:var(--accent-secondary)] lg:h-14 lg:w-14">
          <UserPlus className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-[color:var(--foreground)] sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-2 max-w-sm text-sm font-medium text-zinc-600">
          Free to start. You will set targets in a short onboarding next.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-5"
        aria-busy={loading}
        noValidate
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="signup-email" className="landing-kicker ml-1 text-zinc-500">
            Email
          </label>
          <input
            ref={emailRef}
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError(null);
              setError(null);
            }}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            aria-invalid={emailAriaInvalid}
            aria-describedby={emailDescribedBy || undefined}
            className="input-field bg-white py-4"
          />
          <p id={emailHintId} className="ml-1 text-xs text-zinc-500">
            Used to sign in and recover your account.
          </p>
        </div>

        <PasswordField
          id="signup-password"
          inputRef={passwordRef}
          label="Password"
          value={password}
          onChange={(v) => {
            setPassword(v);
            setFieldError(null);
            setError(null);
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          placeholder="Create a strong password"
          minLength={MIN_PASSWORD_LENGTH}
          invalid={passwordAriaInvalid === true}
          describedBy={passwordDescribedBy || undefined}
        />

        <ul
          id={passwordRequirementsId}
          className="ml-1 flex flex-col gap-1.5"
          aria-live="polite"
          aria-label="Password requirements"
        >
          {PASSWORD_REQUIREMENTS.map((req) => {
            const met = passwordChecks[req.id];
            return (
              <li
                key={req.id}
                className={`flex items-center gap-2 text-xs font-medium ${
                  met ? "text-[color:var(--accent-secondary)]" : "text-zinc-500"
                }`}
              >
                <Check
                  className={`h-3.5 w-3.5 shrink-0 ${met ? "opacity-100" : "opacity-35"}`}
                  aria-hidden
                />
                {req.label}
              </li>
            );
          })}
        </ul>

        <PasswordField
          id="signup-confirm"
          inputRef={confirmRef}
          label="Confirm password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            setFieldError(null);
            setError(null);
          }}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          placeholder="Re-enter your password"
          invalid={confirmAriaInvalid === true}
          describedBy={confirmDescribedBy || undefined}
        />
        {confirmInvalid ? (
          <p id={confirmHintId} className="ml-1 text-xs font-bold text-red-600">
            Passwords do not match.
          </p>
        ) : null}

        <section
          aria-labelledby="signup-disclaimer-heading"
          className="space-y-4 rounded-2xl bg-[color:var(--warm-neutral)]/60 p-5 sm:p-6"
        >
          <h2 id="signup-disclaimer-heading" className="landing-kicker text-zinc-500">
            Before you start
          </h2>
          <p id={disclaimerLegalId} className="text-sm leading-relaxed text-zinc-600">
            TrackOMacro is a tracking assistant,{" "}
            <strong className="text-[color:var(--foreground)]">
              not a substitute for medical care
            </strong>
            . It is not for diagnosis or treatment. See our{" "}
            <Link
              href="/privacy"
              className="focus-ring font-bold text-[color:var(--foreground)] underline decoration-[color:var(--accent-secondary)]/40 underline-offset-2 transition-colors duration-200 hover:text-[color:var(--accent-secondary)]"
            >
              Privacy policy
            </Link>{" "}
            for how we handle your data.
          </p>
          <label
            htmlFor="signup-disclaimer"
            className="group flex cursor-pointer items-start gap-3"
          >
            <input
              ref={disclaimerRef}
              id="signup-disclaimer"
              type="checkbox"
              checked={acceptedDisclaimer}
              onChange={(e) => {
                setAcceptedDisclaimer(e.target.checked);
                setFieldError(null);
                setError(null);
              }}
              aria-invalid={disclaimerAriaInvalid}
              aria-describedby={disclaimerDescribedBy || undefined}
              className="focus-ring mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-black/10 text-[color:var(--accent-secondary)] focus:ring-[color:var(--accent-secondary)]/20"
              required
            />
            <span className="pt-0.5 text-sm font-bold text-zinc-600 transition-colors duration-200 group-hover:text-[color:var(--foreground)]">
              I understand this is not medical care.
            </span>
          </label>
        </section>

        {showFieldAlert && fieldError ? (
          <div
            id={errorId}
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-600"
          >
            {fieldError.message}
          </div>
        ) : null}

        {showServerAlert && error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs font-bold text-red-600"
          >
            {error}
          </div>
        ) : null}

        <AuthSubmitButton
          loading={loading}
          loadingLabel="Creating account…"
          disabled={loading}
        >
          Create account
        </AuthSubmitButton>

        <p className="text-center text-xs text-zinc-500 lg:text-left">
          Already have an account?{" "}
          <Link
            href="/login"
            className="focus-ring tap-target -my-2 inline-flex font-bold text-[color:var(--foreground)] transition-colors duration-200 hover:text-[color:var(--accent-secondary)]"
          >
            Sign in
          </Link>
        </p>
      </form>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-black/[0.06] pt-6 lg:justify-start">
        <Link
          href="/privacy"
          className="focus-ring tap-target rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)]"
        >
          Privacy
        </Link>
      </footer>
    </AuthShell>
  );
}
