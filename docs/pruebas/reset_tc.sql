-- Deja las existencias de los escenarios TC-01 y TC-02 como en V2__datos_prueba.sql.
-- Ejecutar con: psql -h localhost -U ladorada -d ladorada -f docs/pruebas/reset_tc.sql
-- NO es una migración de Flyway: no va en db/migration.
UPDATE producto SET stock_actual = 20 WHERE referencia = 'REF-001';  -- Detergente (TC-01)
UPDATE producto SET stock_actual = 8  WHERE referencia = 'REF-002';  -- Jabón (TC-02)
UPDATE producto SET stock_actual = 40 WHERE referencia = 'REF-007';  -- Jabón en barra (sprint3_curl.sh)
