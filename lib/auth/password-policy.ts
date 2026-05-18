/** Shared signup password rules (client + API). */

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordRequirementId =
  | "length"
  | "uppercase"
  | "lowercase"
  | "number";

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    test: (p) => p.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: "lowercase",
    label: "One lowercase letter",
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: "number",
    label: "One number",
    test: (p) => /\d/.test(p),
  },
] as const;

export function getPasswordRequirementStatus(
  password: string,
): Record<PasswordRequirementId, boolean> {
  return PASSWORD_REQUIREMENTS.reduce(
    (acc, req) => {
      acc[req.id] = req.test(password);
      return acc;
    },
    {} as Record<PasswordRequirementId, boolean>,
  );
}

export function passwordMeetsPolicy(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}

export function firstPasswordPolicyMessage(password: string): string | null {
  const failed = PASSWORD_REQUIREMENTS.find((req) => !req.test(password));
  return failed ? `Password must include: ${failed.label.toLowerCase()}.` : null;
}
