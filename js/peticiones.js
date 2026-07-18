import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  where,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { mostrarToast } from "./toast.js";
import { escapeHtml, telefonoWhatsApp } from "./util.js";

const col = collection(db, "peticiones");
let peticionesCache = [];

function mapDoc(d) {
  return { id: d.id, ...d.data() };
}

export function listenPeticiones(callback) {
  const q = query(col, orderBy("creadoEn", "desc"));
  return onSnapshot(q, (snap) => {
    peticionesCache = snap.docs.map(mapDoc);
    callback(peticionesCache);
  });
}

export async function crearPeticion(datos) {
  return addDoc(col, {
    texto: datos.texto || "",
    deQuien: datos.deQuien || "",
    telefono: datos.telefono || "",
    iglesia: datos.iglesia || "",
    estado: "activa",
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
}

export async function alternarEstadoPeticion(peticion) {
  const nuevoEstado = peticion.estado === "respondida" ? "activa" : "respondida";
  return updateDoc(doc(db, "peticiones", peticion.id), {
    estado: nuevoEstado,
    actualizadoEn: serverTimestamp(),
  });
}

export async function eliminarPeticion(id) {
  return deleteDoc(doc(db, "peticiones", id));
}

/** Peticiones ya respondidas, para el apartado de "Oraciones contestadas" en Mensual.
 * Un solo filtro de igualdad, así que no requiere ningún índice compuesto. */
export function listenPeticionesRespondidas(callback) {
  const q = query(col, where("estado", "==", "respondida"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapDoc)));
}

export function initPeticiones() {
  const listaEl = document.getElementById("lista-oracion");
  const form = document.getElementById("form-peticion");
  const tabs = document.querySelectorAll("#peticion-iglesia-tabs .church-tab");
  const iglesiaOtra = document.getElementById("peticion-iglesia-otra");
  let iglesiaSel = null;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      iglesiaSel = tab.dataset.value;
      iglesiaOtra.style.display = iglesiaSel === "Otra" ? "block" : "none";
      if (iglesiaSel !== "Otra") iglesiaOtra.value = "";
    });
  });

  listenPeticiones((peticiones) => {
    listaEl.innerHTML =
      peticiones.length === 0
        ? `<div class="empty-state"><div class="glyph">🙏</div>Aún no tienes peticiones registradas.</div>`
        : peticiones.map(itemHtml).join("");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const textoEl = document.getElementById("peticion-texto");
    const deQuienEl = document.getElementById("peticion-de-quien");
    const telefonoEl = document.getElementById("peticion-telefono");
    const texto = textoEl.value.trim();
    if (!texto) return;

    const iglesia = iglesiaSel === "Otra" ? iglesiaOtra.value.trim() : iglesiaSel || "";

    await crearPeticion({
      texto,
      deQuien: deQuienEl.value.trim(),
      telefono: telefonoEl.value.trim(),
      iglesia,
    });

    textoEl.value = "";
    deQuienEl.value = "";
    telefonoEl.value = "";
    tabs.forEach((t) => t.classList.remove("active"));
    iglesiaSel = null;
    iglesiaOtra.style.display = "none";
    iglesiaOtra.value = "";
    mostrarToast("Petición agregada.");
  });

  listaEl.addEventListener("click", async (e) => {
    const li = e.target.closest("[data-id]");
    const btn = e.target.closest("[data-action]");
    if (!li || !btn) return;
    const peticion = peticionesCache.find((p) => p.id === li.dataset.id);
    if (!peticion) return;

    if (btn.dataset.action === "toggle") {
      await alternarEstadoPeticion(peticion);
    } else if (btn.dataset.action === "eliminar") {
      if (confirm("¿Eliminar esta petición?")) await eliminarPeticion(peticion.id);
    }
  });
}

function itemHtml(p) {
  const respondida = p.estado === "respondida";
  const numeroWa = telefonoWhatsApp(p.telefono);
  const numeroTel = (p.telefono || "").replace(/\D/g, "");
  const mensaje = `Hola ${p.deQuien || ""}, quería decirte que he estado orando por tu petición${p.texto ? `: "${p.texto}"` : ""}. Dios te bendiga.`;
  const metaPartes = [p.deQuien || "Sin nombre"];
  if (p.iglesia) metaPartes.push(p.iglesia);

  return `
    <li class="visit-item" data-id="${p.id}" style="${respondida ? "opacity:.6;" : ""}">
      <div class="info">
        <div class="name" style="${respondida ? "text-decoration:line-through;" : ""}">${escapeHtml(p.texto)}</div>
        <div class="meta">${escapeHtml(metaPartes.join(" · "))}</div>
      </div>
      <span class="badge badge-${respondida ? "completada" : "pendiente"}">${respondida ? "Respondida" : "Activa"}</span>
      <div class="actions">
        ${numeroTel ? `<a class="btn btn-outline btn-llamar" href="tel:${numeroTel}">Llamar</a>` : ""}
        ${numeroWa ? `<a class="btn btn-whatsapp" href="https://wa.me/${numeroWa}?text=${encodeURIComponent(mensaje)}" target="_blank" rel="noopener">WhatsApp</a>` : ""}
        <button class="icon-btn" data-action="toggle" title="${respondida ? "Reabrir" : "Marcar respondida"}">${respondida ? "↺" : "✓"}</button>
        <button class="icon-btn" data-action="eliminar" title="Eliminar">🗑</button>
      </div>
    </li>
  `;
}
