// ============================================================================
// MODULO DE CONEXION Y OPERACIONES DE BASE DE DATOS (POSTGRESQL - UBUNTU SERVER)
// ============================================================================
// Este modulo reemplaza el driver nativo de SQL Server (mssql) por el cliente 
// oficial de PostgreSQL ('pg'), adaptando el pool de conexiones, las consultas
// relacionales y la invocacion de funciones/procedimientos para entornos Linux/Ubuntu.

require('dotenv').config();
const { Pool } = require('pg');

// 1. OBJETO DE CONFIGURACION DEL POOL DE CONEXIONES
// Diseñado para alta resiliencia en Ubuntu Server. Soporta balanceadores (HAProxy/PgBouncer)
// o conexiones directas a clusters con Streaming Replication / Patroni.
const dbConfig = {
  host: process.env.DB_HOST || process.env.DB_SERVER || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'bancoha_db',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  
  // Limites del pool de conexiones en memoria
  max: 10,                      // Maximo 10 clientes simultaneos en el pool
  idleTimeoutMillis: 3000,      // Tiempo de gracia para cerrar clientes inactivos
  connectionTimeoutMillis: 4000 // Timeout de 4s para failover veloz ante caida del nodo primario
};

// Variable singleton para reutilizar el Pool de PostgreSQL a lo largo de la app
let pool = null;

/**
 * Inicializa y retorna el Pool de conexiones activo.
 * Si ocurre una caida en el nodo (failover), el pool gestiona la reconexion
 * o se reinicializa limpiamente.
 */
function getPool() {
  if (!pool) {
    pool = new Pool(dbConfig);

    // Captura errores silenciosos en clientes inactivos para evitar que la aplicacion colapse
    pool.on('error', (err) => {
      console.error('⚠️ [PostgreSQL Pool] Error inesperado en cliente inactivo:', err.message);
    });
  }
  return pool;
}

/**
 * 1. OBTENER ESTADO DEL SERVIDOR ACTIVO
 * En PostgreSQL, se consulta la direccion IP del host actual con `inet_server_addr()`,
 * el puerto y la hora del servidor con `NOW()`. Si el nodo es una replica en caliente,
 * podemos detectar si esta en modo de solo lectura con `pg_is_in_recovery()`.
 */
async function obtenerServidorActivo() {
  const tInicio = Date.now();
  const poolActual = getPool();

  // Consulta informativa del motor PostgreSQL
  const query = `
    SELECT 
      COALESCE(inet_server_addr()::text, 'localhost (socket unix)') AS servidor,
      current_database() AS base_datos,
      pg_is_in_recovery() AS en_recuperacion,
      NOW() AS timestamp;
  `;

  const { rows } = await poolActual.query(query);
  const duracion = Date.now() - tInicio;
  const data = rows[0];

  return {
    servidor: data.servidor,
    baseDatos: data.base_datos,
    rol: data.en_recuperacion ? 'STANDBY (REPLICA)' : 'PRIMARY',
    timestamp: data.timestamp,
    tiempoRespuestaMs: duracion
  };
}

/**
 * 2. EJECUTAR TRANSFERENCIA BANCARIA ACID
 * Invoca la funcion PL/pgSQL `sp_transferir_dinero` que implementa bloqueo pesimista
 * (SELECT FOR UPDATE) y gestion transaccional protegida contra condiciones de carrera.
 */
async function ejecutarTransferencia(cuentaOrigen, cuentaDestino, monto, descripcion = 'Transferencia Web') {
  const tInicio = Date.now();
  const poolActual = getPool();

  // En PostgreSQL las funciones/procedimientos con retorno de tabla se consultan via SELECT
  const query = `
    SELECT 
      resultado,
      cuenta_origen,
      cuenta_destino,
      monto,
      nuevo_saldo_origen,
      nuevo_saldo_destino,
      servidor_procesador
    FROM sp_transferir_dinero($1, $2, $3, $4);
  `;

  const valores = [cuentaOrigen, cuentaDestino, monto, descripcion];
  const { rows } = await poolActual.query(query, valores);
  const duracion = Date.now() - tInicio;
  const row = rows[0];

  return {
    resultado: row.resultado,
    cuentaOrigen: row.cuenta_origen,
    cuentaDestino: row.cuenta_destino,
    monto: parseFloat(row.monto),
    nuevoSaldoOrigen: parseFloat(row.nuevo_saldo_origen),
    nuevoSaldoDestino: parseFloat(row.nuevo_saldo_destino),
    servidorProcesador: row.servidor_procesador,
    tiempoRespuestaMs: duracion,
    fecha: new Date().toISOString()
  };
}

/**
 * 3. CONSULTAR ULTIMOS MOVIMIENTOS GLOBALES
 * Utiliza la vista `vw_ultimas_transacciones` con limite parametrizado (LIMIT $1).
 */
async function obtenerUltimosMovimientos(limite = 15) {
  const poolActual = getPool();
  const query = `
    SELECT 
      id_transaccion AS "idTransaccion",
      cuenta_origen AS "CuentaOrigen",
      cuenta_destino AS "CuentaDestino",
      tipo_transaccion AS "TipoTransaccion",
      monto AS "Monto",
      fecha_transaccion AS "FechaTransaccion",
      servidor_procesador AS "ServidorProcesador",
      estado AS "Estado",
      descripcion AS "Descripcion"
    FROM vw_ultimas_transacciones
    ORDER BY fecha_transaccion DESC
    LIMIT $1;
  `;

  const { rows } = await poolActual.query(query, [limite]);
  return rows;
}

/**
 * 3.1 CONSULTAR HISTORIAL AISLADO POR CUENTA
 * Devuelve unicamente las transacciones donde la cuenta especificada es emisor o receptor.
 */
async function obtenerMovimientosPorCuenta(numeroCuenta, limite = 30) {
  const poolActual = getPool();
  const query = `
    SELECT 
      id_transaccion AS "idTransaccion",
      cuenta_origen AS "CuentaOrigen",
      cuenta_destino AS "CuentaDestino",
      tipo_transaccion AS "TipoTransaccion",
      monto AS "Monto",
      fecha_transaccion AS "FechaTransaccion",
      servidor_procesador AS "ServidorProcesador",
      estado AS "Estado",
      descripcion AS "Descripcion"
    FROM vw_ultimas_transacciones
    WHERE cuenta_origen = $1 OR cuenta_destino = $1
    ORDER BY fecha_transaccion DESC
    LIMIT $2;
  `;

  const { rows } = await poolActual.query(query, [numeroCuenta, limite]);
  return rows;
}

/**
 * 4. CONSULTAR LISTA DE CLIENTES Y CUENTAS ACTIVAS
 * Consulta la vista `vw_cuentas_clientes` para poblar el listado de perfiles bancarios.
 */
async function obtenerCuentasClientes() {
  const poolActual = getPool();
  try {
    const query = `
      SELECT 
        id_cliente AS "IdCliente",
        ci AS "CI",
        nombre AS "Nombre",
        apellido AS "Apellido",
        id_cuenta AS "IdCuenta",
        numero_cuenta AS "NumeroCuenta",
        tipo_cuenta AS "TipoCuenta",
        saldo AS "Saldo",
        estado AS "Estado"
      FROM vw_cuentas_clientes
      WHERE estado = true
      ORDER BY id_cliente ASC;
    `;
    const { rows } = await poolActual.query(query);
    if (rows && rows.length > 0) {
      return rows;
    }
  } catch (errVista) {
    console.warn('⚠️ [PostgreSQL] Consulta a vw_cuentas_clientes falló, intentando respaldo con JOIN:', errVista.message);
  }

  // Fallback transparente a tablas base en caso de que la vista no se encuentre disponible
  const fallbackQuery = `
    SELECT 
      c.id_cliente AS "IdCliente",
      c.ci AS "CI",
      c.nombre AS "Nombre",
      c.apellido AS "Apellido",
      cu.id_cuenta AS "IdCuenta",
      cu.numero_cuenta AS "NumeroCuenta",
      COALESCE(tc.nombre_tipo, 'Ahorro') AS "TipoCuenta",
      cu.saldo AS "Saldo",
      cu.estado AS "Estado"
    FROM clientes c
    INNER JOIN cuentas cu ON c.id_cliente = cu.id_cliente
    LEFT JOIN tipos_cuenta tc ON cu.id_tipo_cuenta = tc.id_tipo_cuenta
    WHERE cu.estado = true
    ORDER BY c.id_cliente ASC;
  `;

  const { rows } = await poolActual.query(fallbackQuery);
  return rows;
}

/**
 * 4.1 OBTENER NUMEROS DE CUENTAS ACTIVAS
 * Extrae un arreglo con las cadenas de numeros de cuenta vigentes para el simulador de trafico.
 */
async function obtenerNumerosCuentasActivas() {
  const cuentas = await obtenerCuentasClientes();
  return cuentas.map((c) => c.NumeroCuenta);
}

/**
 * 5. REGISTRAR UN NUEVO CLIENTE Y SU CUENTA BANCARIA
 * Ejecuta una transaccion atomica con bloqueo y clausula RETURNING de PostgreSQL.
 */
async function crearClienteYCuenta({ nombre, apellido, ci, saldoInicial = 0 }) {
  const poolActual = getPool();
  const client = await poolActual.connect();

  try {
    await client.query('BEGIN');

    // Validar unicidad del CI
    const ciCheck = await client.query('SELECT 1 FROM clientes WHERE ci = $1', [ci]);
    if (ciCheck.rows.length > 0) {
      throw new Error('El número de CI ya se encuentra registrado.');
    }

    // Insertar cliente y capturar nuevo ID con RETURNING
    const insertCliente = `
      INSERT INTO clientes (ci, nombre, apellido)
      VALUES ($1, $2, $3)
      RETURNING id_cliente;
    `;
    const resCliente = await client.query(insertCliente, [ci, nombre, apellido]);
    const nuevoIdCliente = resCliente.rows[0].id_cliente;

    // Calcular siguiente numero de cuenta correlativo
    const numCuentaQuery = `
      SELECT COALESCE(MAX(numero_cuenta::BIGINT), 1000000000) + 1 AS siguiente_cuenta
      FROM cuentas;
    `;
    const resCuentaNum = await client.query(numCuentaQuery);
    const nuevoNumeroCuenta = String(resCuentaNum.rows[0].siguiente_cuenta);

    // Insertar cuenta asociada al cliente
    const insertCuenta = `
      INSERT INTO cuentas (id_cliente, id_tipo_cuenta, numero_cuenta, saldo)
      VALUES ($1, 1, $2, $3)
      RETURNING id_cuenta, saldo, estado;
    `;
    const resCuenta = await client.query(insertCuenta, [
      nuevoIdCliente,
      nuevoNumeroCuenta,
      Math.max(0, parseFloat(saldoInicial) || 0)
    ]);
    const cuentaData = resCuenta.rows[0];

    await client.query('COMMIT');

    return {
      IdCliente: nuevoIdCliente,
      CI: ci,
      Nombre: nombre,
      Apellido: apellido,
      IdCuenta: cuentaData.id_cuenta,
      NumeroCuenta: nuevoNumeroCuenta,
      TipoCuenta: 'Ahorro',
      Saldo: parseFloat(cuentaData.saldo),
      Estado: cuentaData.estado
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Exportar las funciones para que puedan ser usadas por las rutas de Express y servicios
module.exports = {
  getPool,
  obtenerServidorActivo,
  ejecutarTransferencia,
  obtenerUltimosMovimientos,
  obtenerMovimientosPorCuenta,
  obtenerCuentasClientes,
  obtenerNumerosCuentasActivas,
  crearClienteYCuenta
};
