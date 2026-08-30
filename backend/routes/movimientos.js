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

// GET /api/movimientos/cuenta/:numeroCuenta - Historial de un perfil específico
router.get('/cuenta/:numeroCuenta', async (req, res) => {
  try {
    const limiteSolicitado = parseInt(req.query.limite, 10) || 30;
    // Evita respuestas excesivas si un cliente altera el parámetro manualmente.
    const limite = Math.min(Math.max(limiteSolicitado, 1), 100);
    const movimientos = await db.obtenerMovimientosPorCuenta(req.params.numeroCuenta, limite);

    res.json({
      success: true,
      data: movimientos
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'No se pudo consultar el historial del perfil',
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
