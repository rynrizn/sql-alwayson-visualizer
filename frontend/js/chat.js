// Estado central del perfil activo. La cuenta seleccionada siempre es el origen.
window.estadoBanco = {
  perfiles: [],
  cuentaActiva: null,
  nombreActivo: null
};

document.addEventListener('DOMContentLoaded', () => {
  inicializarPerfiles();
  document.getElementById('input-buscar-perfil').addEventListener('input', renderizarPerfiles);
});

/** Carga los perfiles reales expuestos por la vista de cuentas activas. */
async function inicializarPerfiles() {
  try {
    const respuesta = await fetch('/api/movimientos/cuentas');
    const resultado = await respuesta.json();
    if (!resultado.success) throw new Error(resultado.error);

    window.estadoBanco.perfiles = resultado.data;
    document.getElementById('total-clientes').textContent = resultado.data.length;
    renderizarPerfiles();

    if (resultado.data.length > 0) seleccionarPerfil(resultado.data[0].NumeroCuenta);
  } catch (error) {
    console.error('Error cargando perfiles:', error);
    document.getElementById('lista-clientes').innerHTML =
      '<li class="empty-state">No se pudieron cargar los perfiles.</li>';
  }
}

/** Dibuja la lista lateral y aplica el filtro de búsqueda sin volver a consultar SQL. */
function renderizarPerfiles() {
  const lista = document.getElementById('lista-clientes');
  const busqueda = document.getElementById('input-buscar-perfil').value.trim().toLowerCase();
  const perfiles = window.estadoBanco.perfiles.filter((perfil) => {
    const nombre = `${perfil.Nombre} ${perfil.Apellido}`.toLowerCase();
    return nombre.includes(busqueda) || perfil.NumeroCuenta.includes(busqueda);
  });

  lista.innerHTML = '';
  perfiles.forEach((perfil) => {
    const nombre = `${perfil.Nombre} ${perfil.Apellido}`;
    const item = document.createElement('li');
    item.className = `client-item ${perfil.NumeroCuenta === window.estadoBanco.cuentaActiva ? 'active' : ''}`;
    item.dataset.cuenta = perfil.NumeroCuenta;
    item.title = `${nombre} · ${perfil.NumeroCuenta}`;
    item.innerHTML = `
      <div class="avatar">${obtenerIniciales(perfil)}</div>
      <div class="client-info">
        <span class="client-name">${nombre}</span>
        <span class="account-number">Cta: ${perfil.NumeroCuenta}</span>
      </div>
      <span class="status-indicator" aria-label="Cuenta activa"></span>
    `;
    item.addEventListener('click', () => seleccionarPerfil(perfil.NumeroCuenta));
    lista.appendChild(item);
  });

  if (perfiles.length === 0) {
    lista.innerHTML = '<li class="empty-state">No hay perfiles que coincidan.</li>';
  }
}

/** Cambia de perfil, actualiza el formulario y carga solamente su historial. */
async function seleccionarPerfil(numeroCuenta) {
  const perfil = window.estadoBanco.perfiles.find((item) => item.NumeroCuenta === numeroCuenta);
  if (!perfil) return;

  window.estadoBanco.cuentaActiva = perfil.NumeroCuenta;
  window.estadoBanco.nombreActivo = `${perfil.Nombre} ${perfil.Apellido}`;
  document.getElementById('current-profile-avatar').textContent = obtenerIniciales(perfil);
  document.getElementById('current-profile-name').textContent = window.estadoBanco.nombreActivo;
  document.getElementById('current-profile-account').textContent = `Cuenta: ${perfil.NumeroCuenta} · ${perfil.TipoCuenta}`;
  document.getElementById('current-profile-balance').textContent = formatearMonto(perfil.Saldo);

  actualizarDestinatarios();
  activarFormulario(true);
  renderizarPerfiles();
  await cargarMovimientosPerfil(perfil.NumeroCuenta);
}

/** Llena el selector sin incluir la misma cuenta que está enviando dinero. */
function actualizarDestinatarios() {
  const selector = document.getElementById('input-destino');
  selector.innerHTML = '<option value="">Selecciona un destino</option>';
  window.estadoBanco.perfiles
    .filter((perfil) => perfil.NumeroCuenta !== window.estadoBanco.cuentaActiva)
    .forEach((perfil) => {
      const opcion = document.createElement('option');
      opcion.value = perfil.NumeroCuenta;
      opcion.textContent = `${perfil.Nombre} ${perfil.Apellido} · ${perfil.NumeroCuenta}`;
      selector.appendChild(opcion);
    });
}

/** Obtiene y presenta los movimientos donde el perfil es origen o destinatario. */
async function cargarMovimientosPerfil(numeroCuenta) {
  const contenedor = document.getElementById('chat-messages');
  contenedor.innerHTML = '<div class="system-message"><span>Cargando movimientos…</span></div>';
  try {
    const respuesta = await fetch(`/api/movimientos/cuenta/${encodeURIComponent(numeroCuenta)}`);
    const resultado = await respuesta.json();
    if (!resultado.success) throw new Error(resultado.error);

    contenedor.innerHTML = '';
    if (resultado.data.length === 0) {
      contenedor.innerHTML = '<div class="system-message"><span>Este perfil aún no tiene movimientos.</span></div>';
      return;
    }

    resultado.data.slice().reverse().forEach((movimiento) => agregarMovimientoPerfil(movimiento));
    contenedor.scrollTop = contenedor.scrollHeight;
  } catch (error) {
    console.error('Error cargando movimientos del perfil:', error);
    contenedor.innerHTML = '<div class="system-message"><span>No se pudo cargar el historial del perfil.</span></div>';
  }
}

/** Inserta una burbuja como envío o recepción según la cuenta activa. */
function agregarMovimientoPerfil(movimiento) {
  const esEnvio = movimiento.CuentaOrigen === window.estadoBanco.cuentaActiva ||
    movimiento.cuentaOrigen === window.estadoBanco.cuentaActiva;
  const origen = movimiento.CuentaOrigen || movimiento.cuentaOrigen;
  const destino = movimiento.CuentaDestino || movimiento.cuentaDestino;
  const monto = Number(movimiento.Monto || movimiento.monto);
  const fecha = movimiento.FechaTransaccion || movimiento.fecha;
  const burbuja = document.createElement('article');
  burbuja.className = `tx-bubble ${esEnvio ? 'tx-sent' : 'tx-received'}`;
  burbuja.innerHTML = `
    <div class="tx-bubble-title">
      <span>${esEnvio ? 'Envío' : 'Recepción'} ${esEnvio ? `a ${destino}` : `de ${origen}`}</span>
      <span class="tx-status-confirmed">✓ Confirmada</span>
    </div>
    <div class="tx-amount">${esEnvio ? '−' : '+'}${formatearMonto(monto)}</div>
    <div class="tx-meta">
      <span>${movimiento.Descripcion || movimiento.descripcion || 'Transferencia bancaria'}</span>
      <span>${fecha ? new Date(fecha).toLocaleString() : 'Ahora'}</span>
    </div>
  `;
  document.getElementById('chat-messages').appendChild(burbuja);
}

/** Habilita o bloquea los controles hasta que exista una cuenta emisora. */
function activarFormulario(activo) {
  ['input-destino', 'input-monto', 'input-descripcion', 'btn-enviar-dinero']
    .forEach((id) => { document.getElementById(id).disabled = !activo; });
}

function obtenerIniciales(perfil) {
  return `${perfil.Nombre?.[0] || ''}${perfil.Apellido?.[0] || ''}`.toUpperCase();
}

function formatearMonto(valor) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(valor));
}
