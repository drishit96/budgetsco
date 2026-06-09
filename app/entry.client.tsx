import { hydrateRoot } from "react-dom/client";
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
  });
}

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  setTimeout(hydrate, 1);
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/entry.worker.js").catch((error) => {
    console.error("Service worker registration failed", error);
  });
}
