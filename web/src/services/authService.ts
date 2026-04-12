import { apiUrl } from "../api";
import type { AuthLoginResponse, AuthMeResponse, PublicMovie } from "../types/auth";

async function parseError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

export const authService = {
  async login(password: string): Promise<AuthLoginResponse> {
    const response = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Login failed"));
    }

    return (await response.json()) as AuthLoginResponse;
  },

  async logout(): Promise<void> {
    const response = await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Logout failed"));
    }
  },

  async me(): Promise<AuthMeResponse> {
    const response = await fetch(apiUrl("/api/auth/me"), {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(await parseError(response, "Not authenticated"));
    }

    return (await response.json()) as AuthMeResponse;
  },

  async getPublicRanking(): Promise<PublicMovie[]> {
    const response = await fetch(apiUrl("/api/public/ranking"));

    if (!response.ok) {
      throw new Error(await parseError(response, "Failed to fetch ranking"));
    }

    const body = (await response.json()) as { movies?: PublicMovie[] };
    return body.movies ?? [];
  },
};
