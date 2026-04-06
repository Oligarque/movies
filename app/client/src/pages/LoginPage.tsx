import { useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/authContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(password);
      navigate("/", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Connexion impossible");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page">
      <header className="pageHeader">
        <div className="headerTitleWrap">
          <h1>Connexion Admin</h1>
          <p>Acces protege a ton classement de films</p>
        </div>
      </header>

      <section className="emptyState" style={{ maxWidth: 480, margin: "2rem auto" }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.75rem" }}>
          <label htmlFor="password" className="searchLabel">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            className="searchInput"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
          />
          {error ? <p className="state error">{error}</p> : null}
          <button type="submit" className="addMovieButton" disabled={isSubmitting}>
            {isSubmitting ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ marginTop: "1rem" }}>
          Voir le classement public: <Link to="/public">/public</Link>
        </p>
      </section>
    </main>
  );
}
