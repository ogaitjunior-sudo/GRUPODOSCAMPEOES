const APP_CACHE_STORAGE_KEYS = [
  "gc_championships_v2",
  "gc_championship_workspaces_v2",
  "gc_admin_panel_state_cache_v1",
  "gc_friendly_challenges_v1",
] as const;

export async function refreshApplicationCache() {
  if (typeof window === "undefined") {
    return;
  }

  APP_CACHE_STORAGE_KEYS.forEach((key) => {
    window.localStorage.removeItem(key);
  });

  if ("caches" in window) {
    const cacheNames = await window.caches.keys().catch(() => [] as string[]);
    await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker
      .getRegistrations()
      .catch(() => [] as ServiceWorkerRegistration[]);

    await Promise.all(
      registrations.map((registration) => registration.update().catch(() => undefined)),
    );
  }

  window.location.reload();
}
