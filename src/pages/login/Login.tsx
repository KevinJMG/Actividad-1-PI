import React from "react";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import UserDAO from "../daos/UserDAO"; // ← Ajusta la ruta
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();

      // Siempre pedir selección de cuenta
      provider.setCustomParameters({
        prompt: "select_account",
      });

      // Popup de inicio de sesión
      const result = await signInWithPopup(auth, provider);

      const fbUser = result.user;
      const idToken = await fbUser.getIdToken();

      // Guardar token
      localStorage.setItem("idToken", idToken);

      // Guardar usuario en Firestore
      await UserDAO.createUser({
        uid: fbUser.uid,
        email: fbUser.email,
        photoURL: fbUser.photoURL,
        displayName: fbUser.displayName,
      });

      console.log("🔥 Login exitoso");
      navigate("/home");

    } catch (err) {
      console.error("Error al iniciar sesión con Google:", err);
      alert("No se pudo iniciar sesión.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">Iniciar Sesión</h1>

      <button
        onClick={handleGoogleLogin}
        className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-lg shadow hover:bg-gray-200 transition"
      >
        <img src="/google.png" alt="Google" width={24} height={24} />
        Iniciar con Google
      </button>
    </div>
  );
};

export default Login;
