import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { getMessaging, isSupported } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

// 1) Pega aquí la configuración de tu proyecto Firebase.
//    (Firebase Console > Configuración del proyecto > Tus apps > Config del SDK)
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
};

// 2) Pega aquí la VAPID key.
//    (Firebase Console > Cloud Messaging > Certificados push web > Generar par de claves)
export const VAPID_KEY = "TU_VAPID_KEY";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Firebase Messaging no está soportado en todos los navegadores (ej. Safari en iOS
// solo si la app fue instalada a la pantalla de inicio) — se resuelve de forma segura.
export const messagingReady = isSupported().then((supported) =>
  supported ? getMessaging(app) : null
);
