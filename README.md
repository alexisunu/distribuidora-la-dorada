# Distribuidora La Dorada S.A.S

Aplicación web para registrar pedidos y controlar el inventario de una distribuidora de productos de limpieza. Proyecto integrador, Ingeniería Informática, Universidad de Caldas.

## Tecnologías

- Backend: Java 21, Spring Boot, Spring Data JPA, Spring Security, Flyway
- Base de datos: PostgreSQL
- Frontend: Angular con componentes propios (sin Angular Material)


## Estructura del Proyecto

```

├── backend/       API REST con Spring Boot (paquete co.ladorada.backend)
├── frontend/      Aplicación web en Angular
└── docs/

├── pruebas/   Guiones cURL (TC-01, TC-02, TC-03), scripts de reseteo y consultas SQL
└── ...        Documento técnico, diagramas y hojas de marca

```

Backend: `config`, `controller`, `service`, `repository`, `model`, `dto`, `exception`. Las migraciones de la base de datos están en `src/main/resources/db/migration`.

Frontend: `core` (sesión, guards, interceptores, servicios), `shared/ui` (componentes propios), `layout` y `features` (login, productos, pedidos, resumen, usuarios).

## Cómo ejecutarlo

Requisitos previos: **Java 21**, **Node.js (versión 20+)** y **PostgreSQL**.

Base de datos local (Docker): `docker compose up -d` en la raíz. Crea PostgreSQL con base, usuario y clave `ladorada`. Si usas un PostgreSQL propio, define `DB_URL`, `DB_USER` y `DB_PASSWORD`.

Backend:

```bash
cd backend
./mvnw spring-boot:run      # en Windows: .\mvnw spring-boot:run
```

Frontend:

```bash
cd frontend
npm install
npm start                   # http://localhost:4200
```

El frontend funciona sin backend mientras `USAR_MOCK` sea `true` en `frontend/src/app/core/config.ts`. Usuarios de prueba (clave 1234): `mrojas` (administrador), `lgomez` (vendedor), `msalazar` (bodega).

Comprobar el backend: http://localhost:8080/api/health debe responder `{"estado":"ok"}`.

La conexión a la base de datos se configura con variables de entorno o con `application-local.properties`. Ese archivo y los `.env` están ignorados por Git y no se suben.


## Usuarios de Prueba y Credenciales
La base de datos inicializa usuarios con la contraseña por defecto 1234:

- Administrador: admin (Gestión general y de usuarios)

- Vendedor: vendedor1 (Creación y gestión de pedidos)

- Bodega: bodega1 (Gestión de inventarios y módulo de despachos)

## Pruebas Funcionales y Automatización (cURL)
El proyecto incluye guiones y scripts automatizados para la validación de escenarios de negocio (TC-01, TC-02, TC-03):

- Guiones detallados: docs/pruebas/guiones_tc01_tc02.md

- Scripts ejecutables: docs/pruebas/sprint2_curl.sh y docs/pruebas/sprint3_curl.sh

- Reinicio de existencias: docs/pruebas/reset_tc.sql (para restaurar stocks iniciales en PostgreSQL).

## Reglas de Negocio Clave
Edición de pedidos: Un pedido en estado Pendiente solo permite ajustes parciales a la baja (disminuir cantidades o eliminar líneas de productos). No se permite agregar nuevos ítems ni editar pedidos que ya se encuentren en estado Confirmado, Despachado, Cancelado o Rechazado.

- Transiciones de estado:

- Rechazado solo se permite desde Pendiente (sin afectar inventario).

- Cancelado solo se permite desde Confirmado (con reintegro automático de existencias al inventario).

## Ramas

- `main`: versión estable y entregable.
- `develop`: integración. Cada funcionalidad se trabaja en su propia rama y entra por pull request.

## Despliegue

Pendiente de definir. Aquí irá el enlace de la aplicación desplegada.

## Equipo

Max, Alejandra y Alexis.
