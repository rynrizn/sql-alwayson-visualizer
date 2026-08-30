// Envía transferencias usando siempre el perfil seleccionado como cuenta origen.
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-transferencia');
  const inputMonto = document.getElementById('input-monto');
  const inputDestino = document.getElementById('input-destino');
  const inputDescripcion = document.getElementById('input-descripcion');

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const monto = Number.parseFloat(inputMonto.value);
    const cuentaOrigen = window.estadoBanco.cuentaActiva;
    const cuentaDestino = inputDestino.value;
    if (!cuentaOrigen || !cuentaDestino || !monto || monto <= 0) return;

    try {
      const respuesta = await fetch('/api/transferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cuentaOrigen,
          cuentaDestino,
          monto,
          descripcion: inputDescripcion.value || 'Transferencia Web'
        })
      });
      const resultado = await respuesta.json();
      if (!resultado.success) throw new Error(resultado.detalle || resultado.error);

      inputMonto.value = '';
      // La consulta vuelve a ser la fuente de verdad para los envíos y recibos.
      await seleccionarPerfil(cuentaOrigen);
      actualizarSaldoLocal(resultado.data.nuevoSaldoOrigen);
    } catch (error) {
      console.error('Error enviando transferencia:', error);
      alert(`Error en la transferencia: ${error.message}`);
    }
  });
});

/** Refresca el saldo mostrado tras una transferencia confirmada. */
function actualizarSaldoLocal(saldo) {
  const perfil = window.estadoBanco.perfiles.find((item) => item.NumeroCuenta === window.estadoBanco.cuentaActiva);
  if (perfil) perfil.Saldo = saldo;
  document.getElementById('current-profile-balance').textContent = formatearMonto(saldo);
}
