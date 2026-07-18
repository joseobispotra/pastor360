import {
  listenVisitasHoy,
  listenVisitasRango,
  rangoMes,
  marcarCompletada,
  formatearHora,
  colorClaseIglesia,
} from "./visitas.js";
import { abrirDetalleVisita } from "./modal.js";
import { mostrarToast } from "./toast.js";
import { escapeHtml, saludoSegunHora, fechaLarga } from "./util.js";
import { notificarVisitasHoy } from "./notificaciones.js";

let visitasHoyCache = [];

export function initDashboard() {
  document.getElementById("saludo-eyebrow").textContent = saludoSegunHora();
  document.getElementById("fecha-hoy").textContent = fechaLarga();

  const listaEl = document.getElementById("lista-hoy");
  const resumenEl = document.getElementById("resumen-hoy-line");

  listenVisitasHoy((visitas) => {
    visitasHoyCache = visitas;
    resumenEl.textContent =
      visitas.length === 0
        ? "No tienes visitas agendadas para hoy. Buen momento para agendar una."
        : `Tienes ${visitas.length} visita${visitas.length === 1 ? "" : "s"} programada${visitas.length === 1 ? "" : "s"} para hoy.`;

    if (visitas.length === 0) {
      listaEl.innerHTML = `<div class="empty-state"><div class="glyph">🕊️</div>Sin visitas para hoy.</div>`;
    } else {
      listaEl.innerHTML = visitas.map(itemHtml).join("");
    }

    notificarVisitasHoy(visitas);
  });

  listaEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const li = e.target.closest(".visit-item");
    const visita = visitasHoyCache.find((v) => v.id === li.dataset.id);
    if (!visita) return;

    if (btn.dataset.action === "ver") {
      abrirDetalleVisita(visita);
    } else if (btn.dataset.action === "completar") {
      if (confirm(`¿Marcar la visita a ${visita.feligres?.nombre || "este feligrés"} como completada?`)) {
        marcarCompletada(visita, {}).then(() => mostrarToast("Visita marcada como completada."));
      }
    }
  });

  const hoy = new Date();
  const { inicio, fin } = rangoMes(hoy.getFullYear(), hoy.getMonth());
  listenVisitasRango(inicio, fin, (visitasMes) => {
    const completadas = visitasMes.filter((v) => v.estado === "completada").length;
    const pendientes = visitasMes.filter((v) => v.estado !== "completada").length;
    document.getElementById("stat-row").innerHTML = `
      <div class="stat-pill"><div class="num">${visitasMes.length}</div><div class="label">Visitas este mes</div></div>
      <div class="stat-pill"><div class="num">${completadas}</div><div class="label">Completadas</div></div>
      <div class="stat-pill"><div class="num">${pendientes}</div><div class="label">Pendientes</div></div>
    `;
  });
}

function itemHtml(v) {
  return `
    <li class="visit-item" data-id="${v.id}">
      <span class="church-dot ${colorClaseIglesia(v.iglesia)}"></span>
      <div class="info">
        <div class="name">${escapeHtml(v.feligres?.nombre || "(sin nombre)")}</div>
        <div class="meta">${escapeHtml(v.iglesia)} · ${escapeHtml(v.motivo || "")}</div>
      </div>
      <span class="time-badge">${formatearHora(v.fecha)}</span>
      <div class="actions">
        <button class="icon-btn" data-action="ver" title="Ver detalle">👁</button>
        ${v.estado !== "completada" ? `<button class="icon-btn" data-action="completar" title="Marcar completada">✓</button>` : ""}
      </div>
    </li>
  `;
}
