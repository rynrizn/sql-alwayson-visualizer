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
* **Instancia de SQL Server** (local para desarrollo, o acceso a la IP/DNS del Listener del clúster).

---

## 🚀 2. Clonación e Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/sql-alwayson-visualizer.git
   cd sql-alwayson-visualizer
   ```

2. **Instalar dependencias con `pnpm`:**
   > ⚠️ **Importante:** No uses `npm install` ni `yarn`. Utiliza exclusivamente `pnpm` para mantener la integridad del archivo `pnpm-lock.yaml`.
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

Abre `.env` y configura los parámetros según tu entorno:

```env
PORT=3000
DB_SERVER=localhost        # O la IP/DNS del Listener (ej. BANCO-LISTENER)
DB_DATABASE=BancoDB
DB_USER=sa                 # Tu usuario de SQL Server
DB_PASSWORD=TuPassword123  # Tu contraseña local de SQL Server
DB_PORT=1433
DB_CONNECT_TIMEOUT=4000
DB_REQUEST_TIMEOUT=5000
```

> 🔒 **Aviso de seguridad:** El archivo `.env` está en `.gitignore`. **Nunca** subas contraseñas reales ni credenciales corporativas al repositorio.

---

## 🗄️ 4. Base de Datos Local de Prueba (Esquema Mínimo)

Si vas a desarrollar y no estás conectado al clúster de Always On, ejecuta este script en tu SQL Server Management Studio (SSMS) o Azure Data Studio para crear la base de datos `BancoDB` y el procedimiento almacenado requerido:

```sql
CREATE DATABASE BancoDB;
GO
USE BancoDB;
GO

-- 1. Tabla de clientes
CREATE TABLE Clientes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL,
    Saldo DECIMAL(18,2) NOT NULL DEFAULT 1000.00
);

-- 2. Tabla de auditoría de transacciones
CREATE TABLE Transacciones (
    Id INT IDENTITY(1000,1) PRIMARY KEY,
    CuentaOrigen INT FOREIGN KEY REFERENCES Clientes(Id),
    CuentaDestino INT FOREIGN KEY REFERENCES Clientes(Id),
    Monto DECIMAL(18,2) NOT NULL,
    ServidorProcesamiento NVARCHAR(100) NOT NULL,
    Fecha DATETIME DEFAULT GETDATE(),
    Estado NVARCHAR(20) DEFAULT 'COMPLETADA'
);

-- 3. Clientes de prueba
INSERT INTO Clientes (Nombre, Saldo) VALUES 
('Ryn', 1500.00), 
('Carlos', 800.00), 
('María', 1200.00), 
('Pedro', 950.00), 
('Juan', 500.00);

-- 4. Stored Procedure transaccional
GO
CREATE OR ALTER PROCEDURE sp_RealizarTransferencia
    @CuentaOrigen INT,
    @CuentaDestino INT,
    @Monto DECIMAL(18,2),
    @TxId INT OUTPUT,
    @Servidor NVARCHAR(100) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF (SELECT Saldo FROM Clientes WHERE Id = @CuentaOrigen) < @Monto
        BEGIN
            RAISERROR('Saldo insuficiente para realizar la operacion.', 16, 1);
        END

        UPDATE Clientes SET Saldo = Saldo - @Monto WHERE Id = @CuentaOrigen;
        UPDATE Clientes SET Saldo = Saldo + @Monto WHERE Id = @CuentaDestino;

        SET @Servidor = @@SERVERNAME;

        INSERT INTO Transacciones (CuentaOrigen, CuentaDestino, Monto, ServidorProcesamiento, Estado)
        VALUES (@CuentaOrigen, @CuentaDestino, @Monto, @Servidor, 'COMPLETADA');

        SET @TxId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
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

## 🌿 6. Convenciones de Contribución y Git Flow

Para mantener un historial limpio y estructurado, sigue este flujo de trabajo:

### 6.1 Ramas (Branches)
* `main`: Código estable y listo para la demostración.
* No trabajes directamente sobre `main`. Crea una rama descriptiva para cada funcionalidad o corrección:
  ```bash
  # Para nuevas características:
  git checkout -b feature/nombre-funcionalidad

  # Para corrección de errores:
  git checkout -b fix/descripcion-del-bug
  ```

### 6.2 Formato de Commits (Conventional Commits)
Usa prefijos claros en tus mensajes:
* `feat:` Nueva funcionalidad (ej. `feat: agregar modal de confirmacion en frontend`).
* `fix:` Corrección de error (ej. `fix: corregir reconexion de socket en failover`).
* `style:` Cambios en diseño visual, CSS o formato sin afectar lógica.
* `docs:` Cambios en documentación o comentarios.
* `refactor:` Reestructuración de código sin alterar comportamiento.

### 6.3 Envío de Cambios (Pull Requests)
1. Asegúrate de que el código no rompa la ejecución local (`pnpm dev`).
2. Haz commit de tus cambios:
   ```bash
   git add .
   git commit -m "feat: descripcion del cambio"
   ```
3. Sube tu rama al repositorio remoto:
   ```bash
   git push origin feature/nombre-funcionalidad
   ```
4. Abre un **Pull Request (PR)** hacia la rama `main` detallando:
   * ¿Qué cambios se hicieron?
   * ¿Cómo probarlo localmente?
