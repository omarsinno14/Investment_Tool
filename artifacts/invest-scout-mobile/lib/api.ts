const domain = process.env.EXPO_PUBLIC_DOMAIN;
const BASE_URL = domain ? `https://${domain}` : "";

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}
