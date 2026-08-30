# 🏦 Banco HA — Core Transaccional Always On

Sistema web para demostración y monitoreo en tiempo real de **Alta Disponibilidad con SQL Server Always On Availability Groups**.

Permite ejecutar transferencias bancarias protegidas por transacciones ACID, simular tráfico continuo y evidenciar la conmutación por error (*Failover*) automática entre réplicas primarias y secundarias sin interrupción del servicio web.

---

## 📚 Documentación del Proyecto

El repositorio cuenta con dos guías especializadas según el perfil:

| Documento | Público objetivo | Contenido principal |
| :--- | :--- | :--- |
| 📖 **[Guía de Uso de la Aplicación](./GUIA_DE_USO.md)** | Usuarios, Evaluadores y Expositores | Cómo operar la web, realizar transferencias, ejecutar la prueba de failover, usar el visor QR y alternar temas. |
| 🛠️ **[Guía de Contribución y Configuración](./CONTRIBUTING.md)** | Desarrolladores y Administradores de BD | Requisitos previos, script DDL/DML de SQL Server, variables de entorno (`.env`), endpoints API y flujo de Git. |

---

## ⚡ Características Principales

* **Alta Disponibilidad Real:** Conexión transparente mediante el Listener de SQL Server Always On.
* **Consola Transaccional:** Historial individual aislado por cliente (envíos y recibos) y transferencias inmediatas mediante el procedimiento almacenado `sp_TransferirDinero`.
* **Monitoreo en Tiempo Real:** Detección continua de la réplica activa (`SELECT @@SERVERNAME`), medición de latencia y registro en vivo vía WebSockets (Socket.IO).
* **Simulador de Carga Transaccional:** Generador de transferencias masivas continuas para validar la conmutación por error en vivo.
* **Diseño Nothing Adaptativo:** Interfaz sobria y funcional con botones táctiles cuadrados redondeados, soporte responsivo para móviles mediante cajones laterales y temas claro/oscuro.

---

## 🚀 Inicio Rápido

1. Instalar dependencias:
   ```bash
   pnpm install
   ```
2. Configurar variables de entorno copiando `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```
3. Iniciar en modo desarrollo:
   ```bash
   pnpm dev
   ```
4. Acceder en el navegador:
   [http://localhost:3000](http://localhost:3000)

---

## 📄 Licencia

Este proyecto está bajo los términos de la licencia MIT. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
