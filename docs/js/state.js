/**
 * Módulo de Estado y Persistencia Local (Client-Side)
 * Gestiona cuentas bancarias, transacciones históricas y estado del clúster con persistencia en localStorage.
 */

const STORAGE_KEYS = {
  CUENTAS: 'banco_ha_cuentas',
  TRANSACCIONES: 'banco_ha_transacciones',
  SERVIDOR: 'banco_ha_servidor',
  ESTADISTICAS: 'banco_ha_stats'
};

// Cuentas iniciales por defecto
const CUENTAS_INICIALES = [
  {
    NumeroCuenta: '10001',
    Nombre: 'Carlos',
    Apellido: 'Gómez',
    CI: '4839201',
    Saldo: 5450.00,
    TipoCuenta: 'Caja de Ahorro'
  },
  {
    NumeroCuenta: '10002',
    Nombre: 'María',
    Apellido: 'Rojas',
    CI: '5920184',
    Saldo: 8200.50,
    TipoCuenta: 'Cuenta Corriente'
  },
  {
    NumeroCuenta: '10003',
    Nombre: 'Juan',
    Apellido: 'Delgado',
    CI: '6740192',
    Saldo: 3100.00,
    TipoCuenta: 'Caja de Ahorro'
  },
  {
    NumeroCuenta: '10004',
    Nombre: 'Ana',
    Apellido: 'Silva',
    CI: '7102948',
    Saldo: 6750.00,
    TipoCuenta: 'Caja de Ahorro'
  }
];

// Transacciones iniciales para ambientar la demostración
const TRANSACCIONES_INICIALES = [
  {
    idTransaccion: 101,
    cuentaOrigen: '10001',
    cuentaDestino: '10002',
    monto: 250.00,
    descripcion: 'Pago de servicios compartidos',
    servidorProcesador: 'LAPTOP-01',
    fecha: new Date(Date.now() - 3600000 * 2).toISOString(),
    latenciaMs: 48
  },
  {
    idTransaccion: 102,
    cuentaOrigen: '10002',
    cuentaDestino: '10003',
    monto: 120.00,
    descripcion: 'Transferencia inmediata',
    servidorProcesador: 'LAPTOP-01',
    fecha: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    latenciaMs: 52
  },
  {
    idTransaccion: 103,
    cuentaOrigen: '10003',
    cuentaDestino: '10004',
    monto: 85.00,
    descripcion: 'Almuerzo equipo',
    servidorProcesador: 'LAPTOP-01',
    fecha: new Date(Date.now() - 3600000 * 0.8).toISOString(),
    latenciaMs: 44
  },
  {
    idTransaccion: 104,
    cuentaOrigen: '10004',
    cuentaDestino: '10001',
    monto: 300.00,
    descripcion: 'Reembolso de gastos',
    servidorProcesador: 'LAPTOP-01',
    fecha: new Date(Date.now() - 3600000 * 0.3).toISOString(),
    latenciaMs: 58
  }
];

class EstadoBancoLocal {
  constructor() {
    this.cuentas = [];
    this.transacciones = [];
    this.cuentaActiva = null;
    this.contadorTx = 105;
    this.listeners = {
      transaccion: [],
      cuentas: [],
      perfilSeleccionado: [],
      reset: []
    };

    this.cargarDatos();
  }

  /** Carga los datos desde localStorage o inicializa con los valores por defecto */
  cargarDatos() {
    try {
      const cuentasGuardadas = localStorage.getItem(STORAGE_KEYS.CUENTAS);
      if (cuentasGuardadas) {
        this.cuentas = JSON.parse(cuentasGuardadas);
      } else {
        this.cuentas = JSON.parse(JSON.stringify(CUENTAS_INICIALES));
        this.guardarCuentas();
      }

      const txGuardadas = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
      if (txGuardadas) {
        this.transacciones = JSON.parse(txGuardadas);
      } else {
        this.transacciones = JSON.parse(JSON.stringify(TRANSACCIONES_INICIALES));
        this.guardarTransacciones();
      }

      if (this.transacciones.length > 0) {
        const maxId = Math.max(...this.transacciones.map(t => Number(t.idTransaccion || 0)));
        this.contadorTx = Math.max(this.contadorTx, maxId + 1);
      }

      // Por defecto la primera cuenta queda activa
      if (this.cuentas.length > 0 && !this.cuentaActiva) {
        this.cuentaActiva = this.cuentas[0].NumeroCuenta;
      }
    } catch (e) {
      console.warn('Error al leer de localStorage, usando memoria temporal:', e);
      this.cuentas = JSON.parse(JSON.stringify(CUENTAS_INICIALES));
      this.transacciones = JSON.parse(JSON.stringify(TRANSACCIONES_INICIALES));
      this.cuentaActiva = this.cuentas[0]?.NumeroCuenta || null;
    }
  }

  guardarCuentas() {
    try {
      localStorage.setItem(STORAGE_KEYS.CUENTAS, JSON.stringify(this.cuentas));
    } catch (e) {
      console.warn('No se pudo persistir cuentas en localStorage:', e);
    }
    this.emitir('cuentas', this.cuentas);
  }

  guardarTransacciones() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACCIONES, JSON.stringify(this.transacciones));
    } catch (e) {
      console.warn('No se pudo persistir transacciones en localStorage:', e);
    }
  }

  /** Restablece la demo al estado inicial de fábrica */
  restablecerDatos() {
    this.cuentas = JSON.parse(JSON.stringify(CUENTAS_INICIALES));
    this.transacciones = JSON.parse(JSON.stringify(TRANSACCIONES_INICIALES));
    this.contadorTx = 105;
    this.cuentaActiva = this.cuentas[0].NumeroCuenta;

    this.guardarCuentas();
    this.guardarTransacciones();
    this.emitir('reset');
    this.emitir('cuentas', this.cuentas);
    this.emitir('perfilSeleccionado', this.obtenerPerfilActivo());
  }

  /** Obtiene la lista completa de cuentas activas */
  obtenerCuentas() {
    return this.cuentas;
  }

  /** Obtiene un perfil por su número de cuenta */
  obtenerCuenta(numeroCuenta) {
    return this.cuentas.find(c => c.NumeroCuenta === numeroCuenta) || null;
  }

  /** Obtiene el objeto de perfil actualmente seleccionado */
  obtenerPerfilActivo() {
    if (!this.cuentaActiva) return null;
    return this.obtenerCuenta(this.cuentaActiva);
  }

  /** Establece la cuenta emisora activa */
  seleccionarCuenta(numeroCuenta) {
    const perfil = this.obtenerCuenta(numeroCuenta);
    if (perfil) {
      this.cuentaActiva = numeroCuenta;
      this.emitir('perfilSeleccionado', perfil);
    }
    return perfil;
  }

  /** Registra un nuevo contacto de prueba con su cuenta asignada */
  crearContacto({ nombre, apellido, ci, saldoInicial }) {
    const siguienteId = 10000 + this.cuentas.length + 1;
    const nuevoPerfil = {
      NumeroCuenta: String(siguienteId),
      Nombre: nombre.trim(),
      Apellido: (apellido || '').trim(),
      CI: String(ci).trim(),
      Saldo: Math.max(0, parseFloat(saldoInicial) || 0),
      TipoCuenta: 'Caja de Ahorro'
    };

    this.cuentas.push(nuevoPerfil);
    this.guardarCuentas();
    return nuevoPerfil;
  }

  /** Registra una transferencia bancaria atómica (ACID simulado en memoria) */
  ejecutarTransferencia({ cuentaOrigen, cuentaDestino, monto, descripcion, servidorProcesador, latenciaMs }) {
    const origen = this.obtenerCuenta(cuentaOrigen);
    const destino = this.obtenerCuenta(cuentaDestino);

    if (!origen) {
      throw new Error(`La cuenta origen ${cuentaOrigen} no existe.`);
    }
    if (!destino) {
      throw new Error(`La cuenta destino ${cuentaDestino} no existe.`);
    }
    if (cuentaOrigen === cuentaDestino) {
      throw new Error('No es posible transferir a la misma cuenta.');
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      throw new Error('El monto a transferir debe ser mayor a cero.');
    }

    if (origen.Saldo < montoNum) {
      throw new Error(`Saldo insuficiente en cuenta origen (Disponible: ${this.formatearMoneda(origen.Saldo)}).`);
    }

    // Efectuar débito y crédito atómico
    origen.Saldo = parseFloat((origen.Saldo - montoNum).toFixed(2));
    destino.Saldo = parseFloat((destino.Saldo + montoNum).toFixed(2));

    const nuevaTransaccion = {
      idTransaccion: this.contadorTx++,
      cuentaOrigen,
      cuentaDestino,
      monto: montoNum,
      descripcion: (descripcion || 'Transferencia inmediata').trim(),
      servidorProcesador: servidorProcesador || 'LAPTOP-01',
      fecha: new Date().toISOString(),
      latenciaMs: latenciaMs || 50,
      nuevoSaldoOrigen: origen.Saldo,
      nuevoSaldoDestino: destino.Saldo
    };

    // Guardar al inicio del historial
    this.transacciones.unshift(nuevaTransaccion);

    // Persistir
    this.guardarCuentas();
    this.guardarTransacciones();

    // Notificar eventos a suscriptores
    this.emitir('transaccion', nuevaTransaccion);
    this.emitir('cuentas', this.cuentas);

    return nuevaTransaccion;
  }

  /** Obtiene las transacciones donde participa una cuenta específica */
  obtenerMovimientosCuenta(numeroCuenta, limite = 30) {
    return this.transacciones
      .filter(tx => tx.cuentaOrigen === numeroCuenta || tx.cuentaDestino === numeroCuenta)
      .slice(0, limite);
  }

  /** Obtiene las últimas operaciones de todo el sistema */
  obtenerUltimosMovimientos(limite = 10) {
    return this.transacciones.slice(0, limite);
  }

  /** Sistema de suscripción a eventos */
  on(evento, callback) {
    if (this.listeners[evento]) {
      this.listeners[evento].push(callback);
    }
  }

  emitir(evento, datos) {
    if (this.listeners[evento]) {
      this.listeners[evento].forEach(cb => {
        try { cb(datos); } catch (e) { console.error(`Error en listener de ${evento}:`, e); }
      });
    }
  }

  /** Utilidad de formateo de moneda */
  formatearMoneda(monto) {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(monto || 0);
  }
}

// Instancia global disponible en window
window.estadoBanco = new EstadoBancoLocal();
