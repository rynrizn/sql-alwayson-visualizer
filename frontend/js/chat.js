// Estado global del cliente seleccionado
window.estadoChat = {
  cuentaOrigen: '1000000001', // Cuenta fija del usuario de la app (Carlos)
  cuentaDestino: '1000000002',
  nombreDestino: 'Maria Flores'
};

document.addEventListener('DOMContentLoaded', async () => {
  await cargarCuentasDesdeServidor();
});

// Consulta /api/movimientos/cuentas para listar los contactos reales
async function cargarCuentasDesdeServidor() {
  try {
    const res = await fetch('/api/movimientos/cuentas');
    const data = await res.json();
    
    if (data.success && data.data.length > 0) {
      const listaUl = document.getElementById('lista-clientes');
      listaUl.innerHTML = '';

      // Filtrar para no listarnos a nosotros mismos como destinatario
      const destinatarios = data.data.filter(c => c.NumeroCuenta !== '1000000001');

      destinatarios.forEach((cliente, index) => {
        const li = document.createElement('li');
        li.className = `client-item ${index === 0 ? 'active' : ''}`;
        li.dataset.cuenta = cliente.NumeroCuenta;
        li.dataset.nombre = `${cliente.Nombre} ${cliente.Apellido}`;

        const iniciales = `${cliente.Nombre[0]}${cliente.Apellido[0]}`;

        li.innerHTML = `
          <div class="avatar">${iniciales}</div>
          <div class="client-info">
            <span class="client-name">${cliente.Nombre} ${cliente.Apellido}</span>
            <span class="account-number">Cta: ${cliente.NumeroCuenta}</span>
          </div>
          <span class="status-indicator"></span>
        `;

        li.addEventListener('click', () => seleccionarContacto(cliente.NumeroCuenta, `${cliente.Nombre} ${cliente.Apellido}`, iniciales, li));
        listaUl.appendChild(li);
      });

      // Seleccionar el primer contacto por defecto
      if (destinatarios.length > 0) {
        seleccionarContacto(
          destinatarios[0].NumeroCuenta, 
          `${destinatarios[0].Nombre} ${destinatarios[0].Apellido}`, 
          `${destinatarios[0].Nombre[0]}${destinatarios[0].Apellido[0]}`,
          listaUl.firstChild
        );
      }
    }
  } catch (err) {
    console.error('Error cargando contactos:', err);
  }
}

function seleccionarContacto(cuenta, nombre, iniciales, elementoLi) {
  window.estadoChat.cuentaDestino = cuenta;
  window.estadoChat.nombreDestino = nombre;

  document.getElementById('current-recipient-name').innerText = nombre;
  document.getElementById('current-recipient-account').innerText = `Cuenta Destino: ${cuenta}`;
  document.getElementById('current-recipient-avatar').innerText = iniciales;

  // Actualizar clase activa en la lista
  document.querySelectorAll('.client-item').forEach(el => el.classList.remove('active'));
  if (elementoLi) elementoLi.classList.add('active');
}
