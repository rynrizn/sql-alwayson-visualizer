document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-transferencia');
  const inputMonto = document.getElementById('input-monto');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const monto = parseFloat(inputMonto.value);
    if (!monto || monto <= 0) return;

    try {
      const res = await fetch('/api/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: 1, 
          destino: clienteSeleccionado.id,
          monto: monto
        })
      });
      const data = await res.json();
      if (data.success) {
        inputMonto.value = '';
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error('Error al emitir transferencia:', err);
    }
  });
});
