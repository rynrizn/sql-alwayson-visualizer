# 📖 Manual de Usuario y Guía de Uso — Banco HA Web

Bienvenido a la **Guía de Uso de la Plataforma Web Banco HA**, una aplicación interactiva diseñada para demostrar y validar en tiempo real el comportamiento transaccional y la conmutación por error (*Failover*) de un clúster de **Alta Disponibilidad con SQL Server Always On**.

Esta guía está dirigida a usuarios, evaluadores y administradores que deseen operar la interfaz, realizar transferencias bancarias y ejecutar demostraciones de alta disponibilidad sin necesidad de modificar el código fuente.

---

## 🚀 1. Acceso e Inicio Rápido

1. **Iniciar el servidor local (si aún no está activo):**
   ```bash
   pnpm dev
   ```
2. **Abrir en tu navegador:**
   * En tu equipo local: [http://localhost:3000](http://localhost:3000)
   * Desde otro dispositivo en la misma red local (Wi-Fi/LAN): `http://<IP-DE-TU-PC>:3000`

---

## 🖥️ 2. Estructura de la Interfaz

La pantalla principal se organiza en **tres columnas inteligentes** con diseño adaptable (*responsive*) y controles de visualización:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│  🏦 Banco de Crédito HA       [🟢 SISTEMA OPERATIVO]    [📱 QR]  [◐ Modo Oscuro] │
├─────────────────────┬───────────────────────────────┬────────────────────────────┤
│  👥 PERFILES        │  💬 CHAT TRANSACCIONAL        │  📊 MONITOREO CLÚSTER      │
│  - Buscador         │  - Saldo disponible           │  - Servidor Activo (PC)    │
│  - Lista de cuentas │  - Historial de envíos/recibos│  - Simulador de Tráfico    │
│  - Botón [+] Nuevo  │  - Formulario Enviar Dinero   │  - Tabla de TX en vivo     │
└─────────────────────┴───────────────────────────────┴────────────────────────────┘
```

---

## 👥 3. Panel de Perfiles (Columna Izquierda)

En este panel se visualizan los clientes registrados en la base de datos SQL Server (`vw_CuentasClientes`).

1. **Selección de Cuenta Activa:**
   * Haz clic sobre cualquier cliente para seleccionarlo como la **cuenta emisora (origen)**.
   * La cabecera central se actualizará instantáneamente mostrando el nombre del cliente, número de cuenta y su saldo actual disponible.
2. **Búsqueda Dinámica:**
   * Escribe en el campo superior para filtrar clientes en tiempo real por nombre, apellido o número de cuenta bancaria.
3. **Preparar Nuevo Perfil (`+`):**
   * El botón `+` en la cabecera abre un formulario modal para ingresar datos de un nuevo cliente (Nombre, Apellido, CI, Saldo inicial).
   * *Nota de seguridad:* Este formulario opera en **modo visual protegido**; valida los datos pero no realiza escrituras directas en la base de datos hasta que exista un proceso de registro administrativo aprobado.
4. **Contraer / Expandir (`‹`):**
   * En pantallas de escritorio, permite ocultar la lista y reducir el panel a una franja de avatares para dar más espacio a la consola de transferencias.

---

## 💸 4. Consola de Transferencias (Columna Central)

El área central funciona como un centro transaccional en tiempo real con historial aislado por cliente.

1. **Historial Aislado:**
   * Cada perfil muestra **únicamente sus propios movimientos**:
     * **Burbujas Rojas (Salidas):** Envíos realizados desde la cuenta activa hacia otro cliente.
     * **Burbujas Verdes (Entradas):** Dinero recibido desde otras cuentas hacia el perfil activo.
   * Cada registro indica el monto en Bolivianos (BOB), el concepto de la transferencia, el sello de tiempo y la confirmación transaccional.
2. **Envío de Fondos:**
   * **Destino:** En la barra inferior, selecciona la cuenta destinataria. El selector excluye automáticamente la cuenta activa para evitar envíos a uno mismo.
   * **Monto:** Ingresa una cantidad mayor a 0.
   * **Concepto:** Detalla una nota opcional (por defecto: *"Transferencia inmediata"*).
   * Presiona **"ENVIAR DINERO"**:
     * La operación ejecuta el Stored Procedure `sp_TransferirDinero` con propiedades ACID completas en SQL Server.
     * El saldo disponible se actualiza automáticamente.
     * La burbuja del nuevo movimiento se añade de inmediato al historial y a la tabla de auditoría en vivo.

---

## 📊 5. Panel de Monitoreo Always On (Columna Derecha)

Este panel refleja en tiempo real la salud de la infraestructura distribuida de base de datos.

### 5.1 Tarjeta de Servidor Activo (Listener)
* **Nombre del Servidor:** Muestra qué réplica física (ej. `LAPTOP-01` o `LAPTOP-02`) está respondiendo consultas a través del Listener de Always On mediante la instrucción `SELECT @@SERVERNAME`.
* **Rol:** Indica el rol de la réplica conectada (`PRIMARY`).
* **Latencia:** Muestra el tiempo de respuesta en milisegundos medido en cada ciclo de comprobación (cada 1.5 segundos).
* **Estado:** Etiqueta en verde (*SALUDABLE*) durante operación normal o en amarillo (*FAILOVER ACTIVO*) durante una contingencia.

### 5.2 Simulador de Carga Transaccional
* **Botón "SIMULAR TRÁFICO":** Inicia un proceso en segundo plano que genera transferencias aleatorias automáticas continuas entre las cuentas de la base de datos.
* **Contador de Transacciones:** Registra el volumen acumulado de operaciones ejecutadas con éxito.
* **Botón "DETENER":** Detiene inmediatamente la simulación de tráfico continuo.

### 5.3 Vista en Dos Columnas (Modo Expandido en PC)
* Al presionar el botón de expansión (`›`) en pantallas de computadora (`>= 992px`), los bloques de **"Servidor Activo"** y **"Simulador de Tráfico"** se reorganizan automáticamente **uno al lado del otro**, mientras que la tabla de últimas operaciones se expande abajo para mayor visibilidad durante presentaciones técnicas.

---

## 🧪 6. Demostración de Conmutación por Error (Prueba de Failover)

Para demostrar en vivo la resiliencia del clúster ante el público o evaluadores, sigue este procedimiento:

1. Abre la aplicación web en [http://localhost:3000](http://localhost:3000).
2. Observa en la tarjeta de monitoreo el servidor físico activo (ej. `LAPTOP-01`).
3. Presiona **"SIMULAR TRÁFICO"**. Observa cómo el contador incrementa y las operaciones se registran en la tabla inferior procesadas por la réplica primaria.
4. **Simula el fallo de hardware:**
   * Desconecta el cable de red del nodo primario, apaga el servicio de SQL Server en esa máquina o fuerza un failover manual desde SQL Server Management Studio (SSMS).
5. **Observa la respuesta del sistema:**
   * La cabecera y la tarjeta cambiarán automáticamente a **"CONMUTACIÓN EN PROCESO / FAILOVER ACTIVO"** en color amarillo.
   * El servicio de Node.js capturará el corte momentáneo sin colapsar ni cerrarse.
6. **Validación del restablecimiento:**
   * Tras pocos segundos (~3 a 5 seg), el Listener de Always On redirigirá el tráfico a la réplica secundaria (ej. `LAPTOP-02`).
   * El indicador volverá a **"SALUDABLE / SISTEMA OPERATIVO"** en verde, y verás en la tabla que el nuevo procesador es ahora `LAPTOP-02`.
   * **No se requiere recargar la página web ni reiniciar el backend.**

---

## 🎨 7. Herramientas y Controles Visuales

* **Modo Claro / Oscuro (`◐`):**
  * Ubicado en la esquina superior derecha.
  * Alterna entre una interfaz luminosa Nothing y un tema oscuro de alto contraste optimizado para entornos con poca luz.
  * Tu preferencia se guarda localmente en el navegador para sesiones futuras.
* **Web del Proyecto y Visor QR (`⌘`):**
  * Ubicado en la cabecera junto al botón de tema.
  * Abre una ventana modal con el código QR para que cualquier persona en la misma sala pueda escanearlo con su celular.
  * Incluye la **URL directa de la aplicación**, un botón de **Copiar** al portapapeles y un botón de **Abrir Enlace**.
* **Navegación Móvil (Smartphones y Pantallas Pequeñas):**
  * En dispositivos móviles, la barra superior despliega dos botones de acceso rápido:
    * Botón de perfiles (👥 a la izquierda): Abre el cajón lateral de cuentas.
    * Botón de clúster (📊 a la derecha): Abre el cajón lateral de monitoreo Always On.
  * Tocar cualquier parte fuera del panel lateral abierto lo cierra automáticamente.

---

## ❓ 8. Preguntas Frecuentes

**¿Por qué dice "Conectando..." en el panel de monitoreo?**
> La aplicación consulta el Listener en `backend/server.js`. Si SQL Server aún está iniciando o las credenciales en el archivo `.env` no coinciden con la máquina local, el sistema permanecerá en espera y reintentará la conexión automáticamente cada 1.5 segundos.

**¿Puedo transferir dinero si no tengo saldo suficiente?**
> No. El Stored Procedure `sp_TransferirDinero` de SQL Server cuenta con validación ACID a nivel de motor. Si el saldo de origen es menor al monto solicitado, la transacción aborta con un `ROLLBACK` y se muestra un mensaje informativo en pantalla.

**¿Qué hago si quiero limpiar o reiniciar los datos de prueba?**
> Vuelve a ejecutar la sección de inserción de datos iniciales del script SQL ubicado en la Sección 4 de [`CONTRIBUTING.md`](./CONTRIBUTING.md).
