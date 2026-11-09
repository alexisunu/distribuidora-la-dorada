-- Consultas SQL de soporte para el Documento Técnico (Apartados 5.3, 5.6 y 5.9)


-- 1. RESUMEN DE PEDIDOS POR ESTADO (RF-16)
SELECT 
    e.estado,
    COALESCE(COUNT(p.id_pedido), 0) AS total_pedidos,
    COALESCE(SUM(p.total), 0) AS valor_total_acumulado
FROM (
    VALUES ('PENDIENTE'), ('CONFIRMADO'), ('DESPACHADO'), ('CANCELADO'), ('RECHAZADO')
) AS e(estado)
LEFT JOIN pedido p ON p.estado = e.estado
GROUP BY e.estado
ORDER BY 
    CASE e.estado
        WHEN 'PENDIENTE'  THEN 1
        WHEN 'CONFIRMADO' THEN 2
        WHEN 'DESPACHADO' THEN 3
        WHEN 'CANCELADO'  THEN 4
        WHEN 'RECHAZADO'  THEN 5
    END;

-- 2. LISTADO DE PEDIDOS FILTRADO POR ESTADO CON USUARIO RESPONSABLE (RF-08, RF-13, RF-17)
-- Usa NULLIF(:'estado'::text, '') para permitir filtro vacío ('') o un estado específico
SELECT 
    p.id_pedido,
    p.nombre_cliente,
    p.telefono_cliente,
    p.fecha_creacion,
    p.estado,
    p.total,
    u.username AS usuario_creador,
    u.nombre_completo AS nombre_responsable
FROM pedido p
INNER JOIN usuario u ON p.id_usuario = u.id_usuario
WHERE (NULLIF(:'estado'::text, '') IS NULL OR p.estado = NULLIF(:'estado'::text, ''))
ORDER BY p.fecha_creacion DESC;

-- 3A. DETALLE DE UN PEDIDO: CABECERA E ÍTEMS CON SUBTOTAL CALCULADO (RF-03, RF-08, RF-12)
SELECT 
    p.id_pedido,
    p.nombre_cliente,
    p.telefono_cliente,
    p.fecha_creacion,
    p.estado,
    p.total,
    u.nombre_completo AS registrado_por,
    pr.referencia,
    pr.nombre AS producto,
    dp.cantidad,
    dp.precio_unitario_venta,
    dp.subtotal
FROM pedido p
INNER JOIN usuario u ON p.id_usuario = u.id_usuario
INNER JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
INNER JOIN producto pr ON dp.id_producto = pr.id_producto
WHERE p.id_pedido = :'id_pedido'::int
ORDER BY dp.id_detalle ASC;

-- 3B. HISTORIAL DE AUDITORÍA Y TRAZABILIDAD DE UN PEDIDO (RF-08, RF-17, RNF-05)
SELECT 
    h.id_historial,
    h.id_pedido,
    h.fecha_hora,
    COALESCE(h.estado_anterior, '— (Creación)') AS estado_anterior,
    h.estado_nuevo,
    u.username AS usuario_ejecutor,
    u.nombre_completo AS nombre_ejecutor,
    u.rol AS rol_ejecutor,
    COALESCE(h.motivo, 'Sin observación') AS motivo
FROM historial_estado h
INNER JOIN usuario u ON h.id_usuario = u.id_usuario
WHERE h.id_pedido = :'id_pedido'::int
ORDER BY h.fecha_hora ASC, h.id_historial ASC;