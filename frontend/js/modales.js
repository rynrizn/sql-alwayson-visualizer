// Gestiona modales: registro de nuevo usuario en SQL Server y visor QR con enlace directo.
document.addEventListener('DOMContentLoaded', () => {
  const modalUsuario = document.getElementById('user-modal');
  const modalQr = document.getElementById('qr-modal');
  const formularioUsuario = document.getElementById('form-new-user');
  const retroalimentacion = document.getElementById('new-user-feedback');
  const btnSaveUser = document.getElementById('btn-save-new-user');

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

  // Abrir modal de nuevo usuario
  document.getElementById('btn-add-user')?.addEventListener('click', () => {
    if (retroalimentacion) {
      retroalimentacion.textContent = '';
      retroalimentacion.style.color = '';
    }
    formularioUsuario?.reset();
    document.getElementById('new-user-balance').value = '1000';
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

  // Registro real del usuario y creación de su cuenta bancaria en SQL Server
  formularioUsuario?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!formularioUsuario.reportValidity()) return;

    const nombre = document.getElementById('new-user-name').value.trim();
    const apellido = document.getElementById('new-user-lastname').value.trim();
    const ci = document.getElementById('new-user-ci').value.trim();
    const saldo = parseFloat(document.getElementById('new-user-balance').value) || 0;

    if (!nombre || !apellido || !ci) {
      if (retroalimentacion) {
        retroalimentacion.textContent = 'Por favor completa todos los campos requeridos.';
        retroalimentacion.style.color = 'var(--accent)';
      }
      return;
    }

    try {
      if (btnSaveUser) {
        btnSaveUser.disabled = true;
        btnSaveUser.textContent = 'Guardando...';
      }
      if (retroalimentacion) {
        retroalimentacion.textContent = 'Registrando cliente en SQL Server...';
        retroalimentacion.style.color = 'var(--muted)';
      }

      const respuesta = await fetch('/api/movimientos/cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, apellido, ci, saldo })
      });

      const resultado = await respuesta.json();
      if (!resultado.success) {
        throw new Error(resultado.detalle || resultado.error || 'No se pudo crear el usuario.');
      }

      if (retroalimentacion) {
        retroalimentacion.textContent = '¡Usuario y cuenta creados exitosamente!';
        retroalimentacion.style.color = 'var(--green)';
      }

      formularioUsuario.reset();

      // Recargar lista de perfiles y seleccionar el recién creado
      if (typeof window.inicializarPerfiles === 'function') {
        await window.inicializarPerfiles();
      }

      const numeroCuentaNueva = resultado.data?.NumeroCuenta || resultado.data?.numeroCuenta;
      if (numeroCuentaNueva && typeof window.seleccionarPerfil === 'function') {
        window.seleccionarPerfil(numeroCuentaNueva);
      }

      setTimeout(() => {
        modalUsuario?.close();
      }, 1000);

    } catch (err) {
      console.error('Error creando usuario:', err);
      if (retroalimentacion) {
        retroalimentacion.textContent = `Error: ${err.message}`;
        retroalimentacion.style.color = 'var(--accent)';
      }
    } finally {
      if (btnSaveUser) {
        btnSaveUser.disabled = false;
        btnSaveUser.textContent = 'Guardar Usuario';
      }
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
