const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/servidor
router.get('/', async (req, res) => {
  try {
    // Consulta @@SERVERNAME mediante el pool
    const info = await db.obtenerServidorActivo();
    
    // Responde con código 200 OK y la información del servidor
    res.json({
      success: true,
      servidor: info.servidor,
      rol: 'PRIMARY',
      tiempoRespuestaMs: info.tiempoRespuestaMs,
      timestamp: info.timestamp
    });
  } catch (err) {
    // Si la Laptop 1 fue apagada y Always On está conmutando, responder con 503 (Servicio temporalmente inaccesible)
    res.status(503).json({
      success: false,
      servidor: 'DESCONECTADO',
      mensaje: 'Conexión interrumpida. Esperando conmutación de réplica (Failover)...',
      error: err.message
    });
  }
});

module.exports = router;
