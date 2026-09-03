import { useEffect, useRef } from "react";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  string | undefined;

type GoogleSignInProps = {
  onCredential: (idToken: string) => void;
};

export function GoogleSignIn({ onCredential }: GoogleSignInProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => onCredentialRef.current(response.credential),
      });
      if (buttonRef.current) {
        window.google?.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
        });
      }
    };
    document.head.append(script);
    return () => script.remove();
  }, []);

  if (!googleClientId) {
    return null;
  }

  return <div ref={buttonRef} />;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            config: { theme: string; size: string }
          ) => void;
        };
      };
    };
  }
}
