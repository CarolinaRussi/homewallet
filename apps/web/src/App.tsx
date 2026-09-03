import { APP_NAME } from "@homewallet/shared";

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-start justify-center gap-3 px-8">
      <p className="text-sm font-medium tracking-wide text-muted uppercase">
        Scaffold
      </p>
      <h1 className="text-4xl font-semibold text-fg">{APP_NAME}</h1>
      <p className="max-w-md text-muted">
        Calm personal &amp; shared finance. Part 1 — apps boot; product UI comes
        later.
      </p>
      <p className="tabular-nums text-accent">R$ 0,00</p>
    </main>
  );
}
