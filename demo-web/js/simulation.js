/**
 * Módulo de Simulación de Alta Disponibilidad y Tráfico (Client-Side)
 * Controla el Failover entre LAPTOP-01 y LAPTOP-02, simula desconexión de 2.5s y genera tráfico continuo con latencias realistas.
 */

class SimuladorCluster {
  constructor(estadoBanco) {
    this.estadoBanco = estadoBanco;

    // Estado del Clúster
    this.servidorActivo = 'LAPTOP-01';
    this.rol = 'PRIMARY';
    this.estado = 'ONLINE'; // 'ONLINE' | 'FAILOVER' | 'RESTORING'
    this.mensajeEstado = 'SISTEMA OPERATIVO';
    this.latenciaActual = 45;
    this.enFailover = false;
    this.tiempoTransicionMs = 2500; // 2.5 segundos requeridos

    // Cola de transacciones demoradas durante el failover
    this.colaPendienteFailover = [];

    // Simulador de Tráfico
    this.traficoActivo = false;
    this.intervaloTraficoId = null;
    this.contadorTrafico = 0;
    this.intervaloMs = 800; // 800 ms según especificación

    // Suscripciones a eventos
    this.listeners = {
      estadoServidor: [],
      traficoTick: [],
      estadoTrafico: []
    };

    // Actualización periódica suave de latencia (cada 3 segundos en reposo)
    this.iniciarVariacionLatencia();
  }

  /** Genera una latencia creíble según el estado actual */
  calcularLatencia() {
    if (this.enFailover) {
      // Picos de latencia durante la conmutación
      return Math.floor(Math.random() * (2200 - 850 + 1)) + 850;
    }
    // Rango normal creíble: 35 ms a 95 ms
    return Math.floor(Math.random() * (95 - 35 + 1)) + 35;
  }

  iniciarVariacionLatencia() {
    setInterval(() => {
      if (!this.enFailover && !this.traficoActivo) {
        this.latenciaActual = this.calcularLatencia();
        this.notificarEstadoServidor();
      }
    }, 3500);
  }

  /**
   * PROVOCAR CAÍDA DE SERVIDOR
   * Pasa a estado "Conexión Interrumpida / Conmutando..." por 2.5 segundos.
   * Durante ese tiempo, cualquier transacción en curso simula reintentos.
   * Al cumplirse los 2.5s, asume LAPTOP-02 (PRIMARY) y confirma las pendientes.
   */
  provocarCaida() {
    if (this.enFailover) {
      console.warn('Ya existe una conmutación en proceso.');
      return;
    }

    if (this.servidorActivo === 'LAPTOP-02') {
      console.warn('LAPTOP-02 ya se encuentra en rol PRIMARY.');
      return;
    }

    this.enFailover = true;
    this.estado = 'FAILOVER';
    this.mensajeEstado = 'Conexión Interrumpida / Conmutando...';
    this.latenciaActual = this.calcularLatencia();

    this.notificarEstadoServidor();

    // Temporizador de 2.5 segundos para la conmutación
    setTimeout(() => {
      this.servidorActivo = 'LAPTOP-02';
      this.rol = 'PRIMARY';
      this.estado = 'ONLINE';
      this.mensajeEstado = 'SISTEMA OPERATIVO';
      this.enFailover = false;
      this.latenciaActual = this.calcularLatencia();

      // Procesar cualquier transacción que haya quedado en cola durante la caída
      this.procesarColaPendiente();

      this.notificarEstadoServidor();
    }, this.tiempoTransicionMs);
  }

  /**
   * RESTABLECER SERVIDOR PRIMARIO
   * Vuelve el clúster a LAPTOP-01 como servidor principal.
   */
  restablecerPrimario() {
    if (this.enFailover) {
      console.warn('Espera a que finalice la conmutación activa.');
      return;
    }

    this.servidorActivo = 'LAPTOP-01';
    this.rol = 'PRIMARY';
    this.estado = 'ONLINE';
    this.mensajeEstado = 'SISTEMA OPERATIVO';
    this.latenciaActual = this.calcularLatencia();

    this.notificarEstadoServidor();
  }

  /**
   * Ejecuta una transferencia considerando el estado del clúster.
   * Si hay failover en curso, espera la reconexión y luego confirma.
   */
  async transferirConToleranciaAFallos({ cuentaOrigen, cuentaDestino, monto, descripcion }) {
    const latencia = this.calcularLatencia();

    if (this.enFailover) {
      // Retener la transacción hasta que LAPTOP-02 tome el control
      return new Promise((resolve, reject) => {
        this.colaPendienteFailover.push({
          datos: { cuentaOrigen, cuentaDestino, monto, descripcion },
          resolve,
          reject
        });
      });
    }

    // Ejecución directa en estado normal
    try {
      const tx = this.estadoBanco.ejecutarTransferencia({
        cuentaOrigen,
        cuentaDestino,
        monto,
        descripcion,
        servidorProcesador: this.servidorActivo,
        latenciaMs: latencia
      });
      return tx;
    } catch (err) {
      throw err;
    }
  }

  /** Vacía la cola acumulada durante el failover de 2.5 segundos */
  procesarColaPendiente() {
    while (this.colaPendienteFailover.length > 0) {
      const item = this.colaPendienteFailover.shift();
      try {
        const tx = this.estadoBanco.ejecutarTransferencia({
          ...item.datos,
          servidorProcesador: this.servidorActivo,
          latenciaMs: Math.floor(Math.random() * (120 - 70 + 1)) + 70 // latencia de estabilización
        });
        item.resolve(tx);
      } catch (error) {
        item.reject(error);
      }
    }
  }

  /**
   * SIMULADOR DE TRÁFICO MASIVO
   * Genera transacciones automáticas cada 800 ms entre cuentas aleatorias.
   */
  iniciarTrafico() {
    if (this.traficoActivo) return;

    this.traficoActivo = true;
    this.notificarEstadoTrafico();

    this.intervaloTraficoId = setInterval(async () => {
      await this.ejecutarTickTrafico();
    }, this.intervaloMs);
  }

  detenerTrafico() {
    if (!this.traficoActivo) return;

    clearInterval(this.intervaloTraficoId);
    this.intervaloTraficoId = null;
    this.traficoActivo = false;
    this.notificarEstadoTrafico();
  }

  async ejecutarTickTrafico() {
    const cuentas = this.estadoBanco.obtenerCuentas();
    if (cuentas.length < 2) return;

    // Seleccionar 2 cuentas aleatorias distintas
    const indiceOrigen = Math.floor(Math.random() * cuentas.length);
    let indiceDestino = Math.floor(Math.random() * cuentas.length);
    while (indiceDestino === indiceOrigen) {
      indiceDestino = Math.floor(Math.random() * cuentas.length);
    }

    const ctaOrigen = cuentas[indiceOrigen];
    const ctaDestino = cuentas[indiceDestino];

    // Monto aleatorio entre $15 y $120
    const monto = Math.floor(Math.random() * (120 - 15 + 1)) + 15;

    // Si la cuenta origen tiene poco saldo, fondearla automáticamente para permitir tráfico continuo
    if (ctaOrigen.Saldo < monto) {
      ctaOrigen.Saldo += 2000;
      this.estadoBanco.guardarCuentas();
    }

    const conceptos = [
      'Transferencia automática',
      'Pago móvil QR',
      'Abono interbancario',
      'Pago de servicio',
      'Compra POS comercial',
      'Liquidación transaccional'
    ];
    const concepto = conceptos[Math.floor(Math.random() * conceptos.length)];

    try {
      await this.transferirConToleranciaAFallos({
        cuentaOrigen: ctaOrigen.NumeroCuenta,
        cuentaDestino: ctaDestino.NumeroCuenta,
        monto,
        descripcion: concepto
      });

      this.contadorTrafico++;
      this.notificarTraficoTick();
    } catch (e) {
      console.warn('Tick de tráfico retenido o con error:', e.message);
    }
  }

  /** Notificadores a la interfaz */
  notificarEstadoServidor() {
    const datos = {
      servidor: this.servidorActivo,
      rol: this.rol,
      online: this.estado === 'ONLINE',
      estado: this.estado,
      mensaje: this.mensajeEstado,
      tiempoRespuestaMs: this.latenciaActual,
      enFailover: this.enFailover
    };

    if (this.listeners.estadoServidor) {
      this.listeners.estadoServidor.forEach(cb => cb(datos));
    }
  }

  notificarTraficoTick() {
    if (this.listeners.traficoTick) {
      this.listeners.traficoTick.forEach(cb => cb({ contador: this.contadorTrafico }));
    }
  }

  notificarEstadoTrafico() {
    if (this.listeners.estadoTrafico) {
      this.listeners.estadoTrafico.forEach(cb => cb({ activo: this.traficoActivo }));
    }
  }

  on(evento, callback) {
    if (this.listeners[evento]) {
      this.listeners[evento].push(callback);
    }
  }
}

// Instancia global disponible en window
window.simuladorCluster = new SimuladorCluster(window.estadoBanco);
