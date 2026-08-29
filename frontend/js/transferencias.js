document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-transferencia');
  const inputMonto = document.getElementById('input-monto');
  const inputDesc = document.getElementById('input-descripcion');
  const chatMessages = document.getElementById('chat-messages');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const monto = parseFloat(inputMonto.value);
    if (!monto || monto <= 0) return;

    const payload = {
      cuentaOrigen: window.estadoChat.cuentaOrigen,
      cuentaDestino: window.estadoChat.cuentaDestino,
      monto: monto,
      descripcion: inputDesc.value || 'Transferencia Web'
    };

    try {
      const res = await fetch('/api/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseData = await res.json();

      if (responseData.success) {
        // Agregar la burbuja visual al chat
        const tx = responseData.data;
        agregarBurbujaChat(tx);
        inputMonto.value = '';
      } else {
        alert(`Error en la transferencia: ${responseData.detalle || responseData.error}`);
      }
    } catch (err) {
      console.error('Fallo en la comunicación:', err);
      alert('Error de conexión con el servidor. Puede que esté en proceso de Failover.');
    }
  });

  function agregarBurbujaChat(tx) {
    const bubble = document.createElement('div');
    bubble.className = 'tx-bubble';
    bubble.innerHTML = `
      <div class="tx-bubble-title">
        <span>💸 Envío a ${window.estadoChat.nombreDestino}</span>
        <span class="tx-status-confirmed">✓ Confirmada</span>
      </div>
      <div class="tx-amount">$${tx.monto.toFixed(2)}</div>
      <div class="tx-meta">
        <span>Servidor: <strong>${tx.servidorProcesador}</strong></span>
        <span>Latencia: ${tx.tiempoRespuestaMs} ms | ${new Date(tx.fecha).toLocaleTimeString()}</span>
      </div>
    `;

    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
});
