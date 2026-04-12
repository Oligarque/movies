export interface AuthMeResponse {
  ok: boolean;
  userId: number;
  sessionId: string;
}

export interface AuthLoginResponse {
  ok: boolean;
  userId: number;
  sessionId: string;
}

export interface PublicMovie {
  id: number;
  tmdbId: number;
  title: string;
  posterUrl: string | null;
  directorName: string | null;
  releaseDate?: string | null;
  synopsis?: string | null;
  rank: number;
  lastWatchedAt?: string | null;
  reviewText?: string | null;
  createdAt: string;
  updatedAt: string;
}
