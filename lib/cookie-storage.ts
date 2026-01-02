import type { SyncStorage } from "jotai/vanilla/utils/atomWithStorage";

// Cookie storage adapter for Jotai atomWithStorage
// Works on both server (reads from document.cookie) and client

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export function createCookieStorage<T>(): SyncStorage<T> {
  return {
    getItem: (key: string, initialValue: T): T => {
      const value = getCookie(key);
      if (value === null) return initialValue;
      try {
        return JSON.parse(value) as T;
      } catch {
        return initialValue;
      }
    },
    setItem: (key: string, value: T) => {
      setCookie(key, JSON.stringify(value));
    },
    removeItem: (key: string) => {
      deleteCookie(key);
    },
  };
}
