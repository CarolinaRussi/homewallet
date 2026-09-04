const WELCOME_KEY = "hw_welcome_space";

export type WelcomeIntent = {
  firstSpace: boolean;
  spaceId: string;
};

export function setWelcomeIntent(intent: WelcomeIntent) {
  sessionStorage.setItem(WELCOME_KEY, JSON.stringify(intent));
}

export function peekWelcomeIntent(): WelcomeIntent | null {
  const raw = sessionStorage.getItem(WELCOME_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as WelcomeIntent;
    if (!parsed.spaceId) {
      sessionStorage.removeItem(WELCOME_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(WELCOME_KEY);
    return null;
  }
}

export function clearWelcomeIntent() {
  sessionStorage.removeItem(WELCOME_KEY);
}
