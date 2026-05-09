const APP_CACHE_STORAGE_KEYS = [
  "gc_championships_v2",
  "gc_championship_workspaces_v2",
  "gc_admin_panel_state_cache_v1",
  "gc_friendly_challenges_v1",
] as const;
const APP_BUILD_ID_STORAGE_KEY = "gc_app_build_id";
const APP_BUILD_RELOAD_STORAGE_KEY = "gc_app_build_reload_once";

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

export async function refreshApplicationCacheForBuild(buildId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentBuildId = window.localStorage.getItem(APP_BUILD_ID_STORAGE_KEY);

  if (!currentBuildId) {
    window.localStorage.setItem(APP_BUILD_ID_STORAGE_KEY, buildId);
    window.sessionStorage.removeItem(APP_BUILD_RELOAD_STORAGE_KEY);
    return;
  }

  if (currentBuildId === buildId) {
    window.sessionStorage.removeItem(APP_BUILD_RELOAD_STORAGE_KEY);
    return;
  }

  const hasReloaded = window.sessionStorage.getItem(APP_BUILD_RELOAD_STORAGE_KEY) === buildId;
  window.localStorage.setItem(APP_BUILD_ID_STORAGE_KEY, buildId);

  if (hasReloaded) {
    return;
  }

  window.sessionStorage.setItem(APP_BUILD_RELOAD_STORAGE_KEY, buildId);
  await refreshApplicationCache();
}
