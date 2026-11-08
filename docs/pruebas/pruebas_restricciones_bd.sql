-- Demostración de restricciones de integridad en PostgreSQL (Apartado 5.6 / 5.8)
-- Contiene ROLLBACK al final para no alterar ni ensuciar los datos reales.

BEGIN;

-- Creamos un pedido temporal válido en la transacción para las pruebas de detalle e historial
INSERT INTO pedido (id_usuario, nombre_cliente, telefono_cliente, estado, total)
VALUES (1, 'Cliente Prueba SQL', '3000000000', 'PENDIENTE', 12000);

-- PRUEBA 1A: Historial RECHAZADO o CANCELADO sin motivo (NULL)
-- Regla: CONSTRAINT chk_motivo_obligatorio
-- Resultado esperado: ERROR: el nuevo registro para la relación «historial_estado» 

SAVEPOINT sp_motivo_null;
INSERT INTO historial_estado (id_pedido, id_usuario, estado_anterior, estado_nuevo, motivo)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 'PENDIENTE', 'RECHAZADO', NULL);
ROLLBACK TO SAVEPOINT sp_motivo_null;

-- PRUEBA 1B: Historial CANCELADO con motivo en blanco ('   ')
-- Regla: CONSTRAINT chk_motivo_obligatorio (trim(motivo) <> '')
-- Resultado esperado: ERROR: viola la restricción «check» «chk_motivo_obligatorio»

SAVEPOINT sp_motivo_blanco;
INSERT INTO historial_estado (id_pedido, id_usuario, estado_anterior, estado_nuevo, motivo)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 'CONFIRMADO', 'CANCELADO', '   ');
ROLLBACK TO SAVEPOINT sp_motivo_blanco;

-- PRUEBA 2: Detalle de pedido con cantidad 0 (o negativa)
-- Regla: CHECK (cantidad > 0) en tabla detalle_pedido
-- Resultado esperado: ERROR: viola la restricción «check» «detalle_pedido_cantidad_check»

SAVEPOINT sp_cantidad_cero;
INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_venta)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 0, 12000);
ROLLBACK TO SAVEPOINT sp_cantidad_cero;

-- PRUEBA 3: Mismo producto dos veces en un mismo pedido
-- Regla: CONSTRAINT uq_pedido_producto UNIQUE (id_pedido, id_producto)
-- Resultado esperado: ERROR: llave duplicada viola restricción de unicidad «uq_pedido_producto»

SAVEPOINT sp_producto_duplicado;
-- Primera inserción (válida)
INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_venta)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 2, 12000);
-- Segunda inserción del mismo id_producto = 1 en el mismo pedido (FALLA)
INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_venta)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 3, 12000);
ROLLBACK TO SAVEPOINT sp_producto_duplicado;

-- PRUEBA 4: Producto con stock negativo
-- Regla: CHECK (stock_actual >= 0) en tabla producto
-- Resultado esperado: ERROR: viola la restricción «check» «producto_stock_actual_check»

SAVEPOINT sp_stock_negativo;
UPDATE producto SET stock_actual = -1 WHERE id_producto = 1;
ROLLBACK TO SAVEPOINT sp_stock_negativo;

-- PRUEBA 5: Pedido con estado en minúscula ('pendiente')
-- Regla: CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'DESPACHADO', 'CANCELADO', 'RECHAZADO'))
-- Resultado esperado: ERROR: viola la restricción «check» «pedido_estado_check»

SAVEPOINT sp_estado_minuscula;
INSERT INTO pedido (id_usuario, nombre_cliente, telefono_cliente, estado, total)
VALUES (1, 'Tienda Prueba', '3112223344', 'pendiente', 10000);
ROLLBACK TO SAVEPOINT sp_estado_minuscula;

-- PRUEBA 6: Insertar subtotal a mano en detalle_pedido
-- Regla: subtotal GENERATED ALWAYS AS (cantidad * precio_unitario_venta) STORED
-- Resultado esperado: ERROR: no se puede insertar un valor distinto de DEFAULT 

SAVEPOINT sp_subtotal_manual;
INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio_unitario_venta, subtotal)
VALUES (currval(pg_get_serial_sequence('pedido', 'id_pedido')), 1, 2, 12000, 99999);
ROLLBACK TO SAVEPOINT sp_subtotal_manual;

-- Revertir toda la transacción para dejar la base de datos intacta
ROLLBACK;