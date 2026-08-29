// Carga las variables definidas en el archivo .env a process.env
require('dotenv').config();

// Importa el driver oficial de SQL Server para Node.js
const sql = require('mssql');

// 1. OBJETO DE CONFIGURACIÓN DE LA CONEXIÓN
// Define las reglas y credenciales para conectarse a SQL Server
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'BancoHA_DB',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  options: {
    encrypt: false,               // Desactivado para entornos de red local sin certificados SSL
    trustServerCertificate: true, // Acepta certificados autofirmados de desarrollo
    
    // CRÍTICO PARA FAILOVER: Si el nodo cae, no se queda esperando 15-30 segundos.
    // A los 4 segundos aborta y reintenta conectarse al nuevo servidor primario.
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT, 10) || 4000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT, 10) || 5000,
    
    // OBLIGATORIO PARA ALWAYS ON:
    // Obliga al driver a resolver todas las IPs asociadas al Listener en paralelo.
    // Esto hace que la reconexión tras apagar la Laptop 1 sea en menos de 2 segundos.
    multiSubnetFailover: true
  },
  pool: {
    max: 10,                 // Máximo 10 conexiones simultáneas abiertas en memoria
    min: 0,                  // Si no hay tráfico, libera conexiones para ahorrar RAM
    idleTimeoutMillis: 3000  // Cierra conexiones inactivas después de 3 segundos
  }
};

// Variable global en memoria para reutilizar el pool activo
let pool = null;

/**
 * Obtiene el pool de conexiones existente o crea uno nuevo si se cayó.
 * Si ocurrió un failover, la conexión previa fallará y aquí se recrea automáticamente.
 */
async function getPool() {
  try {
    // Si ya existe un pool y sigue conectado, lo reutilizamos
    if (pool && pool.connected) {
      return pool;
    }
    
    // Si el pool quedó en un estado corrupto/desconectado por el corte de red, lo cerramos
    if (pool && !pool.connected) {
      try { await pool.close(); } catch (e) { /* Ignorar error de cierre forzado */ }
    }
    
    // Creamos y conectamos un nuevo pool apuntando al Listener
    pool = await new sql.ConnectionPool(dbConfig).connect();
    return pool;
  } catch (err) {
    pool = null; // Reiniciar referencia en caso de fallo total
    throw err;
  }
}

/**
 * 1. OBTENER ESTADO DEL SERVIDOR ACTIVO
 * Ejecuta SELECT @@SERVERNAME para saber qué laptop física está atendiendo la conexión.
 */
async function obtenerServidorActivo() {
  const tInicio = Date.now(); // Cronómetro de inicio
  const conn = await getPool();
  
  // Consulta directa a la función global del motor SQL Server
  const result = await conn.request().query(`
    SELECT 
      @@SERVERNAME AS Servidor, 
      SYSDATETIME() AS Timestamp
  `);
  
  const duracion = Date.now() - tInicio; // Tiempo que tardó la consulta (latencia)

  return {
    servidor: result.recordset[0].Servidor,
    timestamp: result.recordset[0].Timestamp,
    tiempoRespuestaMs: duracion
  };
}

/**
 * 2. EJECUTAR TRANSFERENCIA MEDIANTE EL STORED PROCEDURE REAL
 * Llama al procedimiento `sp_TransferirDinero` creado por el equipo de base de datos.
 */
async function ejecutarTransferencia(cuentaOrigen, cuentaDestino, monto, descripcion = 'Transferencia Web') {
  const tInicio = Date.now();
  const conn = await getPool();
  
  const request = conn.request();
  
  // Parámetros de entrada que exige `sp_TransferirDinero`
  request.input('NumeroCuentaOrigen', sql.VarChar(20), cuentaOrigen);
  request.input('NumeroCuentaDestino', sql.VarChar(20), cuentaDestino);
  request.input('Monto', sql.Decimal(18, 2), monto);
  request.input('Descripcion', sql.VarChar(200), descripcion);

  // Ejecuta el procedimiento almacenado
  const result = await request.execute('sp_TransferirDinero');
  const duracion = Date.now() - tInicio;

  // El SP devuelve un SELECT con los datos de confirmación
  const row = result.recordset[0];

  return {
    resultado: row.Resultado,
    cuentaOrigen: row.CuentaOrigen,
    cuentaDestino: row.CuentaDestino,
    monto: parseFloat(row.Monto),
    nuevoSaldoOrigen: parseFloat(row.NuevoSaldoOrigen),
    nuevoSaldoDestino: parseFloat(row.NuevoSaldoDestino),
    servidorProcesador: row.ServidorProcesador,
    tiempoRespuestaMs: duracion,
    fecha: new Date().toISOString()
  };
}

/**
 * 3. CONSULTAR ÚLTIMOS MOVIMIENTOS
 * Utiliza la vista `vw_UltimasTransacciones` de la base de datos.
 */
async function obtenerUltimosMovimientos(limite = 15) {
  const conn = await getPool();
  const request = conn.request();
  request.input('limite', sql.Int, limite);
  
  const result = await request.query(`
    SELECT TOP (@limite)
      IdTransaccion AS idTransaccion,
      CuentaOrigen,
      CuentaDestino,
      TipoTransaccion,
      Monto,
      FechaTransaccion,
      ServidorProcesador,
      Estado,
      Descripcion
    FROM vw_UltimasTransacciones
    ORDER BY FechaTransaccion DESC;
  `);

  return result.recordset;
}

/**
 * 4. CONSULTAR LISTA DE CLIENTES Y CUENTAS ACTIVAS
 * Utiliza la vista `vw_CuentasClientes` para mostrar los usuarios en la web.
 */
async function obtenerCuentasClientes() {
  const conn = await getPool();
  const result = await conn.request().query(`
    SELECT 
      IdCliente,
      CI,
      Nombre,
      Apellido,
      IdCuenta,
      NumeroCuenta,
      TipoCuenta,
      Saldo,
      Estado
    FROM vw_CuentasClientes
    WHERE Estado = 1
    ORDER BY IdCliente ASC;
  `);

  return result.recordset;
}

// Exportar las funciones para que puedan ser usadas por las rutas de Express y servicios
module.exports = {
  getPool,
  obtenerServidorActivo,
  ejecutarTransferencia,
  obtenerUltimosMovimientos,
  obtenerCuentasClientes
};
