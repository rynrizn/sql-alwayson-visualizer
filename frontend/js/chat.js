// Estado central del perfil activo. La cuenta seleccionada siempre es el origen.
window.estadoBanco = {
  perfiles: [],
  cuentaActiva: null,
  nombreActivo: null
};

window.inicializarPerfiles = inicializarPerfiles;
window.seleccionarPerfil = seleccionarPerfil;

let cargandoPerfiles = false;

document.addEventListener('DOMContentLoaded', () => {
  inicializarPerfiles();
  document.getElementById('input-buscar-perfil')?.addEventListener('input', renderizarPerfiles);

  // Reintentar de forma automática al establecer conexión WebSocket o detectar servidor activo
  if (window.appSocket) {
    window.appSocket.on('connect', () => {
      if (window.estadoBanco.perfiles.length === 0) {
        console.log('📡 Socket.IO conectado: consultando perfiles...');
        inicializarPerfiles();
      }
    });

    window.appSocket.on('estado_servidor', (data) => {
      if (data && (data.online || data.success) && window.estadoBanco.perfiles.length === 0) {
        console.log('🟢 Servidor activo detectado: cargando perfiles...');
        inicializarPerfiles();
      }
    });

    // Actualizar dinámicamente saldo y chat si el perfil activo participa en una transferencia
    window.appSocket.on('nuevo_movimiento', (tx) => {
      manejarMovimientoEnVivo(tx);
    });
  }
});

/** Carga los perfiles reales expuestos por la vista o tablas de cuentas activas. */
async function inicializarPerfiles() {
  if (cargandoPerfiles) return;
  cargandoPerfiles = true;

  const lista = document.getElementById('lista-clientes');
  const contador = document.getElementById('total-clientes');

  if (window.estadoBanco.perfiles.length === 0 && lista) {
    lista.innerHTML = '<li class="empty-state">Consultando perfiles en SQL Server...</li>';
  }

  try {
    const respuesta = await fetch('/api/movimientos/cuentas?t=' + Date.now());
    const resultado = await respuesta.json();
    if (!resultado.success) {
      throw new Error(resultado.detalle || resultado.error || 'Respuesta no exitosa');
    }

    window.estadoBanco.perfiles = resultado.data || [];
    if (contador) contador.textContent = window.estadoBanco.perfiles.length;
    renderizarPerfiles();

    if (window.estadoBanco.perfiles.length > 0) {
      const existeActiva = window.estadoBanco.perfiles.some(
        (p) => (p.NumeroCuenta || p.numeroCuenta) === window.estadoBanco.cuentaActiva
      );
      if (!window.estadoBanco.cuentaActiva || !existeActiva) {
        const primerNumero = window.estadoBanco.perfiles[0].NumeroCuenta || window.estadoBanco.perfiles[0].numeroCuenta;
        seleccionarPerfil(primerNumero);
      }
    } else {
      if (lista) {
        lista.innerHTML = `
          <li class="empty-state">
            <p>No se encontraron cuentas activas en la base de datos.</p>
            <button type="button" class="btn-secondary" onclick="inicializarPerfiles()" style="margin-top: 8px; font-size: .75rem; padding: 6px 12px;">
              Reintentar
            </button>
          </li>
        `;
      }
    }
  } catch (error) {
    console.error('Error al cargar perfiles:', error);
    if (lista && window.estadoBanco.perfiles.length === 0) {
      lista.innerHTML = `
        <li class="empty-state">
          <p>No se pudieron cargar los perfiles.</p>
          <small style="display:block; margin: 4px 0 8px; color: var(--muted);">${error.message}</small>
          <button type="button" class="btn-secondary" onclick="inicializarPerfiles()" style="font-size: .75rem; padding: 6px 12px;">
            Reintentar
          </button>
        </li>
      `;
    }
  } finally {
    cargandoPerfiles = false;
  }
}

/** Dibuja la lista lateral y aplica el filtro de búsqueda sin volver a consultar SQL. */
function renderizarPerfiles() {
  const lista = document.getElementById('lista-clientes');
  if (!lista) return;

  const busqueda = (document.getElementById('input-buscar-perfil')?.value || '').trim().toLowerCase();
  const perfiles = window.estadoBanco.perfiles.filter((perfil) => {
    const nombre = `${perfil.Nombre || perfil.nombre || ''} ${perfil.Apellido || perfil.apellido || ''}`.toLowerCase();
    const cuenta = String(perfil.NumeroCuenta || perfil.numeroCuenta || '');
    return nombre.includes(busqueda) || cuenta.includes(busqueda);
  });

  lista.innerHTML = '';
  perfiles.forEach((perfil) => {
    const nombre = `${perfil.Nombre || perfil.nombre || ''} ${perfil.Apellido || perfil.apellido || ''}`.trim();
    const numeroCuenta = perfil.NumeroCuenta || perfil.numeroCuenta || '';
    const item = document.createElement('li');
    item.className = `client-item ${numeroCuenta === window.estadoBanco.cuentaActiva ? 'active' : ''}`;
    item.dataset.cuenta = numeroCuenta;
    item.title = `${nombre} · ${numeroCuenta}`;
    item.innerHTML = `
      <div class="avatar">${obtenerIniciales(perfil)}</div>
      <div class="client-info">
        <span class="client-name">${nombre}</span>
        <span class="account-number">Cta: ${numeroCuenta}</span>
      </div>
      <span class="status-indicator" aria-label="Cuenta activa"></span>
    `;
    item.addEventListener('click', () => seleccionarPerfil(numeroCuenta));
    lista.appendChild(item);
  });

  if (perfiles.length === 0) {
    lista.innerHTML = '<li class="empty-state">No hay perfiles que coincidan con la búsqueda.</li>';
  }
}

/** Cambia de perfil, actualiza el formulario y carga solamente su historial. */
async function seleccionarPerfil(numeroCuenta) {
  const perfil = window.estadoBanco.perfiles.find((item) => (item.NumeroCuenta || item.numeroCuenta) === numeroCuenta);
  if (!perfil) return;

  const cta = perfil.NumeroCuenta || perfil.numeroCuenta;
  const nombre = `${perfil.Nombre || perfil.nombre || ''} ${perfil.Apellido || perfil.apellido || ''}`.trim();
  const tipo = perfil.TipoCuenta || perfil.tipoCuenta || 'Ahorro';
  const saldo = perfil.Saldo !== undefined ? perfil.Saldo : (perfil.saldo !== undefined ? perfil.saldo : 0);

  window.estadoBanco.cuentaActiva = cta;
  window.estadoBanco.nombreActivo = nombre;

  const avatar = document.getElementById('current-profile-avatar');
  const nombreEl = document.getElementById('current-profile-name');
  const accountEl = document.getElementById('current-profile-account');
  const balanceEl = document.getElementById('current-profile-balance');

  if (avatar) avatar.textContent = obtenerIniciales(perfil);
  if (nombreEl) nombreEl.textContent = nombre;
  if (accountEl) accountEl.textContent = `Cuenta: ${cta} · ${tipo}`;
  if (balanceEl) balanceEl.textContent = formatearMonto(saldo);

  actualizarDestinatarios();
  activarFormulario(true);
  renderizarPerfiles();
  await cargarMovimientosPerfil(cta);
}

/** Llena el selector sin incluir la misma cuenta que está enviando dinero. */
function actualizarDestinatarios() {
  const selector = document.getElementById('input-destino');
  if (!selector) return;
  selector.innerHTML = '<option value="">Selecciona un destino</option>';
  window.estadoBanco.perfiles
    .filter((perfil) => (perfil.NumeroCuenta || perfil.numeroCuenta) !== window.estadoBanco.cuentaActiva)
    .forEach((perfil) => {
      const cta = perfil.NumeroCuenta || perfil.numeroCuenta;
      const nombre = `${perfil.Nombre || perfil.nombre || ''} ${perfil.Apellido || perfil.apellido || ''}`.trim();
      const opcion = document.createElement('option');
      opcion.value = cta;
      opcion.textContent = `${nombre} · ${cta}`;
      selector.appendChild(opcion);
    });
}

/** Obtiene y presenta los movimientos donde el perfil es origen o destinatario. */
async function cargarMovimientosPerfil(numeroCuenta) {
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;

  contenedor.innerHTML = '<div class="system-message"><span>Cargando movimientos…</span></div>';
  try {
    const respuesta = await fetch(`/api/movimientos/cuenta/${encodeURIComponent(numeroCuenta)}?t=${Date.now()}`);
    const resultado = await respuesta.json();
    if (!resultado.success) throw new Error(resultado.detalle || resultado.error);

    contenedor.innerHTML = '';
    if (!resultado.data || resultado.data.length === 0) {
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
  const contenedor = document.getElementById('chat-messages');
  if (!contenedor) return;

  // Si había un mensaje de sistema informativo vacío, retirarlo
  const mensajeVacio = contenedor.querySelector('.system-message');
  if (mensajeVacio && (contenedor.children.length === 1)) {
    contenedor.innerHTML = '';
  }

  const ctaOrigen = movimiento.CuentaOrigen || movimiento.cuentaOrigen;
  const ctaDestino = movimiento.CuentaDestino || movimiento.cuentaDestino;
  const esEnvio = ctaOrigen === window.estadoBanco.cuentaActiva;
  const monto = Number(movimiento.Monto || movimiento.monto || 0);
  const fecha = movimiento.FechaTransaccion || movimiento.fechaTransaccion || movimiento.fecha;

  const burbuja = document.createElement('article');
  burbuja.className = `tx-bubble ${esEnvio ? 'tx-sent' : 'tx-received'}`;
  burbuja.innerHTML = `
    <div class="tx-bubble-title">
      <span>${esEnvio ? 'Envío' : 'Recepción'} ${esEnvio ? `a ${ctaDestino}` : `de ${ctaOrigen}`}</span>
      <span class="tx-status-confirmed">✓ Confirmada</span>
    </div>
    <div class="tx-amount">${esEnvio ? '−' : '+'}${formatearMonto(monto)}</div>
    <div class="tx-meta">
      <span>${movimiento.Descripcion || movimiento.descripcion || 'Transferencia bancaria'}</span>
      <span>${fecha ? new Date(fecha).toLocaleTimeString() : 'Ahora'}</span>
    </div>
  `;
  contenedor.appendChild(burbuja);
}

/** Procesa transferencias recibidas vía WebSocket si afectan al perfil activo */
function manejarMovimientoEnVivo(tx) {
  if (!tx || !window.estadoBanco.cuentaActiva) return;

  const origen = tx.cuentaOrigen || tx.CuentaOrigen;
  const destino = tx.cuentaDestino || tx.CuentaDestino;
  const monto = Number(tx.monto || tx.Monto || 0);

  if (origen === window.estadoBanco.cuentaActiva || destino === window.estadoBanco.cuentaActiva) {
    const perfilActivo = window.estadoBanco.perfiles.find(
      (p) => (p.NumeroCuenta || p.numeroCuenta) === window.estadoBanco.cuentaActiva
    );

    if (perfilActivo) {
      if (origen === window.estadoBanco.cuentaActiva && tx.nuevoSaldoOrigen !== undefined) {
        perfilActivo.Saldo = tx.nuevoSaldoOrigen;
      } else if (destino === window.estadoBanco.cuentaActiva && tx.nuevoSaldoDestino !== undefined) {
        perfilActivo.Saldo = tx.nuevoSaldoDestino;
      } else {
        const saldoActual = Number(perfilActivo.Saldo || perfilActivo.saldo || 0);
        perfilActivo.Saldo = origen === window.estadoBanco.cuentaActiva ? saldoActual - monto : saldoActual + monto;
      }

      const balanceEl = document.getElementById('current-profile-balance');
      if (balanceEl) balanceEl.textContent = formatearMonto(perfilActivo.Saldo);
    }

    agregarMovimientoPerfil(tx);
    const contenedor = document.getElementById('chat-messages');
    if (contenedor) contenedor.scrollTop = contenedor.scrollHeight;
  }
}

/** Habilita o bloquea los controles hasta que exista una cuenta emisora. */
function activarFormulario(activo) {
  ['input-destino', 'input-monto', 'input-descripcion', 'btn-enviar-dinero'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.disabled = !activo;
  });
}

function obtenerIniciales(perfil) {
  const nom = (perfil.Nombre || perfil.nombre || '').trim();
  const ape = (perfil.Apellido || perfil.apellido || '').trim();
  return `${nom[0] || ''}${ape[0] || ''}`.toUpperCase() || '--';
}

function formatearMonto(valor) {
  return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(Number(valor || 0));
}
