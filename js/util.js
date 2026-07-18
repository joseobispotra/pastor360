export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

export function saludoSegunHora(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function fechaLarga(date = new Date()) {
  const texto = date.toLocaleDateString("es-DO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function nombreMes(year, monthIndex) {
  const texto = new Date(year, monthIndex, 1).toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Normaliza un teléfono dominicano a formato internacional para wa.me
 * (antepone "1" si son 10 dígitos). Devuelve null si no hay número. */
export function telefonoWhatsApp(telefono) {
  const digitos = (telefono || "").replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.length === 10 ? `1${digitos}` : digitos;
}

function formatoFechaICS(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/** URL que abre Google Calendar con el evento pre-rellenado, listo para guardar. */
export function enlaceGoogleCalendar({ titulo, inicio, fin, detalles = "", ubicacion = "" }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: `${formatoFechaICS(inicio)}/${formatoFechaICS(fin)}`,
    details: detalles,
    location: ubicacion,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Genera y descarga un archivo .ics de un solo evento (Apple Calendar, Outlook, etc.). */
export function descargarICS({ titulo, inicio, fin, detalles = "", ubicacion = "" }) {
  const escapar = (t) =>
    String(t || "")
      .replace(/[\\;,]/g, (c) => "\\" + c)
      .replace(/\n/g, "\\n");

  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pastor360//ES",
    "BEGIN:VEVENT",
    `UID:${inicio.getTime()}-${Math.random().toString(36).slice(2)}@pastor360`,
    `DTSTAMP:${formatoFechaICS(new Date())}Z`,
    `DTSTART:${formatoFechaICS(inicio)}`,
    `DTEND:${formatoFechaICS(fin)}`,
    `SUMMARY:${escapar(titulo)}`,
    detalles ? `DESCRIPTION:${escapar(detalles)}` : "",
    ubicacion ? `LOCATION:${escapar(ubicacion)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  const blob = new Blob([lineas.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${titulo.replace(/[^\w\d]+/g, "-").slice(0, 60)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
