export const DEFAULT_OPERATOR_EMAIL = "cameronnicodemus@gmail.com";

export function isAllowedEmail(
  email: string | null | undefined,
  envValue: string | null | undefined,
  operatorEmail: string | null | undefined =
    process.env.DASHBOARD_OPERATOR_EMAIL,
): boolean {
  const operatorFloor =
    operatorEmail?.trim().toLowerCase() || DEFAULT_OPERATOR_EMAIL;
  const allowedEmails = (envValue ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  // Google OAuth lets arbitrary Google accounts create sessions, so an unset
  // beta allowlist must deny everyone except the operator floor, not admit them.
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail) return false;

  return (
    normalizedEmail === operatorFloor || allowedEmails.includes(normalizedEmail)
  );
}
