import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
import { sendApiError } from "../lib/api-errors.js";
import { verifyPassword } from "../utils/hash.js";
import {
  clearFailedLoginAttempts,
  getLoginBlockStatus,
  registerFailedLoginAttempt,
} from "../utils/loginThrottle.js";
import { getSessionExpiry, SESSION_DURATION_MS } from "../utils/session.js";

const prisma = new PrismaClient();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: SESSION_DURATION_MS,
  // Use root path so cookie is sent for both /api/* (dev) and /movies-api/api/* (prod proxy).
  path: "/",
};

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const blockStatus = getLoginBlockStatus(req);
      if (blockStatus.blocked) {
        sendApiError(res, 429, {
          code: "AUTH_RATE_LIMITED",
          message: "Too many failed login attempts. Try again later.",
          retryAfterSeconds: blockStatus.retryAfterSeconds,
        });
        return;
      }

      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!password.trim()) {
        sendApiError(res, 400, { code: "PASSWORD_REQUIRED", message: "Password required" });
        return;
      }

      const user = await prisma.user.findFirst({
        orderBy: { id: "asc" },
      });

      if (!user) {
        sendApiError(res, 500, { code: "SYSTEM_ERROR", message: "System error" });
        return;
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        const failedAttemptResult = registerFailedLoginAttempt(req);

        if (failedAttemptResult.blocked) {
          sendApiError(res, 429, {
            code: "AUTH_LOCKED",
            message: "Too many failed login attempts. Locked for 12 hours.",
            retryAfterSeconds: failedAttemptResult.retryAfterSeconds,
          });
          return;
        }

        sendApiError(res, 401, {
          code: "INVALID_PASSWORD",
          message: "Invalid password",
          remainingAttempts: failedAttemptResult.remainingAttempts,
        });
        return;
      }

      clearFailedLoginAttempts(req);

      const session = await prisma.session.create({
        data: {
          userId: user.id,
          expiresAt: getSessionExpiry(),
        },
      });

      res.cookie("sessionId", session.id, cookieOptions);
      res.status(200).json({ ok: true, userId: user.id, sessionId: session.id });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Login error:", error);
      sendApiError(res, 500, { code: "LOGIN_FAILED", message: "Login failed" });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      if (!req.session) {
        sendApiError(res, 401, { code: "NOT_AUTHENTICATED", message: "Not authenticated" });
        return;
      }

      await prisma.session.deleteMany({
        where: { id: req.session.id },
      });

      res.clearCookie("sessionId", cookieOptions);
      res.status(200).json({ ok: true });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", error);
      sendApiError(res, 500, { code: "LOGOUT_FAILED", message: "Logout failed" });
    }
  },

  async me(req: Request, res: Response) {
    if (!req.session) {
      sendApiError(res, 401, { code: "NO_VALID_SESSION", message: "No valid session" });
      return;
    }

    res.status(200).json({
      ok: true,
      userId: req.session.userId,
      sessionId: req.session.id,
    });
  },
};
