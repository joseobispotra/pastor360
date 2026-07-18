import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const form = document.getElementById("login-form");

if (form) {
  const btn = document.getElementById("login-btn");
  const errorEl = document.getElementById("login-error");

  onAuthStateChanged(auth, (user) => {
    if (user) window.location.replace("app.html");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    btn.disabled = true;
    btn.textContent = "Entrando...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace("app.html");
    } catch (err) {
      errorEl.textContent = mensajeError(err.code);
      btn.disabled = false;
      btn.textContent = "Entrar";
    }
  });
}

export function cerrarSesion() {
  return signOut(auth);
}

export function requerirSesion(onUser) {
  return onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.replace("index.html");
      return;
    }
    onUser(user);
  });
}

function mensajeError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Correo inválido.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Intenta más tarde.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}
