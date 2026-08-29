const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/movimientos - Obtiene las últimas transferencias realizadas
router.get('/', async (req, res) => {
  try {
    const limite = parseInt(req.query.limite, 10) || 15;
    const movimientos = await db.obtenerUltimosMovimientos(limite);
    
    res.json({
      success: true,
      data: movimientos
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'No se pudo consultar el historial de movimientos',
      detalle: err.message
    });
  }
});

// GET /api/movimientos/cuentas - Obtiene los clientes y sus números de cuenta
router.get('/cuentas', async (req, res) => {
  try {
    const cuentas = await db.obtenerCuentasClientes();
    res.json({
      success: true,
      data: cuentas
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'No se pudo obtener la lista de clientes',
      detalle: err.message
    });
  }
});

module.exports = router;
