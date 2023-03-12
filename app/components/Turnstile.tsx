import { useEffect } from "react";
import { TURNSTILE_SITE_KEY } from "~/lib/ui.config";
import type { ChallengeAction } from "~/modules/user/user.service";

export default function Turnstile({ action }: { action: ChallengeAction }) {
  useEffect(() => {
    if (window.turnstile) {
      window.turnstile.remove(window.turnstileWidgetId);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
    document.body.appendChild(script);

    window.onloadTurnstileCallback = function () {
      window.turnstileWidgetId = window.turnstile.render("#cf-turnstile", {
        sitekey: TURNSTILE_SITE_KEY,
        action,
      });
    };
  }, []);

  return (
    <>
      <div id="cf-turnstile"></div>
    </>
  );
}
