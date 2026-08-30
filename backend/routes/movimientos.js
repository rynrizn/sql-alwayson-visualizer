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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  try {
    const cuentas = await db.obtenerCuentasClientes();
    res.json({
      success: true,
      data: cuentas
    });
  } catch (err) {
    console.error('Error al obtener lista de cuentas en /api/movimientos/cuentas:', err);
    res.status(500).json({
      success: false,
      error: 'No se pudo obtener la lista de clientes',
      detalle: err.message
    });
  }
});

// POST /api/movimientos/cliente - Registra un nuevo cliente y su cuenta en SQL Server
router.post('/cliente', async (req, res) => {
  try {
    const { nombre, apellido, ci, saldo } = req.body;
    if (!nombre || !apellido || !ci) {
      return res.status(400).json({
        success: false,
        error: 'Nombre, Apellido y CI son obligatorios'
      });
    }

    const nuevoCliente = await db.crearClienteYCuenta({
      nombre,
      apellido,
      ci,
      saldoInicial: parseFloat(saldo) || 0
    });

    res.json({
      success: true,
      data: nuevoCliente,
      mensaje: 'Cliente y cuenta creados exitosamente'
    });
  } catch (err) {
    console.error('Error al registrar nuevo cliente:', err);
    res.status(500).json({
      success: false,
      error: 'No se pudo registrar el cliente',
      detalle: err.message
    });
  }
});

module.exports = router;
