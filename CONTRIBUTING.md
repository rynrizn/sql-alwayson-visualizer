# Guía de Contribución y Configuración del Entorno — Banco HA Web (PostgreSQL en Ubuntu)

¡Bienvenido al repositorio! Esta guía detalla los prerrequisitos, pasos de instalación, configuración del entorno local y flujo de trabajo con Git para contribuir correctamente a la aplicación web de demostración del **Clúster de Alta Disponibilidad con PostgreSQL en Ubuntu Server**.

---

## 🛠️ 1. Prerrequisitos en Ubuntu Server

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas en tu servidor o máquina de desarrollo:

* **Ubuntu Server 22.04 LTS o 24.04 LTS** (o cualquier distribución Linux equivalente).
* **Node.js** (versión 18.x o superior):
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
  ```
* **pnpm** (gestor de paquetes oficial del proyecto):
  ```bash
  sudo npm install -g pnpm
  ```
* **Git** configurado en tu terminal:
  ```bash
  sudo apt install -y git
  ```
* **PostgreSQL** (versión 14, 15 o 16):
  ```bash
  sudo apt install -y postgresql postgresql-contrib
  sudo systemctl enable --now postgresql
  ```
* Herramienta cliente para administración: `psql` (CLI nativo) o **pgAdmin 4** / **DBeaver**.

---

## 🚀 2. Clonación e Instalación

1. **Clonar el repositorio y situarse en la rama `postgresql-ubuntu`:**
   ```bash
   git clone https://github.com/rynrizn/sql-alwayson-visualizer.git
   cd sql-alwayson-visualizer
   git checkout postgresql-ubuntu
   ```

2. **Instalar dependencias con `pnpm`:**
   > ⚠️ **Importante:** Utiliza exclusivamente `pnpm` para mantener la consistencia de las versiones y el archivo de bloqueo.
   ```bash
   pnpm install
   ```

---

## ⚙️ 3. Configuración de Variables de Entorno (`.env`)

Crea una copia del archivo de plantilla `.env.example` y nómbrala `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Abre el archivo `.env` y configura tus credenciales de PostgreSQL:

```env
PORT=3000

# CONFIGURACION POSTGRESQL EN UBUNTU SERVER
DB_HOST=localhost            # Host de PostgreSQL, IP de Ubuntu Server o VIP/HAProxy
DB_PORT=5432                 # Puerto predeterminado de PostgreSQL
DB_DATABASE=bancoha_db       # Nombre de la base de datos
DB_USER=postgres             # Usuario de PostgreSQL en Ubuntu
DB_PASSWORD=TuPassword123    # Contraseña del usuario
DB_SSL=false                 # Activar solo si se configuran certificados SSL/TLS
```

> 🔒 **Aviso de seguridad:** El archivo `.env` está protegido en `.gitignore`. **Nunca** subas contraseñas reales ni credenciales corporativas al repositorio remoto.

---

## 👥 Perfiles y datos de demostración

La aplicación no administra autenticación: cada cuenta activa de la vista `vw_cuentas_clientes` se presenta como un **perfil de demostración**. Al seleccionar un perfil, la interfaz lo utiliza como cuenta de origen y muestra únicamente sus movimientos entrantes y salientes.

Las pantallas y pruebas de esta aplicación son de lectura respecto a los perfiles existentes. El formulario visual para agregar un usuario está preparado para una futura integración, pero no envía ni modifica datos en PostgreSQL mientras no exista una ruta de alta aprobada.

---

## 🗄️ 4. Base de Datos Local de Desarrollo (`bancoha_db`)

Ejecuta el siguiente script en `psql` (o desde pgAdmin) para crear la base de datos `bancoha_db`, las tablas relacionales con tipos nativos de PostgreSQL, secuencias, vistas y la función transaccional `sp_transferir_dinero`:

```bash
# Para ejecutar directamente desde la terminal de Ubuntu:
sudo -u postgres psql -c "CREATE DATABASE bancoha_db;"
sudo -u postgres psql -d bancoha_db
```

```sql
-- 1. EXTENSIONES Y CONFIGURACION (OPCIONAL)
-- CREATE DATABASE bancoha_db;
-- \c bancoha_db;

-- 2. TABLA TIPOS DE CUENTA
CREATE TABLE IF NOT EXISTS tipos_cuenta
(
    id_tipo_cuenta SERIAL NOT NULL,
    nombre_tipo VARCHAR(30) NOT NULL,
    descripcion VARCHAR(150) NULL,
    CONSTRAINT pk_tipos_cuenta PRIMARY KEY (id_tipo_cuenta),
    CONSTRAINT uq_tipos_cuenta_nombre UNIQUE (nombre_tipo)
);

-- 3. TABLA CLIENTES
CREATE TABLE IF NOT EXISTS clientes
(
    id_cliente SERIAL NOT NULL,
    ci VARCHAR(20) NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    telefono VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_clientes PRIMARY KEY (id_cliente),
    CONSTRAINT uq_clientes_ci UNIQUE (ci)
);

-- 4. TABLA CUENTAS
CREATE TABLE IF NOT EXISTS cuentas
(
    id_cuenta SERIAL NOT NULL,
    id_cliente INT NOT NULL,
    id_tipo_cuenta INT NOT NULL,
    numero_cuenta VARCHAR(20) NOT NULL,
    saldo NUMERIC(18,2) NOT NULL DEFAULT 0,
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT pk_cuentas PRIMARY KEY (id_cuenta),
    CONSTRAINT uq_cuentas_numero_cuenta UNIQUE (numero_cuenta),
    CONSTRAINT ck_cuentas_saldo CHECK (saldo >= 0),
    CONSTRAINT fk_cuentas_clientes FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    CONSTRAINT fk_cuentas_tipos_cuenta FOREIGN KEY (id_tipo_cuenta) REFERENCES tipos_cuenta(id_tipo_cuenta)
);

-- 5. TABLA TRANSACCIONES
CREATE TABLE IF NOT EXISTS transacciones
(
    id_transaccion BIGSERIAL NOT NULL,
    cuenta_origen VARCHAR(20) NOT NULL,
    cuenta_destino VARCHAR(20) NOT NULL,
    tipo_transaccion VARCHAR(30) NOT NULL,
    monto NUMERIC(18,2) NOT NULL,
    fecha_transaccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    saldo_anterior_origen NUMERIC(18,2) NOT NULL,
    saldo_posterior_origen NUMERIC(18,2) NOT NULL,
    saldo_anterior_destino NUMERIC(18,2) NOT NULL,
    saldo_posterior_destino NUMERIC(18,2) NOT NULL,
    servidor_procesador VARCHAR(128) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'EXITOSA',
    descripcion VARCHAR(200) NULL,
    CONSTRAINT pk_transacciones PRIMARY KEY (id_transaccion),
    CONSTRAINT ck_transacciones_monto CHECK (monto > 0),
    CONSTRAINT ck_transacciones_cuentas CHECK (cuenta_origen <> cuenta_destino),
    CONSTRAINT ck_transacciones_estado CHECK (estado IN ('EXITOSA', 'CANCELADA'))
);

-- 6. TABLA AUDITORIA
CREATE TABLE IF NOT EXISTS auditoria
(
    id_auditoria BIGSERIAL NOT NULL,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_bd VARCHAR(128) NOT NULL,
    operacion VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    id_registro BIGINT NULL,
    servidor VARCHAR(128) NOT NULL,
    descripcion VARCHAR(250) NULL,
    CONSTRAINT pk_auditoria PRIMARY KEY (id_auditoria)
);

-- 7. INDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS ix_cuentas_id_cliente ON cuentas(id_cliente);
CREATE INDEX IF NOT EXISTS ix_transacciones_fecha ON transacciones(fecha_transaccion);
CREATE INDEX IF NOT EXISTS ix_auditoria_fecha_hora ON auditoria(fecha_hora);

-- 8. DATOS INICIALES DE PRUEBA
INSERT INTO tipos_cuenta (nombre_tipo, descripcion) VALUES
('Ahorro', 'Cuenta destinada al ahorro de fondos'),
('Corriente', 'Cuenta para operaciones frecuentes')
ON CONFLICT (nombre_tipo) DO NOTHING;

INSERT INTO clientes (ci, nombre, apellido, telefono, correo) VALUES
('5801234', 'Carlos', 'Mamani', '76123456', 'carlos.mamani@email.com'),
('5823456', 'Maria', 'Flores', '76234567', 'maria.flores@email.com'),
('5845678', 'Juan', 'Ramirez', '76345678', 'juan.ramirez@email.com')
ON CONFLICT (ci) DO NOTHING;

INSERT INTO cuentas (id_cliente, id_tipo_cuenta, numero_cuenta, saldo) VALUES
(1, 1, '1000000001', 5000.00),
(2, 1, '1000000002', 3000.00),
(3, 2, '1000000003', 7500.00)
ON CONFLICT (numero_cuenta) DO NOTHING;

-- 9. VISTA: vw_cuentas_clientes (Consumida por la consola web)
CREATE OR REPLACE VIEW vw_cuentas_clientes AS
SELECT
    c.id_cliente,
    c.ci,
    c.nombre,
    c.apellido,
    cu.id_cuenta,
    cu.numero_cuenta,
    tc.nombre_tipo AS tipo_cuenta,
    cu.saldo,
    cu.fecha_apertura,
    cu.estado
FROM clientes c
INNER JOIN cuentas cu ON c.id_cliente = cu.id_cliente
INNER JOIN tipos_cuenta tc ON cu.id_tipo_cuenta = tc.id_tipo_cuenta;

-- 10. VISTA: vw_ultimas_transacciones (Consumida por el monitor en vivo)
CREATE OR REPLACE VIEW vw_ultimas_transacciones AS
SELECT
    id_transaccion,
    cuenta_origen,
    cuenta_destino,
    tipo_transaccion,
    monto,
    fecha_transaccion,
    servidor_procesador,
    estado,
    descripcion
FROM transacciones;

-- 11. FUNCION TRANSACCIONAL ACID: sp_transferir_dinero
CREATE OR REPLACE FUNCTION sp_transferir_dinero(
    p_numero_cuenta_origen  VARCHAR(20),
    p_numero_cuenta_destino VARCHAR(20),
    p_monto                 NUMERIC(18,2),
    p_descripcion           VARCHAR(200) DEFAULT 'Transferencia Web'
)
RETURNS TABLE (
    resultado           VARCHAR,
    cuenta_origen       VARCHAR,
    cuenta_destino      VARCHAR,
    monto               NUMERIC(18,2),
    nuevo_saldo_origen  NUMERIC(18,2),
    nuevo_saldo_destino NUMERIC(18,2),
    servidor_procesador VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_id_cuenta_origen   INT;
    v_id_cuenta_destino  INT;
    v_saldo_origen       NUMERIC(18,2);
    v_saldo_destino      NUMERIC(18,2);
    v_nuevo_origen       NUMERIC(18,2);
    v_nuevo_destino      NUMERIC(18,2);
    v_servidor           VARCHAR(128);
BEGIN
    -- Validaciones de parametros
    IF p_monto <= 0 THEN
        RAISE EXCEPTION 'El monto de la transferencia debe ser mayor a 0.';
    END IF;

    IF p_numero_cuenta_origen = p_numero_cuenta_destino THEN
        RAISE EXCEPTION 'La cuenta origen y destino no pueden ser iguales.';
    END IF;

    -- Obtener identificador del nodo servidor actual
    SELECT COALESCE(inet_server_addr()::text, 'ubuntu-node-primary') INTO v_servidor;

    -- Bloqueo pesimista con FOR UPDATE para evitar condiciones de carrera (ACID)
    SELECT id_cuenta, saldo INTO v_id_cuenta_origen, v_saldo_origen
    FROM cuentas
    WHERE numero_cuenta = p_numero_cuenta_origen
    FOR UPDATE;

    IF v_id_cuenta_origen IS NULL THEN
        RAISE EXCEPTION 'La cuenta origen no existe.';
    END IF;

    SELECT id_cuenta, saldo INTO v_id_cuenta_destino, v_saldo_destino
    FROM cuentas
    WHERE numero_cuenta = p_numero_cuenta_destino
    FOR UPDATE;

    IF v_id_cuenta_destino IS NULL THEN
        RAISE EXCEPTION 'La cuenta destino no existe.';
    END IF;

    IF v_saldo_origen < p_monto THEN
        RAISE EXCEPTION 'Saldo insuficiente en la cuenta origen.';
    END IF;

    -- Calcular nuevos balances
    v_nuevo_origen := v_saldo_origen - p_monto;
    v_nuevo_destino := v_saldo_destino + p_monto;

    -- Actualizar saldos
    UPDATE cuentas SET saldo = v_nuevo_origen WHERE id_cuenta = v_id_cuenta_origen;
    UPDATE cuentas SET saldo = v_nuevo_destino WHERE id_cuenta = v_id_cuenta_destino;

    -- Registrar transaccion
    INSERT INTO transacciones
    (
        cuenta_origen, cuenta_destino, tipo_transaccion, monto,
        saldo_anterior_origen, saldo_posterior_origen,
        saldo_anterior_destino, saldo_posterior_destino,
        servidor_procesador, estado, descripcion
    )
    VALUES
    (
        p_numero_cuenta_origen, p_numero_cuenta_destino, 'TRANSFERENCIA', p_monto,
        v_saldo_origen, v_nuevo_origen,
        v_saldo_destino, v_nuevo_destino,
        v_servidor, 'EXITOSA', p_descripcion
    );

    -- Registrar auditoria
    INSERT INTO auditoria (usuario_bd, operacion, tabla_afectada, id_registro, servidor, descripcion)
    VALUES (CURRENT_USER, 'TRANSFERENCIA', 'cuentas', v_id_cuenta_origen, v_servidor, 'Transferencia realizada con éxito');

    -- Retornar resultado a la aplicacion
    RETURN QUERY SELECT
        'TRANSFERENCIA EXITOSA'::VARCHAR,
        p_numero_cuenta_origen,
        p_numero_cuenta_destino,
        p_monto,
        v_nuevo_origen,
        v_nuevo_destino,
        v_servidor;
END;
$$;
```

---

## 💻 5. Ejecución del Proyecto

Inicia el servidor en modo desarrollo (con recarga automática mediante `nodemon`):

```bash
pnpm dev
```

Abre tu navegador en:
```text
http://localhost:3000
```

---

### 🏗️ 6. Estructura del Proyecto

El proyecto sigue una arquitectura desacoplada y modular dividida entre backend (Node.js/Express con driver `pg` para PostgreSQL) y frontend (HTML5/CSS3/JavaScript Vanilla modular):

```text
banco-ha-demo/
├── backend/
│   ├── routes/
│   │   ├── movimientos.js     # Endpoints para consultar cuentas e historial de transacciones
│   │   ├── servidor.js        # Consulta inet_server_addr() y latencia del nodo activo en PostgreSQL
│   │   └── transferencias.js  # Invoca sp_transferir_dinero con control ACID
│   ├── services/
│   │   └── trafico.js         # Simulador de carga continua con resiliencia ante conmutación
│   ├── database.js            # Pool nativo 'pg', queries preparadas parametrizadas ($1..$n)
│   └── server.js              # Servidor HTTP/Express, Socket.IO y loop de health-check cada 1.5s
├── frontend/
│   ├── assets/
│   │   └── LogoLink.png       # Código QR oficial para acceso rápido a la plataforma web
│   ├── css/
│   │   └── styles.css         # Estilos inspirados en estética Nothing, variables CSS y temas
│   ├── js/
│   │   ├── app.js             # Inicialización y exportación global del cliente WebSocket
│   │   ├── chat.js            # Carga de cuentas de la BD, búsqueda y gestión del historial aislado
│   │   ├── modales.js         # Apertura y cierre de diálogos HTML5 (modal alta y visor QR)
│   │   ├── monitor.js         # Dashboard PostgreSQL HA: estado de nodo, latencia y eventos en vivo
│   │   ├── transferencias.js  # Envío de dinero desde el perfil activo hacia la cuenta destino
│   │   └── ui.js              # Alternancia de tema (claro/oscuro) y contracción/expansión de paneles
│   ├── favicon.ico            # Ícono oficial de la aplicación web
│   └── index.html             # Maquetación semántica de tres columnas y modales accesibles
├── .env.example               # Plantilla de variables de entorno para PostgreSQL en Ubuntu
├── CONTRIBUTING.md            # Guía de contribución, arquitectura y especificación técnica
├── package.json               # Dependencias y scripts de ejecución (pnpm)
└── plan.txt                   # Plan de requerimientos e integración
```

---

## 🛣️ 7. Rutas de la API y Eventos WebSocket

### 7.1 Endpoints HTTP (REST API)

| Método | Ruta | Parámetros / Cuerpo | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/servidor` | Ninguno | Retorna el nodo físico activo (`inet_server_addr()`), rol (`PRIMARY`/`STANDBY`) y latencia en ms. |
| `GET` | `/api/movimientos` | `?limite=15` *(query opcional)* | Obtiene las transacciones globales más recientes de `vw_ultimas_transacciones`. |
| `GET` | `/api/movimientos/cuentas` | Ninguno | Retorna la lista de clientes y cuentas activas (`vw_cuentas_clientes WHERE estado = true`). |
| `GET` | `/api/movimientos/cuenta/:numeroCuenta` | `?limite=30` *(query opcional)* | Consulta el historial aislado donde la cuenta figure como origen o como destino. |
| `POST` | `/api/transferencia` | `{ cuentaOrigen, cuentaDestino, monto, descripcion }` | Invoca la función PL/pgSQL `sp_transferir_dinero` con bloqueo pesimista `FOR UPDATE` (ACID). |
| `POST` | `/api/trafico/iniciar` | `{ intervaloMs: 1000 }` *(opcional)* | Inicia la generación automática continua de transferencias aleatorias entre cuentas. |
| `POST` | `/api/trafico/detener` | Ninguno | Detiene el servicio de simulación de tráfico masivo. |

### 7.2 Eventos WebSocket en Tiempo Real (Socket.IO)

* **`estado_servidor`**: Emitido periódicamente cada 1500 ms. Notifica si PostgreSQL está `online`, el host/IP del servidor primario, rol y latencia; o el estado de conmutación si ocurre una caída de réplica.
* **`nuevo_movimiento`**: Emitido instantáneamente tras completarse una transferencia (manual o simulada) para alimentar la tabla de operaciones en vivo.
* **`estado_trafico`**: Notifica a todas las sesiones conectadas si el generador de tráfico está activo o inactivo.
* **`trafico_tick`**: Notifica el acumulador de transacciones generadas en la simulación actual.

---

## 📱 8. Guía de Uso de la Aplicación

1. **Selección de Perfiles (Columna Izquierda):**
   * Al iniciar, la aplicación carga automáticamente las cuentas existentes en la base de datos `bancoha_db` desde PostgreSQL.
   * Haz clic sobre cualquier cliente para seleccionarlo como **perfil activo**. La interfaz actualizará el avatar, nombre, cuenta y saldo disponible en tiempo real.
   * Utiliza la barra de búsqueda superior para filtrar perfiles rápidamente por nombre o número de cuenta.

2. **Envío de Dinero e Historial Aislado (Columna Central):**
   * El panel central actúa como consola transaccional estilo mensajería/banco.
   * Cada perfil muestra exclusivamente sus propios movimientos:
     * **Envíos (Rojo / Salida):** Operaciones donde la cuenta activa es el emisor.
     * **Recepciones (Verde / Entrada):** Operaciones donde la cuenta activa es el receptor.
   * En la barra inferior, selecciona la cuenta destinataria (el selector excluye automáticamente la cuenta activa), ingresa el monto, un concepto opcional y presiona **"ENVIAR DINERO"**.

3. **Monitoreo del Clúster PostgreSQL HA (Columna Derecha):**
   * La tarjeta superior muestra qué nodo de PostgreSQL (IP o host) está respondiendo consultas y la latencia en milisegundos.
   * **Prueba de Failover:** Presiona **"⚡ SIMULAR TRÁFICO"** para iniciar transacciones automatizadas continuas. Si detienes el servicio en el nodo primario (`sudo systemctl stop postgresql`), observarás cómo el indicador cambia a *"FAILOVER ACTIVO / CONMUTACIÓN EN PROCESO"* y, tras la promoción del nodo secundario (o cambio en PgBouncer/HAProxy), el sistema reanuda las transferencias sin reiniciar el backend ni recargar el navegador.

4. **Controles de Interfaz, Tema y Paneles:**
   * **Modo Claro / Oscuro (`◐`):** Botón en la cabecera superior para alternar instantáneamente entre la estética Nothing luminosa y la variante oscura de alto contraste. La preferencia se guarda en `localStorage`.
   * **Visor de Código QR (`⌘`):** Abre un diálogo accesible en pantalla completa que contiene el recurso QR oficial (`frontend/assets/LogoLink.png`).
   * **Preparación de Nuevo Perfil (`+`):** Ubicado en la cabecera del panel de perfiles. Abre un modal para ingresar datos de un nuevo cliente.
   * **Colapso / Expansión de Paneles (`‹` / `›`):** Permite contraer la lista de clientes o expandir el monitor transaccional.

---

## 📝 9. Registro de Cambios Realizados

* **Migración a PostgreSQL:** Reemplazo integral del driver `mssql` por `pg` (Pool nativo con consultas parametrizadas `$1..$n`).
* **Funciones PL/pgSQL y Control de Concurrencia:** Creación de `sp_transferir_dinero` con bloqueos pesimistas `SELECT ... FOR UPDATE` para evitar condiciones de carrera.
* **Compatibilidad de Esquema:** Tipos de datos nativos `SERIAL`, `TIMESTAMPTZ`, `BOOLEAN`, `NUMERIC(18,2)` y eliminación de constructos T-SQL propietarios.
* **Detección de Rol Dinámico:** Implementación de `pg_is_in_recovery()` y `inet_server_addr()` para monitorear la topología activa y réplicas Standby.
* **Arquitectura frontend Nothing modular:** Desacoplamiento de la lógica JavaScript en módulos específicos (`app.js`, `chat.js`, `modales.js`, `monitor.js`, `transferencias.js`, `ui.js`).

---

## 🌿 10. Convenciones de Contribución y Git Flow

### 10.1 Ramas (Branches)
* **`main`**: Código estable para **Microsoft SQL Server Always On Availability Groups** en Windows.
* **`postgresql-ubuntu`**: Variante adaptada para **PostgreSQL** sobre **Ubuntu Server**.
* **`demo-web`**: Versión desacoplada 100% client-side para demostraciones sin backend.

### 10.2 Formato de Commits (Conventional Commits)
Usa prefijos claros en tus mensajes:
* `feat:` Nueva funcionalidad.
* `fix:` Corrección de error.
* `style:` Cambios visuales o de CSS.
* `docs:` Cambios en documentación o comentarios.
* `refactor:` Reestructuración de código sin alterar comportamiento.

### 10.3 Envío de Cambios (Pull Requests)
1. Verifica que el servidor levante sin errores (`pnpm dev`).
2. Haz commit de tus cambios:
   ```bash
   git add .
   git commit -m "feat: descripcion del cambio"
   ```
3. Sube tu rama al repositorio remoto:
   ```bash
   git push origin postgresql-ubuntu
   ```

