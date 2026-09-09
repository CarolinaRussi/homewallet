export const SESSION_COOKIE = "hw_session";

export function sessionCookieOptions() {
  const webOrigin = process.env.WEB_ORIGIN ?? "";
  const secure =
    process.env.NODE_ENV === "production" || webOrigin.startsWith("https://");

  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure,
  };
}
