import { messagingReady, VAPID_KEY, db, auth } from "./firebase-config.js";
import { getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { mostrarToast } from "./toast.js";

let swRegistration = null;

export async function initNotificaciones() {
  if ("serviceWorker" in navigator) {
    try {
      swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    } catch (err) {
      console.warn("No se pudo registrar el service worker:", err);
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    await registrarTokenFCM();
  }

  const messaging = await messagingReady;
  if (messaging) {
    onMessage(messaging, (payload) => {
      mostrarToast(payload.notification?.body || "Tienes una nueva notificación.");
    });
  }
}

export async function pedirPermisoNotificaciones() {
  if (!("Notification" in window)) {
    mostrarToast("Este navegador no soporta notificaciones.");
    return;
  }
  const permiso = await Notification.requestPermission();
  renderBanner();
  if (permiso === "granted") {
    await registrarTokenFCM();
    mostrarToast("Notificaciones activadas.");
  }
}

async function registrarTokenFCM() {
  try {
    const messaging = await messagingReady;
    if (!messaging || !swRegistration) return;
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });
    if (token && auth.currentUser) {
      await setDoc(doc(db, "dispositivos", token), {
        uid: auth.currentUser.uid,
        actualizadoEn: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("No se pudo obtener el token de notificaciones push:", err);
  }
}

export function renderBanner() {
  const slot = document.getElementById("notif-banner-slot");
  if (!slot) return;
  if (!("Notification" in window) || Notification.permission !== "default") {
    slot.innerHTML = "";
    return;
  }
  slot.innerHTML = `
    <div class="notif-banner">
      🔔 Activa las notificaciones para recibir un aviso de a quién visitarás cada día.
      <button class="btn btn-outline" id="btn-activar-notif" type="button">Activar</button>
    </div>
  `;
  document.getElementById("btn-activar-notif").addEventListener("click", pedirPermisoNotificaciones);
}

/** Llamar cada vez que se cargan las visitas de hoy. Dispara como máximo una notificación por día. */
export function notificarVisitasHoy(visitas) {
  renderBanner();
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (visitas.length === 0) return;

  const hoyKey = new Date().toDateString();
  if (localStorage.getItem("notif-mostrada-el") === hoyKey) return;
  localStorage.setItem("notif-mostrada-el", hoyKey);

  const nombres = visitas.slice(0, 3).map((v) => v.feligres?.nombre || v.iglesia).join(", ");
  const cuerpo = visitas.length > 3 ? `${nombres} y ${visitas.length - 3} más.` : nombres;

  mostrarNotificacionSistema("Visitas de hoy", `Hoy visitarás a: ${cuerpo}`);
}

function mostrarNotificacionSistema(titulo, cuerpo) {
  const opciones = {
    body: cuerpo,
    icon: "assets/icons/icon-192.png",
    badge: "assets/icons/icon-192.png",
  };
  if (swRegistration) {
    swRegistration.showNotification(titulo, opciones);
  } else {
    new Notification(titulo, opciones);
  }
}
