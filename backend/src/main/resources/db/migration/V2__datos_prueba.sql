INSERT INTO usuario (username, contrasena_hash, nombre_completo, rol, estado, fecha_retiro)
VALUES 
    ('admin', '$2a$10$wT0vFjBfqE4k681hU.yZvew9Q3EwU1P3i.qYQv.Y9tKjH4D7VlhCe', 'Administrador General', 'ADMINISTRADOR', 'ACTIVO', NULL),
    ('vendedor1', '$2a$10$wT0vFjBfqE4k681hU.yZvew9Q3EwU1P3i.qYQv.Y9tKjH4D7VlhCe', 'Vendedor de Turno', 'VENDEDOR', 'ACTIVO', NULL),
    ('bodega1', '$2a$10$wT0vFjBfqE4k681hU.yZvew9Q3EwU1P3i.qYQv.Y9tKjH4D7VlhCe', 'Encargada de Bodega', 'BODEGA', 'ACTIVO', NULL);

INSERT INTO producto (referencia, nombre, descripcion, precio_unitario, stock_actual, stock_minimo)
VALUES 
    ('REF-001', 'Detergente Multiusos 1L', 'Detergente líquido biodegradable para pisos y superficies', 12000, 20, 5),
    ('REF-002', 'Jabón Antibacterial 500ml', 'Jabón líquido antibacterial para manos con dispensador', 8500, 8, 3),
    ('REF-003', 'Desinfectante Lavanda 1 Galón', 'Limpiador desinfectante concentrado aroma a lavanda', 18000, 15, 4),
    ('REF-004', 'Cloro Concentrado 3.8L', 'Blanqueador y desinfectante clorado uso comercial', 9500, 25, 5),
    ('REF-005', 'Limpiavidrios Anti-empañante 500ml', 'Solución limpiadora transparente para cristales y vidrios', 7200, 12, 3),
    ('REF-006', 'Desengrasante Industrial 1 Galón', 'Removedor de grasa pesada para cocinas y restaurantes', 26000, 10, 2),
    ('REF-007', 'Jabón en Barra Lavaplatos 250g', 'Jabón sólido arrancagrasa para vajillas', 3500, 40, 10),
    ('REF-008', 'Suavizante Textil 3L', 'Acondicionador suavizante aroma floral para ropa', 16500, 14, 4),
    ('REF-009', 'Ambientador en Spray 400ml', 'Neutralizador de olores aroma cítrico de larga duración', 8900, 18, 5),
    ('REF-010', 'Cera Autobrillante para Pisos 1L', 'Protector y sellador brillante para pisos duros', 14500, 11, 2),
    ('REF-011', 'Lustramuebles Aerosol 300ml', 'Limpiador protector de maderas con silicona', 11000, 16, 3),
    ('REF-012', 'Ácido Muriático 1L', 'Limpiador ácido para sarro y residuos en sanitarios', 7800, 10, 2),
    ('REF-013', 'Esponja de Fibra Abrasiva x3', 'Pack de 3 unidades esponja doble uso cocina', 4500, 50, 15),
    ('REF-014', 'Toalla de Microfibra 40x40cm', 'Paño absorbente multiuso atrapapolvo sin rayones', 5000, 35, 10),
    ('REF-015', 'Escoba Barrendera Sintética', 'Escoba para exteriores e interiores sin cabo', 8500, 20, 5),
    ('REF-016', 'Trapero Hilaza de Algodón 350g', 'Trapero repuesto absorbente para pisos', 9000, 22, 6),
    ('REF-017', 'Guantes de Látex Calibre 35', 'Guantes de caucho resistentes para limpieza pesada', 6200, 30, 8),
    ('REF-018', 'Bolsas para Basura 65x90cm x10', 'Paquete de 10 bolsas negras de alta resistencia', 7500, 45, 10),
    ('REF-019', 'Alcohol Antiséptico 70% 1L', 'Alcohol líquido sanitizante multiuso', 10500, 20, 5),
    ('REF-020', 'Dispensador de Toallas de Papel', 'Dispensador manual de pared para baños comerciales', 32000, 6, 2);