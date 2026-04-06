import type { Session } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export {};
