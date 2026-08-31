# 🏦 Banco HA — Core Transaccional Always On

Sistema web para demostración y monitoreo en tiempo real de **Alta Disponibilidad con SQL Server Always On Availability Groups** y arquitecturas de replicación transaccional.

> 🌐 **Demostración Interactiva en Vivo (GitHub Pages):**  
> Accede directamente a la versión 100% Client-Side con diseño Nothing:  
> **[https://rynrizn.github.io/sql-alwayson-visualizer/](https://rynrizn.github.io/sql-alwayson-visualizer/)**

Permite ejecutar transferencias bancarias protegidas por transacciones ACID, simular tráfico continuo y evidenciar la conmutación por error (*Failover*) automática entre réplicas primarias y secundarias sin interrupción del servicio web.

---

## 🔀 Mapa de Ramas del Repositorio

El proyecto cuenta con tres ramas especializadas según la plataforma de despliegue y el motor de base de datos utilizado:

```text
sql-alwayson-visualizer/
├── main                  # 🏢 Versión Full-Stack: SQL Server Always On en Windows Server
├── postgresql-ubuntu     # 🐧 Versión Full-Stack: PostgreSQL en Ubuntu Server (driver 'pg', PL/pgSQL)
└── demo-web              # 🌐 Versión Client-Side: Demo 100% estática en GitHub Pages (sin backend)
```

| Rama | Motor / Entorno | Tipo | Descripción |
| :--- | :--- | :--- | :--- |
| **`main`** *(esta rama)* | **SQL Server Always On** (Windows) | Full-Stack | Backend Node.js con driver `mssql`, conexión al Listener virtual, procedimientos almacenados T-SQL y WebSockets. |
| **[`postgresql-ubuntu`](https://github.com/rynrizn/sql-alwayson-visualizer/tree/postgresql-ubuntu)** | **PostgreSQL** (Ubuntu Server) | Full-Stack | Adaptación para Linux/Ubuntu con driver nativo `pg`, funciones PL/pgSQL con bloqueo pesimista y detección dinámica de roles. |
| **[`demo-web`](https://github.com/rynrizn/sql-alwayson-visualizer/tree/demo-web)** | **Client-Side** (Navegador) | Frontend | Landing page informativa y consola con simulación en memoria/localStorage, publicada en GitHub Pages. |

---

## 📚 Documentación del Proyecto

El repositorio cuenta con guías especializadas según el perfil técnico:

| Documento | Público objetivo | Contenido principal |
| :--- | :--- | :--- |
| 📖 **[Guía de Uso de la Aplicación](./GUIA_DE_USO.md)** | Usuarios, Evaluadores y Expositores | Cómo operar la consola, realizar transferencias, ejecutar la prueba de failover, usar el visor QR y alternar temas. |
| 🛠️ **[Guía de Contribución y Configuración](./CONTRIBUTING.md)** | Desarrolladores y Administradores de BD | Requisitos previos, script DDL/DML de SQL Server, variables de entorno (`.env`), endpoints API y flujo de Git. |

---

## ⚡ Características Principales

* **Alta Disponibilidad Real:** Conexión transparente mediante el Listener de SQL Server Always On con resolución MultiSubnetFailover.
* **Consola Transaccional:** Historial individual aislado por cliente (envíos y recibos) y transferencias inmediatas mediante el procedimiento almacenado `sp_TransferirDinero`.
* **Monitoreo en Tiempo Real:** Detección continua de la réplica activa (`SELECT @@SERVERNAME`), medición de latencia y registro en vivo vía WebSockets (Socket.IO).
* **Simulador de Carga Transaccional:** Generador de transferencias masivas continuas para validar la conmutación por error en vivo.
* **Diseño Nothing Adaptativo:** Interfaz sobria y funcional con botones táctiles cuadrados redondeados, soporte responsivo para móviles mediante cajones laterales y temas claro/oscuro.

---

## 🚀 Inicio Rápido (Servidor Completo — SQL Server)

1. **Instalar dependencias:**
   ```bash
   pnpm install
   ```
2. **Configurar variables de entorno copiando `.env.example` a `.env`:**
   ```bash
   cp .env.example .env
   ```
3. **Iniciar en modo desarrollo:**
   ```bash
   pnpm dev
   ```
4. **Acceder en el navegador:**  
   👉 [http://localhost:3000](http://localhost:3000)

---

## 🌐 Demostración 100% Client-Side (GitHub Pages)

Para presentaciones o evaluaciones en cualquier dispositivo sin requerir Node.js ni SQL Server en ejecución:

* 🚀 **Acceso directo online:** [https://rynrizn.github.io/sql-alwayson-visualizer/](https://rynrizn.github.io/sql-alwayson-visualizer/)
* **Para ejecutarla localmente:**
  1. Cambiar a la rama de demostración:
     ```bash
     git checkout demo-web
     ```
  2. Abrir directamente en cualquier navegador:
     * **Landing Informativa:** Abre [`docs/index.html`](./docs/index.html) para explorar la presentación del clúster, objetivos y la guía interactiva del failover.
     * **Consola Interactiva:** Abre [`docs/demo.html`](./docs/demo.html) para operar la consola transaccional, simular la conmutación por error (2.5 s) y generar tráfico masivo continuo con persistencia local en `localStorage`.

---

## 🏗️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | HTML5 semántico, CSS3 Nothing Design System, JavaScript Vanilla modular, Socket.IO Client |
| **Backend** | Node.js, Express 5, Socket.IO 4, CORS, Dotenv |
| **Base de Datos** | Microsoft SQL Server (Always On Availability Groups) / PostgreSQL 15+ (rama `postgresql-ubuntu`) |
| **Gestor de Paquetes** | `pnpm` v11.24+ |

---

## 📄 Licencia

Este proyecto está bajo los términos de la licencia MIT. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
