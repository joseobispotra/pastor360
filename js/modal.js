import {
  actualizarVisita,
  marcarCompletada,
  posponerVisita,
  eliminarVisita,
  formatearFecha,
  formatearHora,
} from "./visitas.js";
import { mostrarToast } from "./toast.js";

const backdrop = document.getElementById("modal-backdrop");
const tituloEl = document.getElementById("modal-titulo");
const bodyEl = document.getElementById("modal-body");
const closeBtn = document.getElementById("modal-close");

closeBtn?.addEventListener("click", cerrarModal);
backdrop?.addEventListener("click", (e) => {
  if (e.target === backdrop) cerrarModal();
});

export function cerrarModal() {
  backdrop.classList.remove("open");
}

export function abrirDetalleVisita(visita) {
  tituloEl.textContent = visita.feligres?.nombre || "Visita";
  bodyEl.innerHTML = plantilla(visita);
  backdrop.classList.add("open");
  wireEvents(visita);
}

function etiquetaEstado(estado) {
  if (estado === "completada") return "Completada";
  if (estado === "reprogramada") return "Reprogramada";
  return "Pendiente";
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function sumarDias(fecha, dias) {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
}

function toDateInputValue(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plantilla(v) {
  const fechaVisita = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
  const seguimientoFecha = v.seguimiento?.fecha ? formatearFecha(v.seguimiento.fecha) : "sin fecha";

  return `
    <div class="form-grid">
      <div class="form-field full">
        <label>Iglesia y fecha</label>
        <div>
          <span class="badge badge-${v.estado}">${etiquetaEstado(v.estado)}</span>
          &nbsp; ${escapeHtml(v.iglesia)} — ${formatearFecha(v.fecha)} · ${formatearHora(v.fecha)}
        </div>
      </div>
      <div class="form-field">
        <label for="m-telefono">Teléfono</label>
        <input type="tel" id="m-telefono" value="${escapeHtml(v.feligres?.telefono || "")}">
      </div>
      <div class="form-field">
        <label for="m-direccion">Dirección</label>
        <input type="text" id="m-direccion" value="${escapeHtml(v.feligres?.direccion || "")}">
      </div>
      <div class="form-field full">
        <label for="m-motivo">Motivo</label>
        <input type="text" id="m-motivo" value="${escapeHtml(v.motivo || "")}">
      </div>
      <div class="form-field full">
        <label for="m-notas">Notas</label>
        <textarea id="m-notas">${escapeHtml(v.notas || "")}</textarea>
      </div>
      ${v.seguimiento?.requiere ? `
      <div class="form-field full">
        <label for="m-notas-seguimiento">Seguimiento (${seguimientoFecha})</label>
        <textarea id="m-notas-seguimiento" placeholder="Notas de seguimiento...">${escapeHtml(v.seguimiento?.notas || "")}</textarea>
      </div>` : ""}
    </div>

    <div class="form-actions" style="justify-content:space-between;flex-wrap:wrap;">
      <button type="button" class="btn btn-outline" id="m-eliminar">Eliminar</button>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${v.estado !== "completada" ? `<button type="button" class="btn btn-outline" id="m-posponer">Posponer</button>` : ""}
        <button type="button" class="btn btn-outline" id="m-guardar">Guardar</button>
        ${v.estado !== "completada" ? `<button type="button" class="btn btn-solid" id="m-completar">Marcar completada</button>` : ""}
      </div>
    </div>

    <div id="m-posponer-panel" style="display:none;margin-top:14px;border-top:1px solid #ece5d4;padding-top:14px;">
      <div class="form-field">
        <label for="m-nueva-fecha">Nueva fecha</label>
        <input type="date" id="m-nueva-fecha" value="${toDateInputValue(sumarDias(fechaVisita, 7))}">
      </div>
      <div class="form-actions"><button type="button" class="btn btn-solid" id="m-confirmar-posponer">Confirmar</button></div>
    </div>

    <div id="m-completar-panel" style="display:none;margin-top:14px;border-top:1px solid #ece5d4;padding-top:14px;">
      <div class="form-field">
        <label for="m-proxima-fecha">Sugerencia de próxima visita</label>
        <input type="date" id="m-proxima-fecha" value="${toDateInputValue(sumarDias(fechaVisita, 30))}">
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-outline" id="m-completar-sin-proxima">Completar sin próxima visita</button>
        <button type="button" class="btn btn-solid" id="m-confirmar-completar">Agendar próxima y completar</button>
      </div>
    </div>
  `;
}

function wireEvents(v) {
  document.getElementById("m-guardar")?.addEventListener("click", async () => {
    const datos = {
      "feligres.telefono": document.getElementById("m-telefono").value.trim(),
      "feligres.direccion": document.getElementById("m-direccion").value.trim(),
      motivo: document.getElementById("m-motivo").value.trim(),
      notas: document.getElementById("m-notas").value.trim(),
    };
    const notasSeguimiento = document.getElementById("m-notas-seguimiento");
    if (notasSeguimiento) datos["seguimiento.notas"] = notasSeguimiento.value.trim();
    await actualizarVisita(v.id, datos);
    mostrarToast("Cambios guardados.");
    cerrarModal();
  });

  document.getElementById("m-eliminar")?.addEventListener("click", async () => {
    if (!confirm("¿Eliminar esta visita? Esta acción no se puede deshacer.")) return;
    await eliminarVisita(v.id);
    mostrarToast("Visita eliminada.");
    cerrarModal();
  });

  document.getElementById("m-posponer")?.addEventListener("click", () => {
    togglePanel("m-posponer-panel");
  });
  document.getElementById("m-confirmar-posponer")?.addEventListener("click", async () => {
    const val = document.getElementById("m-nueva-fecha").value;
    if (!val) return;
    const [y, m, d] = val.split("-").map(Number);
    const original = fechaVisitaOriginal(v);
    const nuevaFecha = new Date(y, m - 1, d, original.getHours(), original.getMinutes());
    await posponerVisita(v.id, nuevaFecha);
    mostrarToast("Visita reprogramada.");
    cerrarModal();
  });

  document.getElementById("m-completar")?.addEventListener("click", () => {
    togglePanel("m-completar-panel");
  });
  document.getElementById("m-completar-sin-proxima")?.addEventListener("click", async () => {
    const notasSeguimiento = document.getElementById("m-notas-seguimiento")?.value.trim() || "";
    await marcarCompletada(v, { notasSeguimiento });
    mostrarToast("Visita marcada como completada.");
    cerrarModal();
  });
  document.getElementById("m-confirmar-completar")?.addEventListener("click", async () => {
    const val = document.getElementById("m-proxima-fecha").value;
    const notasSeguimiento = document.getElementById("m-notas-seguimiento")?.value.trim() || "";
    let proximaFecha = null;
    if (val) {
      const [y, m, d] = val.split("-").map(Number);
      proximaFecha = new Date(y, m - 1, d, 9, 0);
    }
    await marcarCompletada(v, { notasSeguimiento, proximaFecha });
    mostrarToast(proximaFecha ? "Completada y próxima visita agendada." : "Visita marcada como completada.");
    cerrarModal();
  });
}

function fechaVisitaOriginal(v) {
  const d = v.fecha?.toDate ? v.fecha.toDate() : new Date(v.fecha);
  return d;
}

function togglePanel(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}
