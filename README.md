# 🌐 Banco HA — Demostración Interactiva Web (Client-Side)

> 🚀 **Versión 100% Client-Side:** Esta rama contiene la versión estática desacoplada del sistema, optimizada para ejecutarse directamente en el navegador sin requerir Node.js, Express ni servidores de base de datos activos. Ideal para presentaciones, ferias y evaluaciones académicas.

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live%20Demo-brightgreen?logo=github)](https://rynrizn.github.io/sql-alwayson-visualizer/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## 🔗 Acceso en Vivo

Puedes acceder inmediatamente a la demostración alojada en GitHub Pages:

👉 **[https://rynrizn.github.io/sql-alwayson-visualizer/](https://rynrizn.github.io/sql-alwayson-visualizer/)**

---

## 🎯 Propósito de esta Rama (`demo-web`)

Esta rama está diseñada para resolver la necesidad de demostrar el funcionamiento de un **Clúster de Alta Disponibilidad** en cualquier entorno (incluyendo celulares, tablets y laptops sin infraestructura instalada):

* **Simulación en Memoria y LocalStorage:** Las cuentas, transferencias y balances se gestionan en el navegador mediante el motor client-side en JavaScript Vanilla.
* **Compatibilidad Conceptual Multi-Motor:** La plataforma y sus guías interactivas ilustran los principios de tolerancia a fallos aplicables tanto a **Microsoft SQL Server Always On Availability Groups** como a **PostgreSQL Streaming Replication**.
* **Simulador de Failover Realista:** Botón de contingencia que recrea la ventana de detección y conmutación de réplicas (~2.5 segundos) cambiando visualmente el nodo activo de `LAPTOP-01` a `LAPTOP-02`.
* **Generador de Carga Masiva:** Envío continuo y automático de transacciones para comprobar cómo el sistema preserva la integridad del saldo (RPO = 0).

---

## 📂 Estructura de la Carpeta Web (`docs/`)

La carpeta `docs/` contiene todos los recursos necesarios para el despliegue en GitHub Pages:

```text
docs/
├── index.html       # Landing page informativa: objetivos, arquitectura de 3 capas y ciclo de failover
├── demo.html        # Consola bancaria interactiva: chat transaccional, perfiles y panel de monitoreo
├── css/
│   └── styles.css   # Sistema de diseño Nothing (modo claro/oscuro, bordes punteados, responsive)
├── js/
│   ├── landing.js   # Interactividad del ciclo de conmutación paso a paso en la landing
│   └── demo.js      # Motor client-side de transacciones, estados de réplicas y persistencia
└── assets/
    ├── favicon.ico  # Ícono oficial del banco
    └── LogoLink.png # Código QR oficial para escaneo rápido desde smartphones
```

---

## 💻 Cómo Ejecutarla Localmente

No se requiere instalar dependencias ni levantar servicios:

1. **Opción 1: Abrir directamente en el navegador**
   * Haz doble clic sobre [`docs/index.html`](./docs/index.html) para explorar la landing.
   * Haz doble clic sobre [`docs/demo.html`](./docs/demo.html) para entrar directo a la consola.

2. **Opción 2: Usar un servidor web estático local (opcional)**
   ```bash
   # Con Python 3:
   cd docs && python -m http.server 8080

   # O con extensiones como Live Server en VS Code / Antigravity IDE
   ```
   Luego ingresa a `http://localhost:8080`.

---

## 🔀 Relación con las Demás Ramas

| Rama | Tipo | Descripción |
| :--- | :--- | :--- |
| **`demo-web`** *(esta rama)* | **Client-Side** | Demo estática para navegador, alojada en GitHub Pages, sin backend requerido. |
| **`main`** | **Full-Stack** | Servidor Node.js + Express + WebSockets conectado a **SQL Server Always On**. |
| **`postgresql-ubuntu`** | **Full-Stack** | Servidor Node.js + driver `pg` adaptado a **PostgreSQL en Ubuntu Server**. |

---

## 📄 Licencia

Este proyecto está bajo los términos de la licencia MIT. Consulta el archivo [LICENSE](./LICENSE) para más detalles.
