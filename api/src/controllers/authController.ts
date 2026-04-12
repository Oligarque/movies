import { PrismaClient } from "@prisma/client";
import type { Request, Response } from "express";
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
  path: "/api",
};

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const blockStatus = getLoginBlockStatus(req);
      if (blockStatus.blocked) {
        res.status(429).json({
          error: "Too many failed login attempts. Try again later.",
          retryAfterSeconds: blockStatus.retryAfterSeconds,
        });
        return;
      }

      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!password.trim()) {
        res.status(400).json({ error: "Password required" });
        return;
      }

      const user = await prisma.user.findFirst({
        orderBy: { id: "asc" },
      });

      if (!user) {
        res.status(500).json({ error: "System error" });
        return;
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        const failedAttemptResult = registerFailedLoginAttempt(req);

        if (failedAttemptResult.blocked) {
          res.status(429).json({
            error: "Too many failed login attempts. Locked for 12 hours.",
            retryAfterSeconds: failedAttemptResult.retryAfterSeconds,
          });
          return;
        }

        res.status(401).json({
          error: "Invalid password",
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
      res.status(500).json({ error: "Login failed" });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      if (!req.session) {
        res.status(401).json({ error: "Not authenticated" });
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
      res.status(500).json({ error: "Logout failed" });
    }
  },

  async me(req: Request, res: Response) {
    if (!req.session) {
      res.status(401).json({ error: "No valid session" });
      return;
    }

    res.status(200).json({
      ok: true,
      userId: req.session.userId,
      sessionId: req.session.id,
    });
  },
};
