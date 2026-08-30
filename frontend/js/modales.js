// Gestiona el modal de alta sin enviar datos mientras no exista una ruta aprobada.
document.addEventListener('DOMContentLoaded', () => {
  const modalUsuario = document.getElementById('user-modal');
  const formularioUsuario = document.getElementById('form-new-user');
  const retroalimentacion = document.getElementById('new-user-feedback');

  document.getElementById('btn-add-user').addEventListener('click', () => {
    retroalimentacion.textContent = '';
    formularioUsuario.reset();
    modalUsuario.showModal();
    document.getElementById('new-user-name').focus();
  });

  // Los botones comparten el atributo para evitar duplicar manejadores de cierre.
  document.querySelectorAll('[data-close-modal="user-modal"]').forEach((boton) => {
    boton.addEventListener('click', () => modalUsuario.close());
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
});
