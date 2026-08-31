# Guía de Contribución y Configuración del Entorno — Banco HA Web

¡Bienvenido al repositorio! Esta guía detalla los prerrequisitos, pasos de instalación, configuración del entorno local y flujo de trabajo con Git para contribuir correctamente a la aplicación web de demostración del **Clúster de Alta Disponibilidad para SQL Server Always On**.

---

## 🛠️ 1. Prerrequisitos

Antes de comenzar, asegúrate de tener instaladas las siguientes herramientas en tu equipo:

* **Node.js** (versión 18.x o superior)
* **pnpm** (gestor de paquetes oficial del proyecto):
  ```bash
  npm install -g pnpm
  # o vía corepack:
  corepack enable pnpm
  ```
* **Git** configurado en tu terminal.
* **SQL Server** (instancia local para desarrollo o acceso a la IP/DNS del Listener del clúster).
* **SQL Server Management Studio (SSMS)** o **Azure Data Studio**.

---

## 🚀 2. Clonación e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/sql-alwayson-visualizer.git
   cd sql-alwayson-visualizer
   ```

2. **Instalar dependencias con `pnpm`:**
   > ⚠️ **Importante:** No uses `npm install` ni `yarn`. Utiliza exclusivamente `pnpm` para mantener la integridad del archivo de bloqueo `pnpm-lock.yaml`.
   ```bash
   pnpm install
   ```

---

## ⚙️ 3. Configuración de Variables de Entorno (`.env`)

Crea una copia del archivo de plantilla `.env.example` y nómbrala `.env` en la raíz del proyecto:

```bash
# En Windows (PowerShell):
Copy-Item .env.example .env

# En Linux / macOS:
cp .env.example .env
```

Abre el archivo `.env` y configura tus credenciales locales:

```env
PORT=3000
DB_SERVER=localhost        # O la IP/DNS del Listener (ej. BANCO-LISTENER o 192.168.1.150)
DB_DATABASE=BancoHA_DB
DB_USER=sa                 # Tu usuario de SQL Server
DB_PASSWORD=TuPassword123  # Tu contraseña de SQL Server
DB_PORT=1433
DB_CONNECT_TIMEOUT=4000
DB_REQUEST_TIMEOUT=5000
```

> 🔒 **Aviso de seguridad:** El archivo `.env` está protegido en `.gitignore`. **Nunca** subas contraseñas reales ni credenciales corporativas al repositorio remoto.

---

## 👥 Perfiles y datos de demostración

La aplicación no administra autenticación: cada cuenta activa de la vista `vw_CuentasClientes` se presenta como un **perfil de demostración**. Al seleccionar un perfil, la interfaz lo utiliza como cuenta de origen y muestra únicamente sus movimientos entrantes y salientes.

Las pantallas y pruebas de esta aplicación son de lectura respecto a los perfiles existentes. El formulario visual para agregar un usuario está preparado para una futura integración, pero no envía ni modifica datos en SQL Server mientras no exista una ruta de alta aprobada.

---

## 🗄️ 4. Base de Datos Local de Desarrollo (`BancoHA_DB`)

Si vas a desarrollar y aún no estás conectado al clúster Always On, ejecuta el siguiente script en tu SSMS para crear la base de datos `BancoHA_DB`, las tablas relacionales, índices, datos de prueba, vistas y el procedimiento almacenado `sp_TransferirDinero`:

```sql
-- 1. CREACIÓN DE LA BASE DE DATOS
CREATE DATABASE BancoHA_DB;
GO

USE BancoHA_DB;
GO

-- 2. TABLA TIPOS DE CUENTA
CREATE TABLE TiposCuenta
(
    IdTipoCuenta INT IDENTITY(1,1) NOT NULL,
    NombreTipo VARCHAR(30) NOT NULL,
    Descripcion VARCHAR(150) NULL,
    CONSTRAINT PK_TiposCuenta PRIMARY KEY (IdTipoCuenta),
    CONSTRAINT UQ_TiposCuenta_Nombre UNIQUE (NombreTipo)
);
GO

-- 3. TABLA CLIENTES
CREATE TABLE Clientes
(
    IdCliente INT IDENTITY(1,1) NOT NULL,
    CI VARCHAR(20) NOT NULL,
    Nombre VARCHAR(50) NOT NULL,
    Apellido VARCHAR(50) NOT NULL,
    Telefono VARCHAR(20) NULL,
    Correo VARCHAR(100) NULL,
    FechaRegistro DATETIME2 NOT NULL CONSTRAINT DF_Clientes_FechaRegistro DEFAULT SYSDATETIME(),
    Estado BIT NOT NULL CONSTRAINT DF_Clientes_Estado DEFAULT 1,
    CONSTRAINT PK_Clientes PRIMARY KEY (IdCliente),
    CONSTRAINT UQ_Clientes_CI UNIQUE (CI)
);
GO

-- 4. TABLA CUENTAS
CREATE TABLE Cuentas
(
    IdCuenta INT IDENTITY(1,1) NOT NULL,
    IdCliente INT NOT NULL,
    IdTipoCuenta INT NOT NULL,
    NumeroCuenta VARCHAR(20) NOT NULL,
    Saldo DECIMAL(18,2) NOT NULL CONSTRAINT DF_Cuentas_Saldo DEFAULT 0,
    FechaApertura DATETIME2 NOT NULL CONSTRAINT DF_Cuentas_FechaApertura DEFAULT SYSDATETIME(),
    Estado BIT NOT NULL CONSTRAINT DF_Cuentas_Estado DEFAULT 1,
    CONSTRAINT PK_Cuentas PRIMARY KEY (IdCuenta),
    CONSTRAINT UQ_Cuentas_NumeroCuenta UNIQUE (NumeroCuenta),
    CONSTRAINT CK_Cuentas_Saldo CHECK (Saldo >= 0),
    CONSTRAINT FK_Cuentas_Clientes FOREIGN KEY (IdCliente) REFERENCES Clientes(IdCliente),
    CONSTRAINT FK_Cuentas_TiposCuenta FOREIGN KEY (IdTipoCuenta) REFERENCES TiposCuenta(IdTipoCuenta)
);
GO

-- 5. TABLA TRANSACCIONES
CREATE TABLE Transacciones
(
    IdTransaccion BIGINT IDENTITY(1,1) NOT NULL,
    IdCuentaOrigen INT NOT NULL,
    IdCuentaDestino INT NOT NULL,
    TipoTransaccion VARCHAR(30) NOT NULL,
    Monto DECIMAL(18,2) NOT NULL,
    FechaTransaccion DATETIME2 NOT NULL CONSTRAINT DF_Transacciones_Fecha DEFAULT SYSDATETIME(),
    SaldoAnteriorOrigen DECIMAL(18,2) NOT NULL,
    SaldoPosteriorOrigen DECIMAL(18,2) NOT NULL,
    SaldoAnteriorDestino DECIMAL(18,2) NOT NULL,
    SaldoPosteriorDestino DECIMAL(18,2) NOT NULL,
    ServidorProcesador VARCHAR(128) NOT NULL,
    Estado VARCHAR(20) NOT NULL CONSTRAINT DF_Transacciones_Estado DEFAULT 'EXITOSA',
    Descripcion VARCHAR(200) NULL,
    CONSTRAINT PK_Transacciones PRIMARY KEY (IdTransaccion),
    CONSTRAINT CK_Transacciones_Monto CHECK (Monto > 0),
    CONSTRAINT CK_Transacciones_Cuentas CHECK (IdCuentaOrigen <> IdCuentaDestino),
    CONSTRAINT CK_Transacciones_Estado CHECK (Estado IN ('EXITOSA', 'CANCELADA')),
    CONSTRAINT FK_Transacciones_CuentaOrigen FOREIGN KEY (IdCuentaOrigen) REFERENCES Cuentas(IdCuenta),
    CONSTRAINT FK_Transacciones_CuentaDestino FOREIGN KEY (IdCuentaDestino) REFERENCES Cuentas(IdCuenta)
);
GO

-- 6. TABLA AUDITORÍA
CREATE TABLE Auditoria
(
    IdAuditoria BIGINT IDENTITY(1,1) NOT NULL,
    FechaHora DATETIME2 NOT NULL CONSTRAINT DF_Auditoria_FechaHora DEFAULT SYSDATETIME(),
    UsuarioBD VARCHAR(128) NOT NULL,
    Operacion VARCHAR(50) NOT NULL,
    TablaAfectada VARCHAR(50) NOT NULL,
    IdRegistro BIGINT NULL,
    Servidor VARCHAR(128) NOT NULL,
    Descripcion VARCHAR(250) NULL,
    CONSTRAINT PK_Auditoria PRIMARY KEY (IdAuditoria)
);
GO

-- 7. ÍNDICES DE RENDIMIENTO
CREATE INDEX IX_Cuentas_IdCliente ON Cuentas(IdCliente);
CREATE INDEX IX_Transacciones_Fecha ON Transacciones(FechaTransaccion);
CREATE INDEX IX_Auditoria_FechaHora ON Auditoria(FechaHora);
GO

-- 8. DATOS INICIALES DE PRUEBA
INSERT INTO TiposCuenta (NombreTipo, Descripcion) VALUES
('Ahorro', 'Cuenta destinada al ahorro de fondos'),
('Corriente', 'Cuenta para operaciones frecuentes');
GO

INSERT INTO Clientes (CI, Nombre, Apellido, Telefono, Correo) VALUES
('5801234', 'Carlos', 'Mamani', '76123456', 'carlos.mamani@email.com'),
('5823456', 'Maria', 'Flores', '76234567', 'maria.flores@email.com'),
('5845678', 'Juan', 'Ramirez', '76345678', 'juan.ramirez@email.com');
GO

INSERT INTO Cuentas (IdCliente, IdTipoCuenta, NumeroCuenta, Saldo) VALUES
(1, 1, '1000000001', 5000.00),
(2, 1, '1000000002', 3000.00),
(3, 2, '1000000003', 7500.00);
GO

-- 9. VISTA: vw_CuentasClientes (Consumida por el chat de la web)
CREATE OR ALTER VIEW vw_CuentasClientes
AS
SELECT
    c.IdCliente,
    c.CI,
    c.Nombre,
    c.Apellido,
    cu.IdCuenta,
    cu.NumeroCuenta,
    tc.NombreTipo AS TipoCuenta,
    cu.Saldo,
    cu.FechaApertura,
    cu.Estado
FROM Clientes c
INNER JOIN Cuentas cu ON c.IdCliente = cu.IdCliente
INNER JOIN TiposCuenta tc ON cu.IdTipoCuenta = tc.IdTipoCuenta;
GO

-- 10. VISTA: vw_UltimasTransacciones (Consumida por el monitor en vivo)
CREATE OR ALTER VIEW vw_UltimasTransacciones
AS
SELECT
    t.IdTransaccion,
    co.NumeroCuenta AS CuentaOrigen,
    cd.NumeroCuenta AS CuentaDestino,
    t.TipoTransaccion,
    t.Monto,
    t.FechaTransaccion,
    t.ServidorProcesador,
    t.Estado,
    t.Descripcion
FROM Transacciones t
INNER JOIN Cuentas co ON t.IdCuentaOrigen = co.IdCuenta
INNER JOIN Cuentas cd ON t.IdCuentaDestino = cd.IdCuenta;
GO

-- 11. PROCEDIMIENTO ALMACENADO: sp_TransferirDinero
CREATE OR ALTER PROCEDURE sp_TransferirDinero
    @NumeroCuentaOrigen  VARCHAR(20),
    @NumeroCuentaDestino VARCHAR(20),
    @Monto               DECIMAL(18,2),
    @Descripcion         VARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @IdCuentaOrigen INT,
        @IdCuentaDestino INT,
        @SaldoOrigen DECIMAL(18,2),
        @SaldoDestino DECIMAL(18,2),
        @NuevoSaldoOrigen DECIMAL(18,2),
        @NuevoSaldoDestino DECIMAL(18,2);

    BEGIN TRY
        IF @Monto <= 0
            THROW 50001, 'El monto de la transferencia debe ser mayor a 0.', 1;

        IF @NumeroCuentaOrigen = @NumeroCuentaDestino
            THROW 50002, 'La cuenta origen y destino no pueden ser iguales.', 1;

        BEGIN TRANSACTION;

        SELECT @IdCuentaOrigen = IdCuenta, @SaldoOrigen = Saldo
        FROM Cuentas WITH (UPDLOCK, HOLDLOCK)
        WHERE NumeroCuenta = @NumeroCuentaOrigen;

        SELECT @IdCuentaDestino = IdCuenta, @SaldoDestino = Saldo
        FROM Cuentas WITH (UPDLOCK, HOLDLOCK)
        WHERE NumeroCuenta = @NumeroCuentaDestino;

        IF @IdCuentaOrigen IS NULL
            THROW 50003, 'La cuenta origen no existe.', 1;

        IF @IdCuentaDestino IS NULL
            THROW 50004, 'La cuenta destino no existe.', 1;

        IF @SaldoOrigen < @Monto
            THROW 50005, 'Saldo insuficiente en la cuenta origen.', 1;

        SET @NuevoSaldoOrigen = @SaldoOrigen - @Monto;
        SET @NuevoSaldoDestino = @SaldoDestino + @Monto;

        UPDATE Cuentas SET Saldo = @NuevoSaldoOrigen WHERE IdCuenta = @IdCuentaOrigen;
        UPDATE Cuentas SET Saldo = @NuevoSaldoDestino WHERE IdCuenta = @IdCuentaDestino;

        INSERT INTO Transacciones
        (
            IdCuentaOrigen, IdCuentaDestino, TipoTransaccion, Monto,
            SaldoAnteriorOrigen, SaldoPosteriorOrigen,
            SaldoAnteriorDestino, SaldoPosteriorDestino,
            ServidorProcesador, Estado, Descripcion
        )
        VALUES
        (
            @IdCuentaOrigen, @IdCuentaDestino, 'TRANSFERENCIA', @Monto,
            @SaldoOrigen, @NuevoSaldoOrigen,
            @SaldoDestino, @NuevoSaldoDestino,
            @@SERVERNAME, 'EXITOSA', @Descripcion
        );

        INSERT INTO Auditoria (UsuarioBD, Operacion, TablaAfectada, IdRegistro, Servidor, Descripcion)
        VALUES (SUSER_SNAME(), 'TRANSFERENCIA', 'Cuentas', @IdCuentaOrigen, @@SERVERNAME, 'Transferencia realizada');

        COMMIT TRANSACTION;

        SELECT
            'TRANSFERENCIA EXITOSA' AS Resultado,
            @NumeroCuentaOrigen AS CuentaOrigen,
            @NumeroCuentaDestino AS CuentaDestino,
            @Monto AS Monto,
            @NuevoSaldoOrigen AS NuevoSaldoOrigen,
            @NuevoSaldoDestino AS NuevoSaldoDestino,
            @@SERVERNAME AS ServidorProcesador;

    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
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

## 🏗️ 6. Estructura del Proyecto

El proyecto sigue una arquitectura desacoplada y modular dividida entre backend (Node.js/Express) y frontend (HTML5/CSS3/JavaScript Vanilla modular):

```text
banco-ha-demo/
├── backend/
│   ├── routes/
│   │   ├── movimientos.js     # Endpoints para consultar cuentas e historial de transacciones
│   │   ├── servidor.js        # Consulta @@SERVERNAME y latencia del nodo activo Always On
│   │   └── transferencias.js  # Ejecuta sp_TransferirDinero y valida parámetros bancarios
│   ├── services/
│   │   └── trafico.js         # Simulador de carga continua y masiva con resiliencia ante failover
│   ├── database.js            # Pool mssql, queries preparadas y llamadas a Stored Procedures
│   └── server.js              # Servidor HTTP/Express, Socket.IO y loop de health-check cada 1.5s
├── frontend/
│   ├── assets/
│   │   └── LogoLink.svg       # Código QR oficial para acceso rápido a la plataforma web
│   ├── css/
│   │   └── styles.css         # Estilos inspirados en estética Nothing, variables CSS y temas
│   ├── js/
│   │   ├── app.js             # Inicialización y exportación global del cliente WebSocket
│   │   ├── chat.js            # Carga de cuentas de la BD, búsqueda y gestión del historial aislado
│   │   ├── modales.js         # Apertura y cierre de diálogos HTML5 (modal alta y visor QR)
│   │   ├── monitor.js         # Dashboard Always On: estado de réplica, latencia y eventos en vivo
│   │   ├── transferencias.js  # Envío de dinero desde el perfil activo hacia la cuenta destino
│   │   └── ui.js              # Alternancia de tema (claro/oscuro) y contracción/expansión de paneles
│   ├── favicon.ico            # Ícono oficial de la aplicación web
│   └── index.html             # Maquetación semántica de tres columnas y modales accesibles
├── .env.example               # Plantilla de variables de entorno para SQL Server Always On
├── CONTRIBUTING.md            # Guía de contribución, arquitectura y especificación técnica
├── package.json               # Dependencias y scripts de ejecución (pnpm)
└── plan.txt                   # Plan de requerimientos e integración
```

---

## 🛣️ 7. Rutas de la API y Eventos WebSocket

### 7.1 Endpoints HTTP (REST API)

| Método | Ruta | Parámetros / Cuerpo | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/servidor` | Ninguno | Retorna el nodo físico activo (`@@SERVERNAME`), timestamp del motor y latencia en ms. |
| `GET` | `/api/movimientos` | `?limite=15` *(query opcional)* | Obtiene las transacciones globales más recientes registradas en la vista `vw_UltimasTransacciones`. |
| `GET` | `/api/movimientos/cuentas` | Ninguno | Retorna la lista de clientes y cuentas activas (`vw_CuentasClientes WHERE Estado = 1`). |
| `GET` | `/api/movimientos/cuenta/:numeroCuenta` | `?limite=30` *(query opcional)* | Consulta el historial aislado donde la cuenta indicada figure como origen o como destino. |
| `POST` | `/api/transferencia` | `{ cuentaOrigen, cuentaDestino, monto, descripcion }` | Ejecuta el Stored Procedure `sp_TransferirDinero` con control transaccional ACID en SQL Server. |
| `POST` | `/api/trafico/iniciar` | `{ intervaloMs: 1000 }` *(opcional)* | Inicia la generación automática continua de transferencias entre cuentas activas al azar. |
| `POST` | `/api/trafico/detener` | Ninguno | Detiene el servicio de simulación de tráfico masivo. |

### 7.2 Eventos WebSocket en Tiempo Real (Socket.IO)

* **`estado_servidor`**: Emitido periódicamente cada 1500 ms por el loop de comprobación. Notifica si el Listener está `online`, el nombre del servidor primario, rol y latencia; o el estado de conmutación si ocurre una caída de réplica.
* **`nuevo_movimiento`**: Emitido instantáneamente tras completarse una transferencia (manual o simulada) para alimentar la tabla de operaciones en vivo.
* **`estado_trafico`**: Notifica a todas las sesiones conectadas si el generador de tráfico está activo o inactivo.
* **`trafico_tick`**: Notifica el acumulador de transacciones generadas en la simulación actual.

---

## 📱 8. Guía de Uso de la Aplicación

1. **Selección de Perfiles (Columna Izquierda):**
   * Al iniciar, la aplicación carga automáticamente las cuentas existentes en la base de datos `BancoHA_DB`.
   * Haz clic sobre cualquier cliente para seleccionarlo como **perfil activo**. La interfaz actualizará el avatar, nombre, cuenta y saldo disponible en tiempo real.
   * Utiliza la barra de búsqueda superior para filtrar perfiles rápidamente por nombre o número de cuenta.

2. **Envío de Dinero e Historial Aislado (Columna Central):**
   * El panel central actúa como consola transaccional estilo mensajería/banco.
   * Cada perfil muestra exclusivamente sus propios movimientos:
     * **Envíos (Rojo / Salida):** Operaciones donde la cuenta activa es el emisor.
     * **Recepciones (Verde / Entrada):** Operaciones donde la cuenta activa es el receptor.
   * En la barra inferior, selecciona la cuenta destinataria (el selector excluye automáticamente la cuenta activa), ingresa el monto, un concepto opcional y presiona **"ENVIAR DINERO"**.

3. **Monitoreo del Clúster Always On (Columna Derecha):**
   * La tarjeta superior muestra qué servidor físico (ej. `LAPTOP-01` o `LAPTOP-02`) está respondiendo consultas a través del Listener de Always On y la latencia en milisegundos.
   * **Prueba de Failover:** Presiona **"⚡ SIMULAR TRÁFICO"** para iniciar transacciones automatizadas continuas. Si desconectas el cable de red o apagas el nodo primario de SQL Server, observarás cómo el indicador cambia a *"FAILOVER ACTIVO / CONMUTACIÓN EN PROCESO"* y, tras la elección del nuevo primario, el sistema reanuda las transferencias sin reiniciar el backend ni recargar el navegador.

4. **Controles de Interfaz, Tema y Paneles:**
   * **Modo Claro / Oscuro (`◐`):** Botón en la cabecera superior para alternar instantáneamente entre la estética Nothing luminosa y la variante oscura de alto contraste. La preferencia se guarda en el almacenamiento local (`localStorage`).
   * **Visor de Código QR (`⌘`):** Abre un diálogo accesible en pantalla completa que contiene el recurso QR oficial (`frontend/assets/LogoLink.svg`), reemplazable por cualquier comprobante o cobro dinámico sin alterar el flujo.
   * **Preparación de Nuevo Perfil (`+`):** Ubicado en la cabecera del panel de perfiles. Abre un modal para ingresar datos de un nuevo cliente. Este modal valida el formulario visualmente y protege la base de datos no ejecutando escrituras hasta que se habilite una ruta de alta autorizada.
   * **Colapso / Expansión de Paneles (`‹` / `›`):** Permite contraer la lista de clientes o expandir el monitor transaccional para maximizar el área de trabajo en pantallas reducidas o laptops.

---

## 📝 9. Registro de Cambios Realizados

A continuación se resumen las mejoras implementadas de acuerdo con la planificación técnica:

* **Perfiles respaldados por la base de datos:** Se eliminaron las cuentas simuladas en código. La lista lateral de clientes se nutre exclusivamente de la vista SQL `vw_CuentasClientes`.
* **Historial transaccional aislado por cuenta:** Implementación de la ruta `/api/movimientos/cuenta/:numeroCuenta` y filtrado bidireccional (`CuentaOrigen` / `CuentaDestino`) para que cada cliente consulte únicamente su actividad.
* **Separación de responsabilidades con Modal de Alta:** El formulario para nuevos usuarios fue extraído de la barra lateral hacia un modal desacoplado (`#user-modal`) que evita sobrecargar la interfaz y opera en modo visual protegido sin alterar la base de datos.
* **Visor de Código QR integrado:** Incorporación de ventana modal para visualización de pagos QR reutilizando la estructura de diálogos HTML5 y un vector SVG reemplazable.
* **Favicon bancario oficial:** Agregado de `frontend/favicon.ico` para la pestaña del navegador.
* **Diseño Nothing responsivo y controles colapsables:** Nueva distribución de 3 columnas con soporte para dispositivos móviles, alternancia fluida de paneles laterales y soporte completo de temas claro y oscuro.
* **Arquitectura frontend modular:** Desacoplamiento de la lógica JavaScript en módulos específicos (`app.js`, `chat.js`, `modales.js`, `monitor.js`, `transferencias.js`, `ui.js`).

---

## 🌿 10. Convenciones de Contribución y Git Flow

Para mantener un historial limpio y estructurado, sigue este flujo de trabajo:

### 10.1 Ramas (Branches)
* `main`: Código estable del sistema con backend Node.js, WebSockets y conexión a SQL Server Always On.
* `demo-web`: Versión desacoplada 100% client-side (HTML5, CSS y Vanilla JS) con simulación en memoria/localStorage para demostraciones sin backend.
* Crea ramas descriptivas para cada cambio:
  ```bash
  # Para nuevas funcionalidades:
  git checkout -b feature/nombre-funcionalidad

  # Para corrección de errores:
  git checkout -b fix/descripcion-del-bug
  ```

### 10.2 Formato de Commits (Conventional Commits)
Usa prefijos claros en tus mensajes:
* `feat:` Nueva funcionalidad (ej. `feat: agregar vista de cuentas en frontend`).
* `fix:` Corrección de error (ej. `fix: ajustar timeout de reconexion mssql`).
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
   git push origin feature/nombre-funcionalidad
   ```
4. Abre un **Pull Request (PR)** hacia la rama `main` describiendo los cambios implementados.
