import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

interface ProtectedRouteProps {
  children: ReactNode; // Componentes que se mostrarán solo si el usuario está autenticado
}

/**
 * ProtectedRoute
 * --------------
 * Componente que actúa como una "ruta protegida".
 * Solo renderiza el contenido interno (children) si el usuario está autenticado.
 * En caso contrario, redirige automáticamente a la ruta de inicio.
 *
 * Flujo:
 * 1. Escucha cambios de autenticación con Firebase (onAuthStateChanged)
 * 2. Mientras verifica, muestra un mensaje de "cargando"
 * 3. Si NO hay usuario → redirige al login
 * 4. Si hay usuario → renderiza el contenido protegido
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Indica si todavía estamos verificando el estado de autenticación
  const [loading, setLoading] = useState(true);

  // Indica si el usuario está autenticado
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const auth = getAuth();

    /**
     * onAuthStateChanged
     * ------------------
     * Se ejecuta cada vez que cambia el estado de sesión:
     * - login
     * - logout
     * - refresh del token
     */
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setLoggedIn(!!user); // true si existe usuario, false si no
      setLoading(false);   // Ya terminó la verificación
    });

    // Limpieza: detiene el listener cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  // Mostrar indicador mientras Firebase valida el login
  if (loading) {
    return <div className="text-white">Verificando autenticación...</div>;
  }

  // Si no está logueado → redirige al inicio
  if (!loggedIn) {
    return <Navigate to="/" replace />;
  }

  // Usuario autenticado → renderiza los componentes protegidos
  return children;
}
