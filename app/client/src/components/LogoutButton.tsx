import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function LogoutButton() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = async () => {
    setIsSubmitting(true);
    try {
      await logout();
      navigate("/login", { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button className="addMovieButton" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "Deconnexion..." : "Se deconnecter"}
    </button>
  );
}
