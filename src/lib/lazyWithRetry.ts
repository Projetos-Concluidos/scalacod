import { lazy, ComponentType } from "react";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function lazyWithRetry(
  factory: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(async () => {
    const key = "page-has-been-force-refreshed";
    try {
      return await factory();
    } catch (error) {
      console.error("[lazyWithRetry] Chunk load failed:", error);
      const hasRefreshed = sessionStorage.getItem(key);
      if (!hasRefreshed) {
        sessionStorage.setItem(key, "true");
        await delay(1500);
        window.location.reload();
        return { default: () => null };
      }
      sessionStorage.removeItem(key);
      throw error;
    }
  });
}
