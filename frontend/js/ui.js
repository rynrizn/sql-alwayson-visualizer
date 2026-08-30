// Controles de apariencia, navegación móvil y distribución de paneles.
document.addEventListener('DOMContentLoaded', () => {
  const layout = document.querySelector('.main-layout');
  const backdrop = document.getElementById('mobile-backdrop');
  const botonTema = document.getElementById('btn-toggle-theme');
  const botonPerfiles = document.getElementById('btn-toggle-sidebar');
  const botonMonitor = document.getElementById('btn-toggle-monitor');
  const botonMobileSidebar = document.getElementById('btn-mobile-sidebar');
  const botonMobileMonitor = document.getElementById('btn-mobile-monitor');

  // Inicializar tema preferido
  aplicarTema(localStorage.getItem('banco-ha-theme') || 'light');

  botonTema?.addEventListener('click', () => {
    aplicarTema(document.body.classList.contains('theme-dark') ? 'light' : 'dark');
  });

  /** Cierra cualquier panel lateral abierto en vista móvil */
  function cerrarDrawersMoviles() {
    layout.classList.remove('mobile-sidebar-open', 'mobile-monitor-open');
    backdrop?.classList.remove('active');
  }

  /** Alterna la barra lateral de perfiles según el ancho de pantalla */
  function alternarPerfiles() {
    if (window.innerWidth <= 760) {
      const estaAbierto = layout.classList.contains('mobile-sidebar-open');
      cerrarDrawersMoviles();
      if (!estaAbierto) {
        layout.classList.add('mobile-sidebar-open');
        backdrop?.classList.add('active');
      }
    } else {
      const contraido = layout.classList.toggle('sidebar-collapsed');
      botonPerfiles?.setAttribute('aria-pressed', String(contraido));
      botonPerfiles?.setAttribute('aria-label', contraido ? 'Expandir perfiles' : 'Contraer perfiles');
    }
  }

  /** Alterna el panel de monitoreo de Always On según el ancho de pantalla */
  function alternarMonitor() {
    if (window.innerWidth <= 760) {
      const estaAbierto = layout.classList.contains('mobile-monitor-open');
      cerrarDrawersMoviles();
      if (!estaAbierto) {
        layout.classList.add('mobile-monitor-open');
        backdrop?.classList.add('active');
      }
    } else {
      const expandido = layout.classList.toggle('monitor-expanded');
      // Al expandir el monitor en escritorio, contrae los perfiles para maximizar espacio
      layout.classList.toggle('sidebar-collapsed', expandido);
      botonMonitor?.setAttribute('aria-pressed', String(expandido));
      botonMonitor?.setAttribute('aria-label', expandido ? 'Reducir monitoreo' : 'Expandir monitoreo');
    }
  }

  // Eventos para botones de escritorio y móviles
  botonPerfiles?.addEventListener('click', alternarPerfiles);
  botonMobileSidebar?.addEventListener('click', alternarPerfiles);

  botonMonitor?.addEventListener('click', alternarMonitor);
  botonMobileMonitor?.addEventListener('click', alternarMonitor);

  // Cerrar al tocar el telón de fondo semitransparente
  backdrop?.addEventListener('click', cerrarDrawersMoviles);

  // Al cambiar el tamaño de ventana de móvil a escritorio, limpiar estados
  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) {
      cerrarDrawersMoviles();
    }
  });
});

/** Aplica y conserva el tema seleccionado en localStorage */
function aplicarTema(tema) {
  const oscuro = tema === 'dark';
  document.body.classList.toggle('theme-dark', oscuro);
  const botonTema = document.getElementById('btn-toggle-theme');
  if (botonTema) {
    botonTema.setAttribute('aria-label', oscuro ? 'Activar modo claro' : 'Activar modo oscuro');
    botonTema.title = oscuro ? 'Activar modo claro' : 'Activar modo oscuro';
  }
  localStorage.setItem('banco-ha-theme', oscuro ? 'dark' : 'light');
}
