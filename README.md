# Distribuidora La Dorada S.A.S

Aplicación web para registrar pedidos y controlar el inventario de una distribuidora de productos de limpieza. Proyecto integrador, Ingeniería Informática, Universidad de Caldas.

## Tecnologías

- Backend: Java 21, Spring Boot, Spring Data JPA, Spring Security, Flyway
- Base de datos: PostgreSQL
- Frontend: Angular con componentes propios (sin Angular Material)

## Estructura

```
├── backend/    API REST con Spring Boot (paquete co.ladorada.backend)
├── frontend/   Aplicación Angular
└── docs/       Documento técnico, diagramas y hoja de marca
```

Backend: `config`, `controller`, `service`, `repository`, `model`, `dto`, `exception`. Las migraciones de la base de datos están en `src/main/resources/db/migration`.

Frontend: `core` (sesión, guards, interceptores, servicios), `shared/ui` (componentes propios), `layout` y `features` (login, productos, pedidos, resumen, usuarios).

## Cómo ejecutarlo

Requisitos: Java 21, Node 20 o superior y PostgreSQL.

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

La conexión a la base de datos se configura con variables de entorno o con `application-local.properties`. Ese archivo y los `.env` están ignorados por Git y no se suben.

## Ramas

- `main`: versión estable y entregable.
- `develop`: integración. Cada funcionalidad se trabaja en su propia rama y entra por pull request.

## Despliegue

Pendiente de definir. Aquí irá el enlace de la aplicación desplegada.

## Equipo

Alejandra Villegas, Max y Alexis.
