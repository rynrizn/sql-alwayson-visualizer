/**
 * Controlador de la Vista Interactiva de la Demo (Client-Side)
 * Conecta el estado local y el simulador de clúster con los elementos visuales del DOM.
 */

document.addEventListener('DOMContentLoaded', () => {
  const estado = window.estadoBanco;
  const simulador = window.simuladorCluster;

  // Elementos del Encabezado
  const headerStatusBadge = document.getElementById('header-status-badge');
  const badgeText = document.getElementById('badge-text');
  const btnToggleTheme = document.getElementById('btn-toggle-theme');

  // Elementos de la Barra Lateral de Perfiles
  const listaClientes = document.getElementById('lista-clientes');
  const totalClientesBadge = document.getElementById('total-clientes');
  const inputBuscarPerfil = document.getElementById('input-buscar-perfil');
  const btnAddUser = document.getElementById('btn-add-user');
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');

  // Elementos del Chat / Consola Transaccional
  const currentAvatar = document.getElementById('current-profile-avatar');
  const currentName = document.getElementById('current-profile-name');
  const currentAccount = document.getElementById('current-profile-account');
  const currentBalance = document.getElementById('current-profile-balance');
  const chatMessages = document.getElementById('chat-messages');

  // Formulario de Envío
  const formTransferencia = document.getElementById('form-transferencia');
  const inputDestino = document.getElementById('input-destino');
  const inputMonto = document.getElementById('input-monto');
  const inputDescripcion = document.getElementById('input-descripcion');
  const btnEnviarDinero = document.getElementById('btn-enviar-dinero');

  // Elementos del Monitor de Clúster
  const serverNameDisplay = document.getElementById('server-name-display');
  const serverRoleDisplay = document.getElementById('server-role-display');
  const serverLatencyDisplay = document.getElementById('server-latency-display');
  const serverCheckTime = document.getElementById('server-check-time');
  const healthTag = document.getElementById('health-tag');
  const btnToggleMonitor = document.getElementById('btn-toggle-monitor');

  // Controles de Failover
  const btnProvocarCaida = document.getElementById('btn-provocar-caida');
  const btnRestablecerPrimario = document.getElementById('btn-restablecer-primario');

  // Controles de Tráfico
  const btnStartTraffic = document.getElementById('btn-start-traffic');
  const btnStopTraffic = document.getElementById('btn-stop-traffic');
  const trafficCounter = document.getElementById('traffic-counter');
  const liveTxTbody = document.getElementById('live-tx-tbody');

  // Botón de Reinicio
  const btnResetDemo = document.getElementById('btn-reset-demo');

  // Modales
  const modalUsuario = document.getElementById('user-modal');
  const formNewUser = document.getElementById('form-new-user');
  const newUserFeedback = document.getElementById('new-user-feedback');
  const modalQr = document.getElementById('qr-modal');
  const btnOpenQr = document.getElementById('btn-open-qr');

  // Controles Móviles
  const btnMobileSidebar = document.getElementById('btn-mobile-sidebar');
  const btnMobileMonitor = document.getElementById('btn-mobile-monitor');
  const layout = document.querySelector('.main-layout');
  const backdrop = document.getElementById('mobile-backdrop');

  /* ==========================================================================
     1. GESTIÓN DE TEMA (DARK FINTECH POR DEFECTO)
     ========================================================================== */
  const temaGuardado = localStorage.getItem('banco-ha-theme') || 'dark';
  aplicarTema(temaGuardado);

  btnToggleTheme?.addEventListener('click', () => {
    const esOscuro = document.body.classList.contains('theme-dark');
    aplicarTema(esOscuro ? 'light' : 'dark');
  });

  function aplicarTema(tema) {
    const oscuro = tema === 'dark';
    document.body.classList.toggle('theme-dark', oscuro);
    if (btnToggleTheme) {
      btnToggleTheme.setAttribute('aria-label', oscuro ? 'Activar modo claro' : 'Activar modo oscuro');
      btnToggleTheme.title = oscuro ? 'Activar modo claro' : 'Activar modo oscuro';
    }
    localStorage.setItem('banco-ha-theme', oscuro ? 'dark' : 'light');
  }

  /* ==========================================================================
     2. RENDERIZADO DE PERFILES Y CUENTAS
     ========================================================================== */
  function renderizarPerfiles() {
    if (!listaClientes) return;

    const busqueda = (inputBuscarPerfil?.value || '').trim().toLowerCase();
    const cuentas = estado.obtenerCuentas().filter(p => {
      const nombreCompleto = `${p.Nombre} ${p.Apellido}`.toLowerCase();
      const num = String(p.NumeroCuenta);
      return nombreCompleto.includes(busqueda) || num.includes(busqueda);
    });

    listaClientes.innerHTML = '';
    cuentas.forEach(perfil => {
      const item = document.createElement('li');
      const esActivo = perfil.NumeroCuenta === estado.cuentaActiva;
      item.className = `client-item ${esActivo ? 'active' : ''}`;
      item.dataset.cuenta = perfil.NumeroCuenta;
      item.title = `${perfil.Nombre} ${perfil.Apellido} · Cta: ${perfil.NumeroCuenta}`;

      const iniciales = `${perfil.Nombre[0] || ''}${perfil.Apellido[0] || ''}`.toUpperCase();

      item.innerHTML = `
        <div class="avatar">${iniciales}</div>
        <div class="client-info">
          <span class="client-name">${perfil.Nombre} ${perfil.Apellido}</span>
          <span class="account-number">Cta: ${perfil.NumeroCuenta}</span>
        </div>
        <span class="status-indicator" aria-label="Cuenta en línea"></span>
      `;

      item.addEventListener('click', () => {
        estado.seleccionarCuenta(perfil.NumeroCuenta);
        if (window.innerWidth <= 760) cerrarDrawersMoviles();
      });

      listaClientes.appendChild(item);
    });

    if (totalClientesBadge) {
      totalClientesBadge.textContent = estado.obtenerCuentas().length;
    }

    if (cuentas.length === 0) {
      listaClientes.innerHTML = '<li class="empty-state">No se encontraron cuentas que coincidan.</li>';
    }
  }

  inputBuscarPerfil?.addEventListener('input', renderizarPerfiles);

  /* ==========================================================================
     3. SELECCIÓN DE CUENTA EMISORA Y CHAT
     ========================================================================== */
  function actualizarVistaPerfilActivo(perfil) {
    if (!perfil) return;

    const iniciales = `${perfil.Nombre[0] || ''}${perfil.Apellido[0] || ''}`.toUpperCase();
    if (currentAvatar) currentAvatar.textContent = iniciales;
    if (currentName) currentName.textContent = `${perfil.Nombre} ${perfil.Apellido}`;
    if (currentAccount) currentAccount.textContent = `Cuenta: ${perfil.NumeroCuenta} · ${perfil.TipoCuenta}`;
    if (currentBalance) currentBalance.textContent = estado.formatearMoneda(perfil.Saldo);

    actualizarSelectorDestinos();
    cargarHistorialChat(perfil.NumeroCuenta);
    renderizarPerfiles();
    activarFormulario(true);
  }

  function actualizarSelectorDestinos() {
    if (!inputDestino) return;
    const cuentaActiva = estado.cuentaActiva;
    inputDestino.innerHTML = '<option value="">Selecciona cuenta destino</option>';

    estado.obtenerCuentas()
      .filter(p => p.NumeroCuenta !== cuentaActiva)
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.NumeroCuenta;
        opt.textContent = `${p.Nombre} ${p.Apellido} (Cta: ${p.NumeroCuenta})`;
        inputDestino.appendChild(opt);
      });
  }

  function cargarHistorialChat(numeroCuenta) {
    if (!chatMessages) return;
    const movimientos = estado.obtenerMovimientosCuenta(numeroCuenta);

    chatMessages.innerHTML = '';
    if (movimientos.length === 0) {
      chatMessages.innerHTML = `
        <div class="system-message">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Esta cuenta aún no registra movimientos. Realiza una transferencia para ver la réplica Always On.</span>
        </div>
      `;
      return;
    }

    // Renderizar orden cronológico (antiguas arriba, nuevas abajo)
    movimientos.slice().reverse().forEach(tx => {
      agregarBurbujaChat(tx, false);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function agregarBurbujaChat(tx, hacerScroll = true) {
    if (!chatMessages) return;

    // Retirar mensaje vacío si existe
    const msgVacio = chatMessages.querySelector('.system-message');
    if (msgVacio && chatMessages.children.length === 1) {
      chatMessages.innerHTML = '';
    }

    const esEnvio = tx.cuentaOrigen === estado.cuentaActiva;
    const burbuja = document.createElement('article');
    burbuja.className = `tx-bubble ${esEnvio ? 'tx-sent' : 'tx-received'}`;

    const fecha = tx.fecha ? new Date(tx.fecha).toLocaleTimeString() : 'Ahora';
    const serverBadge = tx.servidorProcesador ? `<span class="tx-server-tag">${tx.servidorProcesador}</span>` : '';

    burbuja.innerHTML = `
      <div class="tx-bubble-title">
        <span>${esEnvio ? 'Envío a' : 'Recepción de'} Cta: ${esEnvio ? tx.cuentaDestino : tx.cuentaOrigen}</span>
        <span class="tx-status-confirmed">✓ Confirmada</span>
      </div>
      <div class="tx-amount">${esEnvio ? '−' : '+'}${estado.formatearMoneda(tx.monto)}</div>
      <div class="tx-meta">
        <span>${tx.descripcion || 'Transferencia bancaria'}</span>
        <span>${serverBadge} ${fecha}</span>
      </div>
    `;

    chatMessages.appendChild(burbuja);
    if (hacerScroll) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  function activarFormulario(activo) {
    [inputDestino, inputMonto, inputDescripcion, btnEnviarDinero].forEach(el => {
      if (el) el.disabled = !activo;
    });
  }

  /* ==========================================================================
     4. FORMULARIO DE TRANSFERENCIA MANUAL
     ========================================================================== */
  formTransferencia?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cuentaOrigen = estado.cuentaActiva;
    const cuentaDestino = inputDestino.value;
    const monto = parseFloat(inputMonto.value);
    const descripcion = inputDescripcion.value.trim() || 'Transferencia inmediata';

    if (!cuentaOrigen || !cuentaDestino || isNaN(monto) || monto <= 0) {
      alert('Por favor selecciona una cuenta destino y un monto válido.');
      return;
    }

    const perfilOrigen = estado.obtenerCuenta(cuentaOrigen);
    if (perfilOrigen && perfilOrigen.Saldo < monto) {
      alert(`Saldo insuficiente. Tu saldo disponible es de ${estado.formatearMoneda(perfilOrigen.Saldo)}.`);
      return;
    }

    btnEnviarDinero.disabled = true;
    const textoOriginal = btnEnviarDinero.querySelector('span')?.textContent || 'ENVIAR DINERO';
    if (btnEnviarDinero.querySelector('span')) {
      btnEnviarDinero.querySelector('span').textContent = simulador.enFailover ? 'REINTENTANDO...' : 'PROCESANDO...';
    }

    try {
      const tx = await simulador.transferirConToleranciaAFallos({
        cuentaOrigen,
        cuentaDestino,
        monto,
        descripcion
      });

      inputMonto.value = '';
      inputDescripcion.value = 'Transferencia inmediata';

      // Actualizar vista de saldo y chat
      const perfilActualizado = estado.obtenerPerfilActivo();
      if (currentBalance && perfilActualizado) {
        currentBalance.textContent = estado.formatearMoneda(perfilActualizado.Saldo);
      }
    } catch (err) {
      console.error('Error al transferir:', err);
      alert(`No se pudo realizar la transferencia: ${err.message}`);
    } finally {
      btnEnviarDinero.disabled = false;
      if (btnEnviarDinero.querySelector('span')) {
        btnEnviarDinero.querySelector('span').textContent = textoOriginal;
      }
    }
  });

  /* ==========================================================================
     5. MONITOREO DEL CLÚSTER Y CONTROLADOR DE FAILOVER
     ========================================================================== */
  function actualizarVisualizacionServidor(datos) {
    if (serverCheckTime) {
      serverCheckTime.innerText = `Última comprobación: ${new Date().toLocaleTimeString()}`;
    }

    if (datos.enFailover) {
      // Estado de interrupción / conmutación durante los 2.5 segundos
      if (serverNameDisplay) serverNameDisplay.innerText = 'CONMUTANDO...';
      if (serverRoleDisplay) serverRoleDisplay.innerText = 'RECONECTANDO';
      if (serverLatencyDisplay) serverLatencyDisplay.innerText = `${datos.tiempoRespuestaMs} ms (Pico)`;

      if (healthTag) {
        healthTag.innerText = 'CONMUTACIÓN EN PROCESO';
        healthTag.className = 'tag failover';
      }

      if (headerStatusBadge) {
        headerStatusBadge.className = 'badge-pill failover';
      }
      if (badgeText) {
        badgeText.innerText = 'CONEXIÓN INTERRUMPIDA';
      }

      if (btnProvocarCaida) btnProvocarCaida.disabled = true;
      if (btnRestablecerPrimario) btnRestablecerPrimario.disabled = true;

    } else {
      // Estado operativo normal
      if (serverNameDisplay) serverNameDisplay.innerText = `${datos.servidor} (${datos.rol})`;
      if (serverRoleDisplay) serverRoleDisplay.innerText = datos.rol;
      if (serverLatencyDisplay) serverLatencyDisplay.innerText = `${datos.tiempoRespuestaMs} ms`;

      if (healthTag) {
        healthTag.innerText = 'SALUDABLE';
        healthTag.className = 'tag online';
      }

      if (headerStatusBadge) {
        headerStatusBadge.className = 'badge-pill online';
      }
      if (badgeText) {
        badgeText.innerText = `ACTIVO: ${datos.servidor}`;
      }

      // Habilitar o deshabilitar botones según el servidor primario activo
      if (btnProvocarCaida) {
        btnProvocarCaida.disabled = datos.servidor === 'LAPTOP-02';
      }
      if (btnRestablecerPrimario) {
        btnRestablecerPrimario.disabled = datos.servidor === 'LAPTOP-01';
      }
    }
  }

  // Suscribir a cambios del clúster
  simulador.on('estadoServidor', actualizarVisualizacionServidor);

  // Botón "Provocar Caída de Servidor"
  btnProvocarCaida?.addEventListener('click', () => {
    simulador.provocarCaida();
  });

  // Botón "Restablecer Servidor Primario"
  btnRestablecerPrimario?.addEventListener('click', () => {
    simulador.restablecerPrimario();
  });

  /* ==========================================================================
     6. SIMULADOR DE TRÁFICO MASIVO
     ========================================================================== */
  btnStartTraffic?.addEventListener('click', () => {
    simulador.iniciarTrafico();
  });

  btnStopTraffic?.addEventListener('click', () => {
    simulador.detenerTrafico();
  });

  simulador.on('estadoTrafico', (data) => {
    if (btnStartTraffic) btnStartTraffic.disabled = data.activo;
    if (btnStopTraffic) btnStopTraffic.disabled = !data.activo;
  });

  simulador.on('traficoTick', (data) => {
    if (trafficCounter) {
      trafficCounter.innerText = `Transacciones generadas: ${data.contador}`;
    }
  });

  /* ==========================================================================
     7. TABLA DE OPERACIONES EN VIVO
     ========================================================================== */
  function agregarFilaTransaccion(tx, alInicio = true) {
    if (!liveTxTbody) return;

    // Eliminar fila de estado vacío si existe
    const emptyRow = liveTxTbody.querySelector('.empty-state');
    if (emptyRow) liveTxTbody.innerHTML = '';

    const tr = document.createElement('tr');
    const id = tx.idTransaccion || 'TX';
    const monto = parseFloat(tx.monto || 0).toFixed(2);
    const servidor = tx.servidorProcesador || 'PRIMARY';

    tr.innerHTML = `
      <td>#${id}</td>
      <td>${tx.cuentaOrigen} ➔ ${tx.cuentaDestino}</td>
      <td><strong>$${monto}</strong></td>
      <td><span class="tag ${servidor === 'LAPTOP-02' ? 'failover' : 'online'}">${servidor}</span></td>
    `;

    if (alInicio) {
      liveTxTbody.insertBefore(tr, liveTxTbody.firstChild);
      if (liveTxTbody.children.length > 8) {
        liveTxTbody.removeChild(liveTxTbody.lastChild);
      }
    } else {
      liveTxTbody.appendChild(tr);
    }
  }

  function inicializarTablaOperaciones() {
    if (!liveTxTbody) return;
    const ultimas = estado.obtenerUltimosMovimientos(8);
    liveTxTbody.innerHTML = '';

    if (ultimas.length === 0) {
      liveTxTbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay operaciones registradas.</td></tr>';
      return;
    }

    ultimas.forEach(tx => agregarFilaTransaccion(tx, false));
  }

  // Escuchar toda nueva transacción registrada en el estado local
  estado.on('transaccion', (tx) => {
    // Si la transacción afecta la cuenta seleccionada, actualizar saldo y agregar burbuja
    if (tx.cuentaOrigen === estado.cuentaActiva || tx.cuentaDestino === estado.cuentaActiva) {
      const perfilActivo = estado.obtenerPerfilActivo();
      if (currentBalance && perfilActivo) {
        currentBalance.textContent = estado.formatearMoneda(perfilActivo.Saldo);
      }
      agregarBurbujaChat(tx, true);
    }
    // Agregar siempre a la tabla en vivo
    agregarFilaTransaccion(tx, true);
  });

  /* ==========================================================================
     8. GESTIÓN DE MODALES
     ========================================================================== */
  // Modal de Nuevo Contacto / Cuenta
  btnAddUser?.addEventListener('click', () => {
    if (newUserFeedback) newUserFeedback.textContent = '';
    formNewUser?.reset();
    document.getElementById('new-user-balance').value = '1000';
    modalUsuario?.showModal();
    document.getElementById('new-user-name')?.focus();
  });

  formNewUser?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('new-user-name').value.trim();
    const apellido = document.getElementById('new-user-lastname').value.trim();
    const ci = document.getElementById('new-user-ci').value.trim();
    const saldo = parseFloat(document.getElementById('new-user-balance').value) || 0;

    if (!nombre || !ci) {
      if (newUserFeedback) {
        newUserFeedback.textContent = 'Por favor completa el nombre y el CI.';
        newUserFeedback.style.color = 'var(--accent)';
      }
      return;
    }

    try {
      const nuevo = estado.crearContacto({ nombre, apellido, ci, saldoInicial: saldo });
      if (newUserFeedback) {
        newUserFeedback.textContent = '¡Cuenta de prueba creada con éxito!';
        newUserFeedback.style.color = 'var(--green)';
      }

      renderizarPerfiles();
      estado.seleccionarCuenta(nuevo.NumeroCuenta);

      setTimeout(() => {
        modalUsuario?.close();
      }, 700);
    } catch (err) {
      if (newUserFeedback) {
        newUserFeedback.textContent = `Error: ${err.message}`;
        newUserFeedback.style.color = 'var(--accent)';
      }
    }
  });

  // Modal QR
  btnOpenQr?.addEventListener('click', () => {
    const inputLink = document.getElementById('qr-link-input');
    const openLink = document.getElementById('qr-open-link');
    const url = window.location.href;
    if (inputLink) inputLink.value = url;
    if (openLink) openLink.href = url;
    modalQr?.showModal();
  });

  // Botón Copiar QR
  document.getElementById('btn-copy-qr-link')?.addEventListener('click', async () => {
    const inputLink = document.getElementById('qr-link-input');
    const copyText = document.getElementById('copy-qr-text');
    const enlace = inputLink?.value || window.location.href;

    try {
      await navigator.clipboard.writeText(enlace);
      if (copyText) {
        copyText.textContent = '¡Copiado!';
        setTimeout(() => { copyText.textContent = 'Copiar'; }, 2000);
      }
    } catch (e) {
      inputLink?.select();
      document.execCommand('copy');
    }
  });

  // Cierres de modales
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.dataset.closeModal;
      document.getElementById(modalId)?.close();
    });
  });

  modalUsuario?.addEventListener('click', (e) => {
    if (e.target === modalUsuario) modalUsuario.close();
  });
  modalQr?.addEventListener('click', (e) => {
    if (e.target === modalQr) modalQr.close();
  });

  /* ==========================================================================
     9. BOTÓN RESTABLECER DATOS DE DEMOSTRACIÓN
     ========================================================================== */
  btnResetDemo?.addEventListener('click', () => {
    const seguro = confirm('¿Deseas restablecer los saldos, cuentas y transacciones de prueba a sus valores iniciales?');
    if (seguro) {
      simulador.detenerTrafico();
      simulador.restablecerPrimario();
      estado.restablecerDatos();
      inicializarTablaOperaciones();
      alert('Demostración restablecida a valores iniciales de fábrica.');
    }
  });

  // Suscribirse al evento reset del estado
  estado.on('reset', () => {
    renderizarPerfiles();
    actualizarVistaPerfilActivo(estado.obtenerPerfilActivo());
    inicializarTablaOperaciones();
  });

  estado.on('perfilSeleccionado', (perfil) => {
    actualizarVistaPerfilActivo(perfil);
  });

  /* ==========================================================================
     10. CONTROLADORES MÓVILES (DRAWERS)
     ========================================================================== */
  function cerrarDrawersMoviles() {
    layout?.classList.remove('mobile-sidebar-open', 'mobile-monitor-open');
    backdrop?.classList.remove('active');
  }

  function alternarSidebar() {
    if (window.innerWidth <= 760) {
      const abierto = layout.classList.contains('mobile-sidebar-open');
      cerrarDrawersMoviles();
      if (!abierto) {
        layout.classList.add('mobile-sidebar-open');
        backdrop?.classList.add('active');
      }
    } else {
      const contraido = layout.classList.toggle('sidebar-collapsed');
      btnToggleSidebar?.setAttribute('aria-pressed', String(contraido));
    }
  }

  function alternarMonitor() {
    if (window.innerWidth <= 760) {
      const abierto = layout.classList.contains('mobile-monitor-open');
      cerrarDrawersMoviles();
      if (!abierto) {
        layout.classList.add('mobile-monitor-open');
        backdrop?.classList.add('active');
      }
    } else {
      const expandido = layout.classList.toggle('monitor-expanded');
      layout.classList.toggle('sidebar-collapsed', expandido);
      btnToggleMonitor?.setAttribute('aria-pressed', String(expandido));
    }
  }

  btnToggleSidebar?.addEventListener('click', alternarSidebar);
  btnMobileSidebar?.addEventListener('click', alternarSidebar);
  btnToggleMonitor?.addEventListener('click', alternarMonitor);
  btnMobileMonitor?.addEventListener('click', alternarMonitor);
  backdrop?.addEventListener('click', cerrarDrawersMoviles);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 760) cerrarDrawersMoviles();
  });

  /* ==========================================================================
     11. INICIALIZACIÓN INMEDIATA
     ========================================================================== */
  renderizarPerfiles();
  const inicial = estado.obtenerPerfilActivo();
  if (inicial) {
    actualizarVistaPerfilActivo(inicial);
  }
  inicializarTablaOperaciones();
  simulador.notificarEstadoServidor();
});
