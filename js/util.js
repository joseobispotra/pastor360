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
