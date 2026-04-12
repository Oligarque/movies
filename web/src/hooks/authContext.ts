import { createContext, useContext } from "react";

export type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: number | null;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}