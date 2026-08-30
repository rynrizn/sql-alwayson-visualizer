// Monitoreo en tiempo real del Clúster Always On con datos reales de la BD y WebSockets.
document.addEventListener('DOMContentLoaded', () => {
  const serverNameDisplay = document.getElementById('server-name-display');
  const serverRoleDisplay = document.getElementById('server-role-display');
  const serverLatencyDisplay = document.getElementById('server-latency-display');
  const serverCheckTime = document.getElementById('server-check-time');
  const healthTag = document.getElementById('health-tag');
  const headerBadge = document.getElementById('header-status-badge');
  const badgeText = document.getElementById('badge-text');

  const btnStartTraffic = document.getElementById('btn-start-traffic');
  const btnStopTraffic = document.getElementById('btn-stop-traffic');
  const trafficCounter = document.getElementById('traffic-counter');
  const liveTxTbody = document.getElementById('live-tx-tbody');

  /** Aplica el estado real del servidor a los componentes visuales */
  function actualizarEstadoServidor(data) {
    serverCheckTime.innerText = `Última comprobación: ${new Date().toLocaleTimeString()}`;

    if (data.online || data.success) {
      serverNameDisplay.innerText = data.servidor || 'Servidor Principal';
      serverRoleDisplay.innerText = data.rol || 'PRIMARY';
      serverLatencyDisplay.innerText = `${data.tiempoRespuestaMs ?? 0} ms`;

      healthTag.innerText = 'SALUDABLE';
      healthTag.className = 'tag online';

      headerBadge.className = 'badge-pill online';
      badgeText.innerText = 'SISTEMA OPERATIVO';
    } else {
      serverNameDisplay.innerText = 'CONMUTANDO...';
      serverRoleDisplay.innerText = 'RECONECTANDO';
      serverLatencyDisplay.innerText = '-- ms';

      healthTag.innerText = 'FAILOVER ACTIVO';
      healthTag.className = 'tag failover';

      headerBadge.className = 'badge-pill failover';
      badgeText.innerText = 'CONMUTACIÓN EN PROCESO';
    }
  }

  /** Inserta una fila en la tabla de operaciones confirmadas */
  function agregarFilaTransaccion(tx, alInicio = true) {
    const tr = document.createElement('tr');
    const id = tx.idTransaccion || tx.IdTransaccion || tx.txId || 'TX';
    const origen = tx.cuentaOrigen || tx.CuentaOrigen || '---';
    const destino = tx.cuentaDestino || tx.CuentaDestino || '---';
    const monto = parseFloat(tx.monto || tx.Monto || 0).toFixed(2);
    const servidor = tx.servidorProcesador || tx.ServidorProcesador || tx.servidor || 'PRIMARY';

    tr.innerHTML = `
      <td>#${id}</td>
      <td>${origen} ➔ ${destino}</td>
      <td><strong>$${monto}</strong></td>
      <td><span class="tag online">${servidor}</span></td>
    `;

    if (alInicio) {
      liveTxTbody.insertBefore(tr, liveTxTbody.firstChild);
      if (liveTxTbody.children.length > 8) {
        liveTxTbody.removeChild(liveTxTbody.lastChild);
      }
    } else {
      liveTxTbody.appendChild(tr);
    }
  }

  /** Consulta el estado real del clúster de forma inmediata al abrir la página */
  async function consultarEstadoInicialServidor() {
    try {
      const respuesta = await fetch('/api/servidor');
      const resultado = await respuesta.json();
      actualizarEstadoServidor(resultado);
    } catch (error) {
      console.warn('Esperando conexión con el clúster:', error.message);
      actualizarEstadoServidor({ online: false });
    }
  }

  /** Carga los movimientos reales existentes en la base de datos para no mostrar tabla vacía */
  async function cargarMovimientosIniciales() {
    try {
      const respuesta = await fetch('/api/movimientos?limite=8');
      const resultado = await respuesta.json();
      if (resultado.success && Array.isArray(resultado.data) && resultado.data.length > 0) {
        liveTxTbody.innerHTML = '';
        resultado.data.forEach((tx) => agregarFilaTransaccion(tx, false));
      } else {
        liveTxTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay operaciones recientes registradas.</td></tr>';
      }
    } catch (error) {
      console.warn('No se pudieron precargar transacciones iniciales:', error.message);
    }
  }

  // 1. Carga inicial de datos reales
  consultarEstadoInicialServidor();
  cargarMovimientosIniciales();

  // 2. Escuchar eventos en vivo emitidos por el backend vía WebSocket
  if (window.appSocket) {
    window.appSocket.on('estado_servidor', (data) => {
      actualizarEstadoServidor(data);
    });

    window.appSocket.on('nuevo_movimiento', (tx) => {
      // Si existía el mensaje de estado vacío, limpiarlo
      const vacio = liveTxTbody.querySelector('.empty-state');
      if (vacio) liveTxTbody.innerHTML = '';
      agregarFilaTransaccion(tx, true);
    });

    window.appSocket.on('trafico_tick', (data) => {
      trafficCounter.innerText = `Transacciones generadas: ${data.contador}`;
    });

    window.appSocket.on('estado_trafico', (data) => {
      btnStartTraffic.disabled = data.activo;
      btnStopTraffic.disabled = !data.activo;
    });
  }

  // 3. Controles del simulador de tráfico
  btnStartTraffic?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/trafico/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervaloMs: 800 })
      });
      const data = await res.json();
      if (data.activo) {
        btnStartTraffic.disabled = true;
        btnStopTraffic.disabled = false;
      }
    } catch (error) {
      console.error('Error al iniciar simulación:', error);
    }
  });

  btnStopTraffic?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/trafico/detener', { method: 'POST' });
      const data = await res.json();
      if (!data.activo) {
        btnStartTraffic.disabled = false;
        btnStopTraffic.disabled = true;
      }
    } catch (error) {
      console.error('Error al detener simulación:', error);
    }
  });
});
