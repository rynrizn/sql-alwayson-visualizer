const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/transferencia
router.post('/', async (req, res) => {
  // Extraer los datos enviados en el cuerpo JSON de la petición
  const { cuentaOrigen, cuentaDestino, monto, descripcion } = req.body;

  // Validación básica de campos requeridos
  if (!cuentaOrigen || !cuentaDestino || !monto) {
    return res.status(400).json({
      success: false,
      error: 'Faltan parámetros obligatorios (cuentaOrigen, cuentaDestino, monto).'
    });
  }

  try {
    // Ejecutar el procedimiento almacenado transaccional en SQL Server
    const tx = await db.ejecutarTransferencia(
      String(cuentaOrigen),
      String(cuentaDestino),
      parseFloat(monto),
      descripcion || 'Transferencia Web Demostración'
    );

    // Obtener la instancia de Socket.IO montada en el servidor Express
    const io = req.app.get('io');
    if (io) {
      // Emitir el evento en tiempo real a TODOS los navegadores conectados
      io.emit('nuevo_movimiento', tx);
    }

    // Responder al cliente que envió la solicitud
    res.json({
      success: true,
      mensaje: 'Transferencia realizada y confirmada por SQL Server',
      data: tx
    });

  } catch (err) {
    // Si ocurrió error de saldo insuficiente, cuenta inexistente o desconexión en failover
    res.status(500).json({
      success: false,
      error: 'Error al procesar la transferencia',
      detalle: err.message
    });
  }
});

module.exports = router;
