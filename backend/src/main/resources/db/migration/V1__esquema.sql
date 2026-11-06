CREATE TABLE usuario (
    id_usuario INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMINISTRADOR', 'VENDEDOR', 'BODEGA')),
    estado VARCHAR(10) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
    fecha_retiro TIMESTAMP NULL
);

CREATE TABLE producto (
    id_producto INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    referencia VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    precio_unitario NUMERIC(12, 0) NOT NULL CHECK (precio_unitario > 0),
    stock_actual INT NOT NULL CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0)
);

CREATE TABLE pedido (
    id_pedido INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    nombre_cliente VARCHAR(150) NOT NULL,
    telefono_cliente VARCHAR(20) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT now(),
    estado VARCHAR(15) NOT NULL DEFAULT 'PENDIENTE' CHECK (
        estado IN ('PENDIENTE', 'CONFIRMADO', 'DESPACHADO', 'CANCELADO', 'RECHAZADO')
    ),
    total NUMERIC(12, 0) NOT NULL CHECK (total >= 0)
);

CREATE TABLE detalle_pedido (
    id_detalle INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_producto INT NOT NULL REFERENCES producto(id_producto) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario_venta NUMERIC(12, 0) NOT NULL CHECK (precio_unitario_venta > 0),
    subtotal NUMERIC(12, 0) GENERATED ALWAYS AS (cantidad * precio_unitario_venta) STORED,
    CONSTRAINT uq_pedido_producto UNIQUE (id_pedido, id_producto)
);

CREATE TABLE historial_estado (
    id_historial INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_pedido INT NOT NULL REFERENCES pedido(id_pedido) ON DELETE RESTRICT,
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE RESTRICT,
    estado_anterior VARCHAR(15) NULL,
    estado_nuevo VARCHAR(15) NOT NULL,
    fecha_hora TIMESTAMP NOT NULL DEFAULT now(),
    motivo TEXT NULL,
    CONSTRAINT chk_motivo_obligatorio CHECK (
        (estado_nuevo NOT IN ('RECHAZADO', 'CANCELADO')) 
        OR (motivo IS NOT NULL AND trim(motivo) <> '')
    )
);