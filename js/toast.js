let timer;

export function mostrarToast(mensaje) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = mensaje;
  el.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("show"), 3200);
}
