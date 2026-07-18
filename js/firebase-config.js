import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

// 1) Pega aquí la configuración de tu proyecto Firebase.
//    (Firebase Console > Configuración del proyecto > Tus apps > Config del SDK)
const firebaseConfig = {
  apiKey: "AIzaSyA8JwOyOgw78eC3PQ3kMAXK-njGcOUsAKY",
  authDomain: "visitas-pastorales-65a3b.firebaseapp.com",
  projectId: "visitas-pastorales-65a3b",
  storageBucket: "visitas-pastorales-65a3b.firebasestorage.app",
  messagingSenderId: "359148626098",
  appId: "1:359148626098:web:16d5de0d07b589a671e9ab",
};

// 2) Pega aquí la VAPID key.
//    (Firebase Console > Cloud Messaging > Certificados push web > Generar par de claves)
export const VAPID_KEY = "BHZnnQtD8uPiNXBz2s8ili1SOdjBknfRcdar2fU1NCyUtVZIkFg3Vq5U3nP6RVuRoaziTyY41MGX8auBDkVza10";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firebase Messaging no está soportado en todos los navegadores (ej. Safari en iOS
// solo si la app fue instalada a la pantalla de inicio) — se resuelve de forma segura.
export const messagingReady = isSupported().then((supported) =>
  supported ? getMessaging(app) : null
);
