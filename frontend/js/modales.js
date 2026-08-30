// Gestiona modales: alta de usuario preparada y visor QR con enlace directo a la web.
document.addEventListener('DOMContentLoaded', () => {
  const modalUsuario = document.getElementById('user-modal');
  const modalQr = document.getElementById('qr-modal');
  const formularioUsuario = document.getElementById('form-new-user');
  const retroalimentacion = document.getElementById('new-user-feedback');

  const inputLink = document.getElementById('qr-link-input');
  const openLink = document.getElementById('qr-open-link');
  const btnCopy = document.getElementById('btn-copy-qr-link');
  const copyText = document.getElementById('copy-qr-text');

  /** Actualiza dinámicamente los campos de enlace con la URL actual donde corre el proyecto */
  function actualizarEnlaceWeb() {
    const url = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : window.location.href;
    if (inputLink) inputLink.value = url;
    if (openLink) openLink.href = url;
  }

  actualizarEnlaceWeb();

  // Abrir modal de preparación de usuario
  document.getElementById('btn-add-user')?.addEventListener('click', () => {
    if (retroalimentacion) retroalimentacion.textContent = '';
    formularioUsuario?.reset();
    modalUsuario?.showModal();
    document.getElementById('new-user-name')?.focus();
  });

  // Abrir modal QR y sincronizar enlace web
  document.getElementById('btn-open-qr')?.addEventListener('click', () => {
    actualizarEnlaceWeb();
    modalQr?.showModal();
  });

  // Botón para copiar enlace al portapapeles
  btnCopy?.addEventListener('click', async () => {
    const enlace = inputLink?.value || window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(enlace);
      } else {
        inputLink?.select();
        document.execCommand('copy');
      }
      if (copyText) {
        copyText.textContent = '¡Copiado!';
        setTimeout(() => { copyText.textContent = 'Copiar'; }, 2000);
      }
    } catch (e) {
      console.warn('Error al copiar:', e);
      inputLink?.select();
    }
  });

  // Manejadores genéricos de cierre para todos los diálogos
  document.querySelectorAll('[data-close-modal]').forEach((boton) => {
    boton.addEventListener('click', () => {
      const modalId = boton.dataset.closeModal;
      document.getElementById(modalId)?.close();
    });
  });

  // Envío del formulario de usuario: modo visual protegido
  formularioUsuario?.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!formularioUsuario.reportValidity()) return;
    if (retroalimentacion) {
      retroalimentacion.textContent = 'Datos preparados. La integración de registro todavía no está habilitada.';
    }
  });

  // Permitir cerrar haciendo clic en el fondo oscuro
  modalUsuario?.addEventListener('click', (evento) => {
    if (evento.target === modalUsuario) modalUsuario.close();
  });
  modalQr?.addEventListener('click', (evento) => {
    if (evento.target === modalQr) modalQr.close();
  });
});
