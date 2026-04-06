# V2 - Frontend Design

## 🎨 Router Setup

### App.tsx (Main Router)

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';

import LoginPage from './pages/LoginPage';
import EditorPage from './pages/EditorPage';
import PublicPage from './pages/PublicPage';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Vérification de session...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login page - accessible to all */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          } 
        />

        {/* Protected editor */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          } 
        />

        {/* Public ranking - accessible to all */}
        <Route 
          path="/public" 
          element={<PublicPage />} 
        />

        {/* Catch all -> redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 🔐 Components de Routage

### ProtectedRoute.tsx

```typescript
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;
```

### PublicRoute.tsx (optional)

```typescript
// PublicRoute est juste une passthrough pour clarté
import { ReactNode } from 'react';

interface PublicRouteProps {
  children: ReactNode;
}

function PublicRoute({ children }: PublicRouteProps) {
  return <>{children}</>;
}

export default PublicRoute;
```

---

## 📄 Pages

### LoginPage.tsx

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import { authService } from '../services/authService';

function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(password: string) {
    setError(null);
    try {
      await authService.login(password);
      navigate('/'); // Redirect to editor
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erreur lors de la connexion'
      );
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>🎬 Mes Films</h1>
        <p className="subtitle">Connectez-vous pour gérer votre ranking</p>
        
        {error && <div className="error-banner">{error}</div>}
        
        <LoginForm onSubmit={handleLogin} />
        
        <p className="note">Version publique: <a href="/public">voir le ranking</a></p>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .login-container {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 400px;
          width: 100%;
        }
        h1 { margin: 0 0 0.5rem; text-align: center; }
        .subtitle { text-align: center; color: #666; margin-bottom: 2rem; }
        .error-banner {
          background: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }
        .note { text-align: center; font-size: 0.9rem; color: #666; }
        .note a { color: #667eea; text-decoration: none; }
      `}</style>
    </div>
  );
}

export default LoginPage;
```

### EditorPage.tsx

```typescript
import { useAuth } from '../hooks/useAuth';
import LogoutButton from '../components/LogoutButton';
import VirtualizedMovieCardList from '../components/VirtualizedMovieCardList';
// (rest existing code)

function EditorPage() {
  const { user } = useAuth();

  return (
    <div className="editor">
      <header className="editor-header">
        <h1>🎬 Mes Films</h1>
        <LogoutButton />
      </header>
      
      <main className="editor-main">
        {/* Existing components */}
        <VirtualizedMovieCardList />
      </main>

      <style>{`
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .editor-header h1 { margin: 0; }
      `}</style>
    </div>
  );
}

export default EditorPage;
```

### PublicPage.tsx

```typescript
import { useEffect, useState } from 'react';
import { authService } from '../services/authService';

interface PublicMovie {
  id: number;
  title: string;
  posterUrl?: string;
  rank: number;
}

function PublicPage() {
  const [movies, setMovies] = useState<PublicMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPublicRanking() {
      try {
        const data = await authService.getPublicRanking();
        setMovies(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erreur lors du chargement'
        );
      } finally {
        setLoading(false);
      }
    }
    fetchPublicRanking();
  }, []);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="public-page">
      <header className="public-header">
        <h1>🎬 Ranking Public</h1>
        <span className="badge">Public View</span>
      </header>

      {error && <div className="error">{error}</div>}

      <main className="public-list">
        {movies.map((movie) => (
          <div key={movie.id} className="public-movie">
            {movie.posterUrl && (
              <img 
                src={movie.posterUrl} 
                alt={movie.title}
                className="poster"
              />
            )}
            <div className="details">
              <h3>{movie.title}</h3>
              <div className="rank">#{movie.rank}</div>
            </div>
          </div>
        ))}
      </main>

      <footer className="public-footer">
        <a href="/">← Revenir à l'éditeur</a>
      </footer>

      <style>{`
        .public-page {
          min-height: 100vh;
          background: #f5f5f5;
        }
        .public-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 2rem;
          text-align: center;
          position: relative;
        }
        .public-header h1 { margin: 0 0 1rem; }
        .badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-size: 0.85rem;
        }
        .public-list {
          max-width: 900px;
          margin: 2rem auto;
          padding: 0 1rem;
        }
        .public-movie {
          display: flex;
          gap: 1rem;
          background: white;
          padding: 1rem;
          margin-bottom: 1rem;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .poster {
          width: 60px;
          height: 90px;
          object-fit: cover;
          border-radius: 4px;
        }
        .details {
          flex: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .details h3 { margin: 0; }
        .rank {
          font-size: 1.5rem;
          color: #667eea;
          font-weight: bold;
        }
        .error {
          background: #fee;
          color: #c33;
          padding: 1rem;
          margin: 1rem;
          border-radius: 6px;
        }
        .public-footer {
          text-align: center;
          padding: 2rem;
        }
        .public-footer a {
          color: #667eea;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

export default PublicPage;
```

---

## 🎯 Components

### LoginForm.tsx

```typescript
import { useState } from 'react';

interface LoginFormProps {
  onSubmit: (password: string) => Promise<void>;
}

function LoginForm({ onSubmit }: LoginFormProps) {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onSubmit(password);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Connexion...' : 'Se connecter'}
      </button>

      <style>{`
        form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        input {
          padding: 0.8rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 1rem;
        }
        input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        button {
          padding: 0.8rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }
        button:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </form>
  );
}

export default LoginForm;
```

### LogoutButton.tsx

```typescript
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

function LogoutButton() {
  const navigate = useNavigate();

  async function handleLogout() {
    await authService.logout();
    navigate('/login');
  }

  return (
    <button onClick={handleLogout} className="logout-btn">
      Déconnexion
    </button>
  );
}

export default LogoutButton;
```

---

## 🪝 Custom Hooks

### useAuth.ts

```typescript
import { useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user?: { userId?: number };
  error?: string;
}

const defaultContext: AuthContextType = {
  isAuthenticated: false,
  isLoading: true,
};

// Export context pour provider
export const AuthContext = React.createContext<AuthContextType>(defaultContext);

export function useAuth(): AuthContextType {
  const [auth, setAuth] = useState<AuthContextType>(defaultContext);

  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await authService.getMe();
        setAuth({
          isAuthenticated: true,
          isLoading: false,
          user: { userId: response.userId },
        });
      } catch {
        setAuth({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
    checkSession();
  }, []);

  return auth;
}
```

### Wrap in App.tsx with Provider

```typescript
import { AuthContext } from './hooks/useAuth';

function AppWrapper() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <App />
    </AuthContext.Provider>
  );
}
```

---

## 🔗 Services

### authService.ts

```typescript
const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

export const authService = {
  async login(password: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Important: send cookies
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error ?? 'Login failed');
    }

    return res.json();
  },

  async logout() {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Logout failed');
    }
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Not authenticated');
    }

    return res.json();
  },

  async getPublicRanking() {
    const res = await fetch(`${API_BASE}/api/public/ranking`);

    if (!res.ok) {
      throw new Error('Failed to fetch ranking');
    }

    const data = await res.json();
    return data.movies ?? [];
  },
};
```

---

## 🗂️ Types

### types/auth.ts

```typescript
export interface AuthUser {
  userId: number;
}

export interface AuthResponse {
  ok: boolean;
  userId: number;
  sessionId: string;
}

export interface PublicMovie {
  id: number;
  title: string;
  posterUrl?: string;
  rank: number;
}
```

---

## ✅ Checklist Frontend

- [ ] Router configuré (BrowserRouter, Routes)
- [ ] ProtectedRoute wrapper créé
- [ ] LoginPage créée + form
- [ ] EditorPage modifiée (+ LogoutButton)
- [ ] PublicPage créée
- [ ] useAuth hook implémenté
- [ ] authService.ts créé
- [ ] Env var VITE_API_BASE_URL utilisée
- [ ] credentials: 'include' sur tous les fetch auth
- [ ] Redirect /login si pas authentifié
- [ ] Redirect / si déjà authentifié et va sur /login

---

**Prêt pour la sécurité?** → Voir [05-SECURITY.md](05-SECURITY.md)
