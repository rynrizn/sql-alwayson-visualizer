const db = require('../database');

class TraficoService {
  constructor() {
    this.intervalId = null; // Guarda el identificador del temporizador
    this.activo = false;     // Bandera de estado
    this.contador = 0;       // Contador de transferencias simuladas
    this.io = null;          // Instancia de Socket.IO
    
    // Cuentas creadas en los scripts de prueba de BancoHA_DB
    this.cuentasDisponibles = ['1000000001', '1000000002', '1000000003'];
  }

  // Permite inyectar la instancia de Socket.IO desde server.js
  setIo(ioInstance) {
    this.io = ioInstance;
  }

  // Iniciar la generación periódica de transacciones
  iniciar(intervaloMs = 1000) {
    if (this.activo) {
      return { activo: true, mensaje: 'El tráfico masivo ya se encuentra activo.' };
    }

    this.activo = true;
    this.intervalId = setInterval(async () => {
      await this.generarTransferenciaAleatoria();
    }, intervaloMs);

    // Notificar a todos los navegadores que el tráfico arrancó
    if (this.io) {
      this.io.emit('estado_trafico', { activo: true });
    }

    return { activo: true, mensaje: 'Simulación de tráfico masivo iniciada con éxito.' };
  }

  // Detener la generación periódica
  detener() {
    if (!this.activo) {
      return { activo: false, mensaje: 'El tráfico ya está detenido.' };
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.activo = false;

    // Notificar a todos los navegadores que el tráfico se detuvo
    if (this.io) {
      this.io.emit('estado_trafico', { activo: false });
    }

    return { activo: false, mensaje: 'Simulación de tráfico masivo detenida.' };
  }

  // Genera una transferencia con datos aleatorios
  async generarTransferenciaAleatoria() {
    // Seleccionar cuenta de origen al azar
    const origenIdx = Math.floor(Math.random() * this.cuentasDisponibles.length);
    const cuentaOrigen = this.cuentasDisponibles[origenIdx];
    
    // Seleccionar cuenta de destino que sea DIFERENTE a la de origen
    let destinoIdx = Math.floor(Math.random() * this.cuentasDisponibles.length);
    while (destinoIdx === origenIdx) {
      destinoIdx = Math.floor(Math.random() * this.cuentasDisponibles.length);
    }
    const cuentaDestino = this.cuentasDisponibles[destinoIdx];

    // Monto aleatorio entre $10.00 y $75.00
    const monto = (Math.random() * 65 + 10).toFixed(2);

    try {
      // Ejecutar el procedimiento almacenado
      const tx = await db.ejecutarTransferencia(
        cuentaOrigen,
        cuentaDestino,
        parseFloat(monto),
        'Tráfico Masivo Automático'
      );

      this.contador++;

      // Emitir la transacción en vivo a todos los dashboards conectados
      if (this.io) {
        this.io.emit('nuevo_movimiento', tx);
        this.io.emit('trafico_tick', { contador: this.contador });
      }
    } catch (err) {
      // RESILIENCIA: Si el servidor primario cae, la transacción fallará durante los ~3 segundos del corte.
      // Atrapamos el error para que Node.js no colapse y el bucle siga intentando con el nuevo primario.
      console.warn('⚠️ Pausa transaccional durante conmutación Always On:', err.message);
    }
  }
}

// Exportar una única instancia (Singleton)
module.exports = new TraficoService();
