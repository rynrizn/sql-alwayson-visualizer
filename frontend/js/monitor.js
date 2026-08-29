document.addEventListener('DOMContentLoaded', () => {
  const estadoConexion = document.getElementById('estado-conexion');
  const servidorActivo = document.getElementById('servidor-activo');
  const tiempoLatencia = document.getElementById('tiempo-latencia');
  const tbodyMovimientos = document.getElementById('tbody-movimientos');
  const btnIniciar = document.getElementById('btn-iniciar-trafico');
  const btnDetener = document.getElementById('btn-detener-trafico');
  const contadorTrafico = document.getElementById('contador-trafico');

  let totalTrafico = 0;

  // Escuchar estado del servidor en tiempo real
  window.appSocket.on('estado_servidor', (data) => {
    if (data.online) {
      estadoConexion.innerText = '🟢 SISTEMA ONLINE';
      estadoConexion.className = 'online';
      servidorActivo.innerText = `Servidor: ${data.servidor} (${data.rol})`;
      tiempoLatencia.innerText = `${data.tiempoRespuestaMs} ms`;
    } else {
      estadoConexion.innerText = '🟡 CONEXIÓN INTERRUMPIDA';
      estadoConexion.className = 'offline';
      servidorActivo.innerText = 'Reconectando con réplica...';
      tiempoLatencia.innerText = '-- ms';
    }
  });

  // Escuchar nuevos movimientos
  window.appSocket.on('nuevo_movimiento', (tx) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>#${tx.txId}</td>
      <td>Cta ${tx.cuentaOrigen}</td>
      <td>Cta ${tx.cuentaDestino}</td>
      <td>$${tx.monto.toFixed(2)}</td>
      <td><strong>${tx.servidor}</strong></td>
      <td>${tx.tiempoRespuestaMs} ms</td>
    `;
    tbodyMovimientos.insertBefore(row, tbodyMovimientos.firstChild);
    if (tbodyMovimientos.children.length > 10) {
      tbodyMovimientos.removeChild(tbodyMovimientos.lastChild);
    }
  });

  // Control de tráfico masivo
  btnIniciar.addEventListener('click', async () => {
    const res = await fetch('/api/trafico/iniciar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervaloMs: 900 })
    });
    const data = await res.json();
    if (data.activo) {
      btnIniciar.disabled = true;
      btnDetener.disabled = false;
    }
  });

  btnDetener.addEventListener('click', async () => {
    const res = await fetch('/api/trafico/detener', { method: 'POST' });
    const data = await res.json();
    if (!data.activo) {
      btnIniciar.disabled = false;
      btnDetener.disabled = true;
    }
  });

  window.appSocket.on('trafico_tick', (data) => {
    totalTrafico = data.contador;
    contadorTrafico.innerText = `Transacciones automáticas: ${totalTrafico}`;
  });
});
