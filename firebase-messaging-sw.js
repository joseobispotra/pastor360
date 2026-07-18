/* Service worker de Firebase Cloud Messaging.
   IMPORTANTE: esta configuración debe ser IDÉNTICA a la de js/firebase-config.js
   (los service workers no pueden importar módulos ES fácilmente, así que se duplica aquí). */
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO",
  storageBucket: "TU_PROYECTO.appspot.com",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const titulo = payload.notification?.title || "Visitas Pastorales";
  const cuerpo = payload.notification?.body || "";
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
  });
});
