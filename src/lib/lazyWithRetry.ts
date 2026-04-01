import { lazy, ComponentType } from "react";

export function lazyWithRetry(
  factory: () => Promise<{ default: ComponentType<any> }>
) {
  return lazy(async () => {
    const key = "page-has-been-force-refreshed";
    try {
      return await factory();
    } catch (error) {
      const hasRefreshed = sessionStorage.getItem(key);
      if (!hasRefreshed) {
        sessionStorage.setItem(key, "true");
        window.location.reload();
        return { default: () => null };
      }
      sessionStorage.removeItem(key);
      throw error;
    }
  });
}
