import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";

export let loader: LoaderFunction = () => {
  return json(
    {
      short_name: "Budgetsco",
      name: "Budgetsco",
      start_url: "/dashboard",
      display: "standalone",
      background_color: "#FFFFFF",
      theme_color: "#047857",
      shortcuts: [
        {
          name: "New Transaction",
          url: "/transaction/create/",
          icons: [
            {
              src: "/icons/budgetsco_144x144_v1.png",
              sizes: "96x96",
              type: "image/png",
            },
          ],
        },
      ],
      icons: [
        {
          src: "/icons/budgetsco_512x512_v1.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/budgetsco_192x192_v1.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icons/budgetsco_144x144_v1.png",
          sizes: "144x144",
          type: "image/png",
        },
      ],
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Type": "application/manifest+json",
      },
    }
  );
};
