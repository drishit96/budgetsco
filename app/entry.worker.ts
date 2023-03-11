/// <reference lib="WebWorker" />

import { json } from "@remix-run/server-runtime";
import type { FirebaseApp } from "firebase/app";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import { Queue } from "workbox-background-sync";
import { firebaseConfig } from "./lib/ui.config";
import escapeRegExp from "lodash.escaperegexp";

const queue = new Queue("budgetsco");

export type {};
declare let self: ServiceWorkerGlobalScope;

const STATIC_ASSETS = ["/build/", "/icons/", "/images", "/"];

const ASSET_CACHE = "asset-cache";
const DATA_CACHE = "data-cache";
const DOCUMENT_CACHE = "document-cache";

function debug(...messages: any[]) {
  if (process.env.NODE_ENV === "development") {
    console.debug(...messages);
  }
}

async function handleInstall(event: ExtendableEvent) {
  debug("Service worker installed");
}

async function handleActivate(event: ExtendableEvent) {
  debug("Service worker activated");
}

async function handleMessage(event: ExtendableMessageEvent) {
  const cachePromises: Map<string, Promise<void>> = new Map();

  if (event.data.type === "REMIX_NAVIGATION") {
    const { isMount, location } = event.data;
    const documentUrl = escapeRegExp(location.pathname + location.search + location.hash);

    const [documentCache, existingDocument] = await Promise.all([
      caches.open(DOCUMENT_CACHE),
      caches.match(documentUrl),
    ]);

    if (!existingDocument || !isMount) {
      debug("Caching document for", documentUrl);
      cachePromises.set(
        documentUrl,
        documentCache.add(documentUrl).catch((error) => {
          debug(`Failed to cache document for ${documentUrl}:`, error);
        })
      );
    }

    await Promise.all(cachePromises.values());
  } else if (event.data.type === "SYNC_PENDING_REQUESTS") {
    try {
      await queue.replayRequests();
      event.source?.postMessage({ type: "REQUESTS_SYNCED" });
    } catch (error) {
      debug(error);
    }
  } else if (event.data.type === "DELETE_FROM_CACHE") {
    try {
      const cache = await caches.open(DATA_CACHE);
      let tasks: Promise<boolean>[] = [];
      event.data.dataCacheToDelete.forEach((path: string) => {
        tasks.push(
          cache.delete(new URL(`${location.protocol}//${location.host}${path}`))
        );
      });
      await Promise.all(tasks);
      event.source?.postMessage({
        type: "CACHE_DELETED",
        isDeleted: true,
      });
    } catch (error) {
      debug(error);
    }
  } else if (event.data.type === "CLEAR_ALL_CACHE") {
    try {
      (await caches.keys()).forEach((c) => caches.delete(c));
    } catch (error) {
      debug(error);
    }
  }
}

async function handleFetch(event: FetchEvent): Promise<Response> {
  const url = new URL(event.request.url);

  if (isAssetRequest(event.request)) {
    const cached = await caches.match(event.request, {
      cacheName: ASSET_CACHE,
      ignoreVary: true,
      ignoreSearch: true,
    });
    if (cached) {
      debug("Serving asset from cache", url.pathname);
      return cached;
    }

    debug("Serving asset from network", url.pathname);
    const response = await fetch(event.request.clone(), { credentials: "same-origin" });
    if (response.status === 200) {
      const cache = await caches.open(ASSET_CACHE);
      await cache.put(event.request, response.clone());
    }
    return response;
  }

  if (isLoaderRequest(event.request)) {
    try {
      debug("Serving data from network", url.pathname + url.search);

      const cache = await caches.open(DATA_CACHE);
      if (isCacheFirstRequest(event.request)) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          cachedResponse.headers.set("X-Remix-Worker", "yes");
          return cachedResponse;
        }
      }

      const response = await fetch(event.request.clone(), { credentials: "same-origin" });
      await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      debug(
        "Serving data from network failed, falling back to cache",
        url.pathname + url.search
      );
      const response = await caches.match(event.request);
      if (response) {
        response.headers.set("X-Remix-Worker", "yes");
        return response;
      }

      return json({ message: "Network Error" });
    }
  }

  if (isDocumentGetRequest(event.request)) {
    try {
      debug("Serving document from network", url.pathname);
      const response = await fetch(event.request, { credentials: "same-origin" });
      const cache = await caches.open(DOCUMENT_CACHE);
      await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      debug("Serving document from network failed, falling back to cache", url.pathname);
      const response = await caches.match(event.request);
      if (response) {
        return response;
      }
      throw error;
    }
  }

  if (isPostRequest(event.request)) {
    try {
      const response = await fetch(event.request.clone(), { credentials: "same-origin" });
      return response;
    } catch (error) {
      await queue.pushRequest({ request: event.request.clone() });
      const client = await self.clients.get(event.clientId);
      client?.postMessage({ type: "NEW_REQUEST_IN_RETRY_QUEUE" });
      return new Response(null, {
        status: 204,
        headers: { "X-remix-redirect": "/" },
      });
    }
  }

  return fetch(event.request.clone(), { credentials: "same-origin" });
}

function isMethod(request: Request, methods: string[]) {
  return methods.includes(request.method.toLowerCase());
}

function isAssetRequest(request: Request) {
  return (
    isMethod(request, ["get"]) &&
    STATIC_ASSETS.some((publicPath) => request.url.startsWith(publicPath))
  );
}

function isLoaderRequest(request: Request) {
  const url = new URL(request.url);
  return isMethod(request, ["get"]) && url.searchParams.get("_data");
}

function isCacheFirstRequest(request: Request) {
  const url = new URL(request.url);
  return false;
}

function isDocumentGetRequest(request: Request) {
  return isMethod(request, ["get"]) && request.mode === "navigate";
}

function isPostRequest(request: Request) {
  return isMethod(request, ["post"]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(handleInstall(event).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(handleActivate(event).then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  event.waitUntil(handleMessage(event));
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    (async () => {
      const result = {} as
        | { error: unknown; response: Response }
        | { error: undefined; response: Response };
      try {
        result.response = await handleFetch(event);
      } catch (error) {
        result.error = error;
      }

      return appHandleFetch(event, result);
    })()
  );
});

async function appHandleFetch(
  event: FetchEvent,
  {
    response,
  }: { error: unknown; response: Response } | { error: undefined; response: Response }
): Promise<Response> {
  return response;
}

try {
  const app: FirebaseApp = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);
  onBackgroundMessage(messaging, (payload) => {
    const notificationTitle = payload.data?.title;
    const notificationOptions: NotificationOptions = {
      body: payload.data?.body,
      icon: "/icons/budgetsco_192x192_v1.png",
      actions: [{ title: "Open app", action: "open_app" }],
    };

    if (notificationTitle) {
      self.registration
        .showNotification(notificationTitle, notificationOptions)
        .catch((error) => {
          console.log(error);
        });
    }
  });

  self.onnotificationclick = (event) => {
    event.notification.close();

    // This looks to see if the current is already open and focuses if it is
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then(async (clientList) => {
        for (const client of clientList) {
          if (client.url === "/dashboard" && "focus" in client) return client.focus();
        }
        const newClient = await self.clients.openWindow("/dashboard");
        newClient?.focus();
      })
    );
  };
} catch (error) {
  console.log(error);
}
