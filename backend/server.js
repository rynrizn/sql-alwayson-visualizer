// Cargar variables de entorno
require('dotenv').config();

// Módulos nativos de Node.js y paquetes de terceros
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

// Importar conexión de base de datos y módulos de rutas
const db = require('./database');
const rutaServidor = require('./routes/servidor');
const rutaMovimientos = require('./routes/movimientos');
const rutaTransferencias = require('./routes/transferencias');
const traficoService = require('./services/trafico');

// Inicializar la aplicación Express y el servidor HTTP
const app = express();
const server = http.createServer(app);

// Inicializar Socket.IO sobre el servidor HTTP
const io = new Server(server, {
  cors: { origin: '*' } // Permite conexiones WebSocket desde cualquier origen en red local
});

// Guardar la referencia de Socket.IO dentro de Express y del servicio de tráfico
app.set('io', io);
traficoService.setIo(io);

// MIDDLEWARES DE EXPRESS
app.use(cors()); // Permite peticiones HTTP de dispositivos en la misma red Wi-Fi
app.use(express.json()); // Permite a Express entender cuerpos de petición en formato JSON

// Servir la carpeta frontend estáticamente (HTML, CSS y JS del cliente)
app.use(express.static(path.join(__dirname, '../frontend')));

// REGISTRO DE RUTAS DE LA API
app.use('/api/servidor', rutaServidor);
app.use('/api/movimientos', rutaMovimientos);
app.use('/api/transferencia', rutaTransferencias);

// RUTAS DE CONTROL DE TRÁFICO MASIVO
app.post('/api/trafico/iniciar', (req, res) => {
  const intervalo = parseInt(req.body.intervaloMs, 10) || 1000;
  const resultado = traficoService.iniciar(intervalo);
  res.json(resultado);
});

app.post('/api/trafico/detener', (req, res) => {
  const resultado = traficoService.detener();
  res.json(resultado);
});

// EVENTOS DE CONEXIÓN SOCKET.IO
io.on('connection', (socket) => {
  console.log(`🟢 Nuevo cliente web conectado (Socket ID: ${socket.id})`);
  
  socket.on('disconnect', () => {
    console.log(`🔴 Cliente web desconectado (Socket ID: ${socket.id})`);
  });
});

// POLLING LOOP DE SALUD DE BASE DE DATOS (Cada 1.5 segundos)
// Consulta continuamente el nodo activo para detectar el momento exacto del Failover
setInterval(async () => {
  try {
    const estado = await db.obtenerServidorActivo();
    
    // Si PostgreSQL responde, emitir estado ONLINE indicando su rol (PRIMARY o STANDBY)
    io.emit('estado_servidor', {
      online: true,
      servidor: estado.servidor,
      rol: estado.rol || 'PRIMARY',
      tiempoRespuestaMs: estado.tiempoRespuestaMs,
      timestamp: estado.timestamp
    });
  } catch (err) {
    // Si PostgreSQL no responde (conmutación / caída de red), emitir estado de conmutación
    io.emit('estado_servidor', {
      online: false,
      servidor: 'DESCONECTADO',
      mensaje: 'Conexión interrumpida. Esperando conmutación de réplica (Failover)...',
      timestamp: new Date().toISOString()
    });
  }
}, 1500);

// INICIAR EL SERVIDOR EN EL PUERTO CONFIGURADO
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🏦 Sistema Web Banco HA iniciado con éxito (PostgreSQL)`);
  console.log(`🌐 Acceso local: http://localhost:${PORT}`);
  console.log(`📡 Conectando a Base de Datos en: ${process.env.DB_HOST || process.env.DB_SERVER || 'localhost'}:${process.env.DB_PORT || 5432}`);
  console.log('====================================================');
});
