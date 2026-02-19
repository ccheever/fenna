const STORAGE_KEY = "fenna_recraft_api_key";

export function getApiKey(): string | null {
  // Env var (baked in at build time) takes priority
  const envKey = process.env.EXPO_PUBLIC_RECRAFT_API_TOKEN;
  if (envKey) return envKey;

  // Fall back to localStorage override
  if (typeof window !== "undefined") {
    return localStorage.getItem(STORAGE_KEY);
  }

  return null;
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}
