import type { Response } from "express";

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
  hint?: string;
  [key: string]: unknown;
};

export function sendApiError(response: Response, status: number, payload: ApiErrorPayload): void {
  response.status(status).json({
    ok: false,
    error: payload.code,
    ...payload,
  });
}
