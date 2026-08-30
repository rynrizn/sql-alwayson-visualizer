// Controles de apariencia y distribución. El modo claro se usa si no hay preferencia guardada.
document.addEventListener('DOMContentLoaded', () => {
  const cuerpo = document.body;
  const layout = document.querySelector('.main-layout');
  const botonTema = document.getElementById('btn-toggle-theme');
  const botonPerfiles = document.getElementById('btn-toggle-sidebar');
  const botonMonitor = document.getElementById('btn-toggle-monitor');

  aplicarTema(localStorage.getItem('banco-ha-theme') || 'light');
  // En móvil el chat es el contenido inicial; los laterales se abren bajo demanda.
  if (window.matchMedia('(max-width: 760px)').matches) {
    layout.classList.add('sidebar-collapsed');
  }

  botonTema.addEventListener('click', () => {
    aplicarTema(cuerpo.classList.contains('theme-dark') ? 'light' : 'dark');
  });

  botonPerfiles.addEventListener('click', () => {
    const contraido = layout.classList.toggle('sidebar-collapsed');
    botonPerfiles.setAttribute('aria-pressed', String(contraido));
    botonPerfiles.setAttribute('aria-label', contraido ? 'Expandir perfiles' : 'Contraer perfiles');
    botonPerfiles.textContent = contraido ? '›' : '‹';
  });

  botonMonitor.addEventListener('click', () => {
    const expandido = layout.classList.toggle('monitor-expanded');
    // Al ampliar el monitor se contrae automáticamente el panel de perfiles.
    layout.classList.toggle('sidebar-collapsed', expandido);
    botonMonitor.setAttribute('aria-pressed', String(expandido));
    botonMonitor.setAttribute('aria-label', expandido ? 'Reducir monitoreo' : 'Expandir monitoreo');
    botonMonitor.textContent = expandido ? '‹' : '›';
  });
});

/** Aplica y conserva la preferencia elegida para la próxima visita. */
function aplicarTema(tema) {
  const oscuro = tema === 'dark';
  document.body.classList.toggle('theme-dark', oscuro);
  document.getElementById('btn-toggle-theme').setAttribute('aria-label', oscuro ? 'Activar modo claro' : 'Activar modo oscuro');
  localStorage.setItem('banco-ha-theme', oscuro ? 'dark' : 'light');
}
