import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { IGLESIAS, listenVisitasDesde } from "./visitas.js";
import { cerrarModal, abrirDetalleVisita } from "./modal.js";
import { listenTemasJunta, abrirFormularioTema } from "./junta.js";
import { mostrarToast } from "./toast.js";
import { escapeHtml, enlaceGoogleCalendar, descargarICS } from "./util.js";

export const CATEGORIAS_EVENTO = ["Culto especial", "Bautismo", "Reunión de junta", "Actividad juvenil", "Campamento", "Otro"];
export const LUGARES_EVENTO = [...IGLESIAS, "General"];

const col = collection(db, "eventos");
let eventosCache = [];
let visitasCache = [];
let temasCache = [];
let itemsCombinados = [];

function mapDoc(d) {
  return { id: d.id, ...d.data() };
}

/** Eventos de hoy en adelante, para el resumen de "Hoy". */
export function listenEventosProximos(callback) {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);
  const q = query(col, where("fecha", ">=", Timestamp.fromDate(inicioHoy)), orderBy("fecha", "asc"));
  return onSnapshot(q, (snap) => callback(snap.docs.map(mapDoc)));
}

export async function crearEvento(datos) {
  return addDoc(col, {
    titulo: datos.titulo,
    fecha: Timestamp.fromDate(datos.fecha),
    lugar: datos.lugar || "General",
    categoria: datos.categoria || "Otro",
    notas: datos.notas || "",
    realizado: false,
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  });
}

export async function actualizarEvento(id, datos) {
  return updateDoc(doc(db, "eventos", id), { ...datos, actualizadoEn: serverTimestamp() });
}

export async function eliminarEvento(id) {
  return deleteDoc(doc(db, "eventos", id));
}

function formatearFechaHora(fecha) {
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  const fechaTxt = d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
  const horaTxt = d.toLocaleTimeString("es-DO", { hour: "numeric", minute: "2-digit" });
  return `${fechaTxt} · ${horaTxt}`;
}

function toDateInputValue(fecha) {
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toTimeInputValue(fecha) {
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function initCalendario() {
  const listaEl = document.getElementById("lista-eventos");
  document.getElementById("btn-nuevo-evento").addEventListener("click", () => abrirFormularioEvento());

  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  listenEventosProximos((eventos) => {
    eventosCache = eventos;
    renderLista(listaEl);
  });
  listenVisitasDesde(inicioHoy, (visitas) => {
    visitasCache = visitas;
    renderLista(listaEl);
  });
  listenTemasJunta((temas) => {
    temasCache = temas.filter((t) => t.fechaLimite && t.estado !== "resuelto");
    renderLista(listaEl);
  });

  listaEl.addEventListener("click", (e) => {
    const li = e.target.closest("[data-origen]");
    if (!li) return;
    const item = itemsCombinados.find((x) => x.origen === li.dataset.origen && x.id === li.dataset.id);
    if (!item) return;

    const accionEl = e.target.closest("[data-action]");
    if (accionEl?.dataset.action === "ics") {
      descargarICS({ titulo: item.titulo, inicio: item.fechaInicio, fin: item.fechaFin, detalles: item.etiqueta, ubicacion: item.lugar || "" });
      return;
    }
    if (accionEl?.dataset.action === "gcal") return; // deja que el enlace abra Google Calendar normalmente
    if (accionEl?.dataset.action === "realizado") {
      actualizarEvento(item.raw.id, { realizado: !item.raw.realizado });
      return;
    }

    abrirEditor(item);
  });
}

function normalizarEvento(ev) {
  const inicio = ev.fecha?.toDate ? ev.fecha.toDate() : new Date(ev.fecha);
  return {
    origen: "evento",
    id: ev.id,
    fechaInicio: inicio,
    fechaFin: new Date(inicio.getTime() + 60 * 60000),
    titulo: ev.titulo,
    etiqueta: ev.categoria,
    lugar: ev.lugar,
    realizado: ev.realizado || false,
    raw: ev,
  };
}

function normalizarVisita(v) {
  const inicio = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
  return {
    origen: "visita",
    id: v.id,
    fechaInicio: inicio,
    fechaFin: new Date(inicio.getTime() + 30 * 60000),
    titulo: `Visita: ${v.feligres?.nombre || "(sin nombre)"}`,
    etiqueta: "Visita pastoral",
    lugar: v.iglesia,
    raw: v,
  };
}

function normalizarTema(t) {
  const base = t.fechaLimite?.toDate ? t.fechaLimite.toDate() : new Date(t.fechaLimite);
  const inicio = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0);
  return {
    origen: "junta",
    id: t.id,
    fechaInicio: inicio,
    fechaFin: new Date(inicio.getTime() + 30 * 60000),
    titulo: `Junta: ${t.titulo}`,
    etiqueta: "Fecha límite de tema de junta",
    lugar: t.iglesia,
    raw: t,
  };
}

function abrirEditor(item) {
  if (item.origen === "evento") abrirFormularioEvento(item.raw);
  else if (item.origen === "visita") abrirDetalleVisita(item.raw);
  else if (item.origen === "junta") abrirFormularioTema(item.raw);
}

function renderLista(listaEl) {
  itemsCombinados = [
    ...eventosCache.map(normalizarEvento),
    ...visitasCache.map(normalizarVisita),
    ...temasCache.map(normalizarTema),
  ].sort((a, b) => a.fechaInicio - b.fechaInicio);

  listaEl.innerHTML =
    itemsCombinados.length === 0
      ? `<div class="empty-state"><div class="glyph">🗓️</div>Aún no tienes nada próximo. Comienza con "Nuevo evento".</div>`
      : itemsCombinados.map(itemHtml).join("");
}

function itemHtml(item) {
  const pasado = item.fechaInicio < new Date();
  const esEvento = item.origen === "evento";
  const atenuado = pasado || item.realizado;
  const enlaceGcal = enlaceGoogleCalendar({
    titulo: item.titulo,
    inicio: item.fechaInicio,
    fin: item.fechaFin,
    detalles: item.etiqueta,
    ubicacion: item.lugar || "",
  });
  return `
    <li class="visit-item" data-origen="${item.origen}" data-id="${item.id}"${atenuado ? ' style="opacity:.6;"' : ""}>
      <div class="info">
        <div class="name">${escapeHtml(item.titulo)}</div>
        <div class="meta">${escapeHtml(item.etiqueta)}${item.lugar ? " · " + escapeHtml(item.lugar) : ""}</div>
      </div>
      <span class="time-badge">${formatearFechaHora(item.fechaInicio)}</span>
      <div class="actions">
        <a class="icon-btn" data-action="gcal" href="${enlaceGcal}" target="_blank" rel="noopener" title="Agregar a Google Calendar">📅</a>
        <button class="icon-btn" data-action="ics" type="button" title="Descargar .ics (Apple/Outlook)">⬇️</button>
        ${esEvento ? `<button class="icon-btn" data-action="realizado" type="button" title="${item.realizado ? "Marcar pendiente" : "Marcar como realizado"}">${item.realizado ? "↺" : "✓"}</button>` : ""}
      </div>
      ${item.realizado ? `<span class="badge badge-completada">Realizado</span>` : pasado ? `<span class="badge badge-reprogramada">Pasado</span>` : ""}
    </li>
  `;
}

function abrirFormularioEvento(evento = null) {
  document.getElementById("modal-titulo").textContent = evento ? "Editar evento" : "Nuevo evento";
  document.getElementById("modal-body").innerHTML = `
    <div class="form-grid">
      <div class="form-field full">
        <label>Título</label>
        <input type="text" id="ev-titulo" value="${escapeHtml(evento?.titulo || "")}">
      </div>
      <div class="form-field">
        <label>Fecha</label>
        <input type="date" id="ev-fecha" value="${evento ? toDateInputValue(evento.fecha) : ""}">
      </div>
      <div class="form-field">
        <label>Hora</label>
        <input type="time" id="ev-hora" value="${evento ? toTimeInputValue(evento.fecha) : "09:00"}">
      </div>
      <div class="form-field full">
        <label>Lugar</label>
        <div class="church-tabs" id="ev-lugar-tabs">
          ${LUGARES_EVENTO.map(
            (l) => `<div class="church-tab${(evento?.lugar || "General") === l ? " active" : ""}" data-value="${l}">${l}</div>`
          ).join("")}
        </div>
      </div>
      <div class="form-field full">
        <label>Categoría</label>
        <select id="ev-categoria">
          ${CATEGORIAS_EVENTO.map((c) => `<option ${evento?.categoria === c ? "selected" : ""}>${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-field full">
        <label>Notas</label>
        <textarea id="ev-notas">${escapeHtml(evento?.notas || "")}</textarea>
      </div>
    </div>
    <div class="form-actions" style="justify-content:space-between;">
      ${evento ? `<button type="button" class="btn btn-outline" id="ev-eliminar">Eliminar</button>` : "<span></span>"}
      <button type="button" class="btn btn-solid" id="ev-guardar">${evento ? "Guardar cambios" : "Agregar evento"}</button>
    </div>
  `;

  let lugarSel = evento?.lugar || "General";
  document.querySelectorAll("#ev-lugar-tabs .church-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("#ev-lugar-tabs .church-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      lugarSel = tab.dataset.value;
    });
  });

  document.getElementById("ev-guardar").addEventListener("click", async () => {
    const titulo = document.getElementById("ev-titulo").value.trim();
    const fechaVal = document.getElementById("ev-fecha").value;
    const horaVal = document.getElementById("ev-hora").value || "09:00";
    if (!titulo) {
      mostrarToast("Escribe el título del evento.");
      return;
    }
    if (!fechaVal) {
      mostrarToast("Selecciona la fecha.");
      return;
    }
    const [y, m, d] = fechaVal.split("-").map(Number);
    const [hh, mm] = horaVal.split(":").map(Number);
    const fecha = new Date(y, m - 1, d, hh, mm);
    const categoria = document.getElementById("ev-categoria").value;
    const notas = document.getElementById("ev-notas").value.trim();

    if (evento) {
      await actualizarEvento(evento.id, { titulo, fecha: Timestamp.fromDate(fecha), lugar: lugarSel, categoria, notas });
    } else {
      await crearEvento({ titulo, fecha, lugar: lugarSel, categoria, notas });
    }
    mostrarToast(evento ? "Evento actualizado." : "Evento agregado al calendario.");
    cerrarModal();
  });

  document.getElementById("ev-eliminar")?.addEventListener("click", async () => {
    if (!confirm(`¿Eliminar "${evento.titulo}"?`)) return;
    await eliminarEvento(evento.id);
    mostrarToast("Evento eliminado.");
    cerrarModal();
  });

  document.getElementById("modal-backdrop").classList.add("open");
}
