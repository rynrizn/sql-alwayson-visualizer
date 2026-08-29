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

  // 1. Escuchar actualizaciones de salud del clúster (cada 1.5s)
  window.appSocket.on('estado_servidor', (data) => {
    serverCheckTime.innerText = `Última comprobación: ${new Date().toLocaleTimeString()}`;

    if (data.online) {
      // Estado Saludable
      serverNameDisplay.innerText = data.servidor;
      serverRoleDisplay.innerText = data.rol;
      serverLatencyDisplay.innerText = `${data.tiempoRespuestaMs} ms`;

      healthTag.innerText = 'SALUDABLE';
      healthTag.className = 'tag online';

      headerBadge.className = 'badge-pill online';
      badgeText.innerText = 'SISTEMA OPERATIVO';
    } else {
      // Estado Durante Conmutación por Error (Failover)
      serverNameDisplay.innerText = 'CONMUTANDO...';
      serverRoleDisplay.innerText = 'RECONECTANDO';
      serverLatencyDisplay.innerText = '-- ms';

      healthTag.innerText = 'FAILOVER ACTIVO';
      healthTag.className = 'tag failover';

      headerBadge.className = 'badge-pill failover';
      badgeText.innerText = 'CONMUTACIÓN EN PROCESO';
    }
  });

  // 2. Escuchar nuevas transferencias para la tabla de eventos en vivo
  window.appSocket.on('nuevo_movimiento', (tx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${tx.idTransaccion || tx.txId || 'TX'}</td>
      <td>${tx.cuentaOrigen} ➔ ${tx.cuentaDestino}</td>
      <td><strong>$${parseFloat(tx.monto).toFixed(2)}</strong></td>
      <td><span class="tag online">${tx.servidorProcesador || tx.servidor}</span></td>
    `;

    liveTxTbody.insertBefore(tr, liveTxTbody.firstChild);
    if (liveTxTbody.children.length > 8) {
      liveTxTbody.removeChild(liveTxTbody.lastChild);
    }
  });

  // 3. Controles de tráfico masivo
  btnStartTraffic.addEventListener('click', async () => {
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
  });

  btnStopTraffic.addEventListener('click', async () => {
    const res = await fetch('/api/trafico/detener', { method: 'POST' });
    const data = await res.json();
    if (!data.activo) {
      btnStartTraffic.disabled = false;
      btnStopTraffic.disabled = true;
    }
  });

  window.appSocket.on('trafico_tick', (data) => {
    trafficCounter.innerText = `Transacciones generadas: ${data.contador}`;
  });

  window.appSocket.on('estado_trafico', (data) => {
    btnStartTraffic.disabled = data.activo;
    btnStopTraffic.disabled = !data.activo;
  });
});
