# 🏦 Banco HA — Core Transaccional PostgreSQL (Ubuntu Server)

> 🐧 **Rama `postgresql-ubuntu`:** Variante adaptada para funcionar con motor **PostgreSQL** sobre **Ubuntu Server 22.04/24.04 LTS**, utilizando el driver oficial `pg`, transaccionalidad ACID y soporte para topologías de Alta Disponibilidad (Streaming Replication, Patroni o PgBouncer/HAProxy).

Sistema web para demostración y monitoreo en tiempo real de **Alta Disponibilidad con PostgreSQL**.

Permite ejecutar transferencias bancarias protegidas por transacciones ACID en funciones PL/pgSQL, simular tráfico continuo y evidenciar la conmutación por error (*Failover*) automática entre nodos primarios y réplicas en espera (Standby) sin interrupción del servicio web.

---

## 📚 Documentación de esta Rama

| Documento | Público objetivo | Contenido principal |
| :--- | :--- | :--- |
| 📖 **[Guía de Uso de la Aplicación](./GUIA_DE_USO.md)** | Usuarios, Evaluadores y Expositores | Operación de la consola transaccional, simulación de tráfico masivo y monitoreo en vivo. |
| 🛠️ **[Guía de Contribución y Configuración](./CONTRIBUTING.md)** | Administradores de BD y Desarrolladores | Prerrequisitos de Ubuntu, script DDL/DML para PostgreSQL, configuración de variables de entorno y arquitectura. |

---

## ⚡ Características de la Versión PostgreSQL

* **Driver Nativo PostgreSQL (`pg`):** Gestión eficiente de conexiones mediante Pool asíncrono con control de desconexión y failover rápido.
* **Monitoreo de Nodo en Tiempo Real:** Detección continua de la dirección IP del servidor (`inet_server_addr()`), verificación del rol del nodo (`pg_is_in_recovery()`) y latencia en milisegundos emitida vía WebSockets (Socket.IO).
* **Transaccionalidad ACID Pura en PL/pgSQL:** Procedimiento/función `sp_transferir_dinero` con bloqueo pesimista `SELECT ... FOR UPDATE` para evitar condiciones de carrera.
* **Historial Transaccional Aislado:** Vistas relacionales `vw_cuentas_clientes` y `vw_ultimas_transacciones` optimizadas para consultas concurrentes.
* **Simulador de Carga Transaccional Resiliente:** Generador de transferencias masivas automatizadas que absorbe pausas momentáneas durante la promoción de nodos Standby.
* **Diseño Nothing Adaptativo:** Consola de 3 columnas con soporte táctil, buscador rápido de clientes y temas claro/oscuro.

---

## 🚀 Inicio Rápido en Ubuntu Server

### 1. Prerrequisitos en Ubuntu
```bash
# Instalar Node.js y pnpm
sudo apt update && sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pnpm

# Instalar PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 2. Configuración de Base de Datos
Accede a PostgreSQL y crea la base de datos:
```bash
sudo -u postgres psql -c "CREATE DATABASE bancoha_db;"
# Ejecuta el script DDL ubicado en CONTRIBUTING.md sección 4
sudo -u postgres psql -d bancoha_db -f docs/schema-postgres.sql # o copia el script de CONTRIBUTING.md
```

### 3. Configurar variables de entorno
```bash
cp .env.example .env
# Edita las credenciales en .env si es necesario:
nano .env
```

### 4. Instalar dependencias e iniciar
```bash
pnpm install
pnpm dev
```

La aplicación estará disponible en:  
👉 **[http://localhost:3000](http://localhost:3000)** (o la IP de tu servidor Ubuntu: `http://<IP-UBUNTU>:3000`)

---

## 🔌 ¿Cómo y dónde configurar la conexión a PostgreSQL?

Para conectar la aplicación a tu clúster o servidor de PostgreSQL en Ubuntu Server, **únicamente debes crear y editar el archivo `.env` en la raíz del proyecto**.

### 1. Archivo a modificar:
👉 **`.env`** *(Copia de `.env.example`)*

### 2. Parámetros que debes cambiar:

```env
PORT=3000

# Host o IP donde se ejecuta PostgreSQL:
# - En el mismo servidor Ubuntu local: localhost o 127.0.0.1
# - En servidor remoto o IP virtual (VIP / HAProxy / Keepalived): ej. 192.168.1.160
DB_HOST=localhost

# Puerto TCP del servicio de PostgreSQL (predeterminado: 5432):
DB_PORT=5432

# Nombre de la base de datos creada con el script DDL (Sección 4 de CONTRIBUTING.md):
DB_DATABASE=bancoha_db

# Usuario con privilegios en PostgreSQL (predeterminado: 'postgres' o usuario de app):
DB_USER=postgres

# Contraseña establecida para el usuario en PostgreSQL:
DB_PASSWORD=TuPassword123

# Conexión cifrada SSL (mantener en false para red local sin certificados):
DB_SSL=false
```

> 💡 **Nota de arquitectura:** El archivo `backend/database.js` lee estas variables mediante `dotenv` e inicializa automáticamente el objeto `Pool` de la librería `pg`. No es necesario modificar ningún archivo JavaScript para cambiar de base de datos, credenciales o IP del servidor.

---

## 🔀 Relación con las Otras Ramas

* **`main`**: Versión configurada para **Microsoft SQL Server Always On Availability Groups** en Windows Server.
* **`postgresql-ubuntu`** *(esta rama)*: Adaptada para **PostgreSQL** sobre **Ubuntu Server**, utilizando el driver `pg` y funciones PL/pgSQL.
* **`demo-web`**: Versión 100% Client-Side estática para pruebas y presentaciones online en [GitHub Pages](https://rynrizn.github.io/sql-alwayson-visualizer/).

---

## 📄 Licencia

Este proyecto está bajo los términos de la licencia MIT. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
