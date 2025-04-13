import { useEffect } from "react";
import { TURNSTILE_SITE_KEY } from "~/lib/ui.config";
import type { ChallengeAction } from "~/modules/user/user.service";

export default function Turnstile({
  action,
  onNewToken,
}: {
  action: ChallengeAction;
  onNewToken: (token: string) => void;
}) {
  useEffect(() => {
    if (window.turnstile) {
      window.turnstile.remove(window.turnstileWidgetId);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onloadTurnstileCallback";
    document.body.appendChild(script);

    window.onloadTurnstileCallback = function () {
      window.turnstileWidgetId = window.turnstile.render("#cf-turnstile", {
        sitekey: TURNSTILE_SITE_KEY,
        action,
        callback: onNewToken,
      });
    };
  }, []);

  return (
    <>
      <div id="cf-turnstile"></div>
    </>
  );
}
