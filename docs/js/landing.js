/**
 * Controlador de la Landing Informativa de Alta Disponibilidad
 * Gestiona navegación suave, selector interactivo del paso a paso de Failover y teaser visual del clúster.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. GESTIÓN DE TEMA
  const btnToggleTheme = document.getElementById('btn-toggle-theme');
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

  // 2. NAVEGACIÓN MÓVIL (MENU HAMBURGUESA)
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  btnMenuToggle?.addEventListener('click', () => {
    const abierto = navLinks?.classList.toggle('open');
    btnMenuToggle.setAttribute('aria-expanded', String(abierto));
  });

  // Cerrar menú al hacer clic en un enlace
  navLinks?.querySelectorAll('a').forEach(enlace => {
    enlace.addEventListener('click', () => {
      navLinks.classList.remove('open');
      btnMenuToggle?.setAttribute('aria-expanded', 'false');
    });
  });

  // 3. INTERACTIVIDAD DE LA GUÍA DE FAILOVER (PASO A PASO)
  const steps = document.querySelectorAll('.failover-step-card');
  const previewBox = document.getElementById('failover-visual-stage');

  const estadosVisuales = {
    1: {
      titulo: 'Fase 1: Operación Normal y Replicación Síncrona',
      servidor1: { rol: 'PRIMARY (ACTIVO)', clase: 'node-online', status: 'En línea · Recibe I/O' },
      servidor2: { rol: 'SECONDARY (RÉPLICA)', clase: 'node-sync', status: 'Sincronizado · RPO = 0' },
      listener: { status: 'Enrutando tráfico a LAPTOP-01' },
      descripcion: 'El Listener virtual recibe las transferencias del cliente y las entrega a LAPTOP-01. Los bloques de transacciones se endurecen en el Transaction Log de LAPTOP-02 antes de confirmar el COMMIT al cliente.'
    },
    2: {
      titulo: 'Fase 2: Caída Intempestiva de Servidor Primario',
      servidor1: { rol: 'DESCONECTADO', clase: 'node-down', status: 'Sin latidos (Heartbeat Timeout)' },
      servidor2: { rol: 'SECONDARY', clase: 'node-warning', status: 'Detectando pérdida de quórum' },
      listener: { status: 'Pausa de I/O · En espera de conmutación' },
      descripcion: 'LAPTOP-01 sufre una desconexión o fallo crítico de hardware. El servicio WSFC (Windows Server Failover Cluster) detecta la ausencia de señales de vida (Heartbeat) en menos de 2.5 segundos.'
    },
    3: {
      titulo: 'Fase 3: Conmutación Automática por Quórum',
      servidor1: { rol: 'APAGADO / INACCESIBLE', clase: 'node-down', status: 'Aislado de la red' },
      servidor2: { rol: 'PROMOVIENDO A PRIMARY', clase: 'node-failover', status: 'Asumiendo rol Primario' },
      listener: { status: 'Reasignando IP virtual a LAPTOP-02' },
      descripcion: 'Con el voto del Testigo (Witness), el Quórum autoriza a LAPTOP-02 a asumir el rol PRIMARY. El Listener virtual actualiza la tabla ARP/DNS y reanuda el enrutamiento de transacciones.'
    },
    4: {
      titulo: 'Fase 4: Continuidad Operativa con Cero Pérdida',
      servidor1: { rol: 'INACTIVO / REPARACIÓN', clase: 'node-down', status: 'Listo para resincronización' },
      servidor2: { rol: 'PRIMARY (ACTIVO)', clase: 'node-online', status: 'Procesando 100% de operaciones' },
      listener: { status: 'Enrutando tráfico a LAPTOP-02' },
      descripcion: 'La aplicación bancaria continúa operando de forma transparente. Ningún saldo se corrompe ni se pierden depósitos, garantizando RTO menor a 5s y RPO = 0.'
    }
  };

  steps.forEach(step => {
    step.addEventListener('click', () => {
      steps.forEach(s => s.classList.remove('active'));
      step.classList.add('active');

      const pasoNumero = step.dataset.step;
      actualizarEscenarioVisual(pasoNumero);
    });
  });

  function actualizarEscenarioVisual(paso) {
    const data = estadosVisuales[paso];
    if (!data || !previewBox) return;

    previewBox.innerHTML = `
      <div class="stage-header">
        <span class="stage-badge">PASO 0${paso}</span>
        <h4>${data.titulo}</h4>
      </div>
      <div class="stage-nodes-grid">
        <div class="stage-node ${data.servidor1.clase}">
          <div class="node-icon">💻</div>
          <div class="node-title">LAPTOP-01</div>
          <div class="node-role">${data.servidor1.rol}</div>
          <div class="node-status">${data.servidor1.status}</div>
        </div>

        <div class="stage-center-bridge">
          <div class="listener-tag">
            <span class="pulse-dot"></span>
            <span>LISTENER VIRTUAL</span>
          </div>
          <div class="bridge-status">${data.listener.status}</div>
          <div class="bridge-flow-arrow">⇄</div>
        </div>

        <div class="stage-node ${data.servidor2.clase}">
          <div class="node-icon">💻</div>
          <div class="node-title">LAPTOP-02</div>
          <div class="node-role">${data.servidor2.rol}</div>
          <div class="node-status">${data.servidor2.status}</div>
        </div>
      </div>
      <p class="stage-description">${data.descripcion}</p>
    `;
  }

  // Inicializar paso 1 por defecto
  actualizarEscenarioVisual(1);

  // 4. ANIMACIÓN TEASER DEL HERO
  const heroLatency = document.getElementById('hero-live-latency');
  if (heroLatency) {
    setInterval(() => {
      const lat = Math.floor(Math.random() * (65 - 38 + 1)) + 38;
      heroLatency.textContent = `${lat} ms`;
    }, 2800);
  }
});
