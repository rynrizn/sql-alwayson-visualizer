// Gestiona el modal de alta sin enviar datos mientras no exista una ruta aprobada.
document.addEventListener('DOMContentLoaded', () => {
  const modalUsuario = document.getElementById('user-modal');
  const modalQr = document.getElementById('qr-modal');
  const formularioUsuario = document.getElementById('form-new-user');
  const retroalimentacion = document.getElementById('new-user-feedback');

  document.getElementById('btn-add-user').addEventListener('click', () => {
    retroalimentacion.textContent = '';
    formularioUsuario.reset();
    modalUsuario.showModal();
    document.getElementById('new-user-name').focus();
  });

  // El visor QR ocupa toda la pantalla y se limita a mostrar el recurso reservado.
  document.getElementById('btn-open-qr').addEventListener('click', () => modalQr.showModal());

  // Los botones comparten el atributo para evitar duplicar manejadores de cierre.
  document.querySelectorAll('[data-close-modal]').forEach((boton) => {
    boton.addEventListener('click', () => document.getElementById(boton.dataset.closeModal).close());
  });

  formularioUsuario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (!formularioUsuario.reportValidity()) return;
    retroalimentacion.textContent = 'Datos preparados. La integración de registro todavía no está habilitada.';
  });

  // Permite cerrar al hacer clic fuera de la tarjeta, además de la tecla Escape nativa.
  modalUsuario.addEventListener('click', (evento) => {
    if (evento.target === modalUsuario) modalUsuario.close();
  });
  modalQr.addEventListener('click', (evento) => {
    if (evento.target === modalQr) modalQr.close();
  });
});
