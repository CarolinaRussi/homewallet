import type { SessionUser } from "@homewallet/shared";
import { api } from "../../shared/lib/api";

export function fetchSession() {
  return api<{ user: SessionUser }>("/auth/me");
}

export function registerAccount(body: {
  email: string;
  password: string;
  name: string;
}) {
  return api<{ user: SessionUser; spaceId: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginAccount(body: { email: string; password: string }) {
  return api<{ user: SessionUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginWithGoogle(idToken: string) {
  return api<{ user: SessionUser; createdSpace: boolean; spaceId?: string }>(
    "/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ idToken }),
    }
  );
}

export function linkGoogle(idToken: string) {
  return api<{ user: SessionUser }>("/auth/link-google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function verifyEmail(token: string) {
  return api<void>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export function resendVerifyEmail() {
  return api<void>("/auth/resend-verify-email", { method: "POST" });
}

export function logoutAccount() {
  return api<void>("/auth/logout", { method: "POST" });
}

export function forgotPassword(body: { email: string }) {
  return api<void>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function resetPassword(body: { token: string; password: string }) {
  return api<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function downloadEntriesCsv() {
  const response = await fetch("/api/auth/me/export.csv", {
    credentials: "include",
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => ({}));
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: string }).error === "string"
        ? (body as { error: string }).error
        : "Request failed";
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "homewallet-entries.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function deleteAccount() {
  return api<void>("/auth/me", { method: "DELETE" });
}
