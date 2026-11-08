# Guiones de Pruebas Funcionales TC-01 y TC-02 (con cURL)

> **Nota:** En Windows PowerShell se utiliza `curl.exe` para invocar el binario real de cURL y evitar el alias `Invoke-WebRequest`.

---

## Preparación: Paso 1 - Iniciar sesión (Login) y obtener Token JWT
Usuarios disponibles: `admin`, `vendedor1`, `bodega1` | Clave: `1234`

```bash
curl.exe -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"vendedor1\", \"password\": \"1234\"}"


-- Escenario TC-01: Pedido válido con descuento único e idempotencia
-- 1. Consultar stock inicial del producto (REF-001 = 20)

curl.exe -i -X GET http://localhost:8080/api/productos/1 \
  -H "Authorization: Bearer $TOKEN"

-- 2. Crear el pedido en estado PENDIENTE (5 unidades de idProducto 1)

Bash
curl.exe -i -X POST http://localhost:8080/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente\": \"Tienda El Sol\", \"telefonoCliente\": \"3101234567\", \"lineas\": [{\"idProducto\": 1, \"cantidad\": 5}]}"


-- 3. Confirmar el pedido por primera vez (Debe pasar a CONFIRMADO)

Bash
curl.exe -i -X POST http://localhost:8080/api/pedidos/1/confirmar \
  -H "Authorization: Bearer $TOKEN"


-- 4. Consultar producto y verificar descuento (Stock debe ser 15)

Bash
curl.exe -i -X GET http://localhost:8080/api/productos/1 \
  -H "Authorization: Bearer $TOKEN"


-- 5. Intentar confirmar por segunda vez el mismo pedido (Prueba de no doble descuento)

Bash
curl.exe -i -X POST http://localhost:8080/api/pedidos/1/confirmar \
  -H "Authorization: Bearer $TOKEN"


-- 6. Reconsultar producto (Stock debe mantenerse intacto en 15)

Bash
curl.exe -i -X GET http://localhost:8080/api/productos/1 \
  -H "Authorization: Bearer $TOKEN"



-- Escenario TC-02: Pedido inválido por existencias insuficientes
-- 1. Consultar stock inicial del producto (REF-002 = 8)

Bash
curl.exe -i -X GET http://localhost:8080/api/productos/2 \
  -H "Authorization: Bearer $TOKEN"


-- 2. Crear el pedido en estado PENDIENTE (12 unidades de idProducto 2)

Bash
curl.exe -i -X POST http://localhost:8080/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente\": \"Restaurante La Plaza\", \"telefonoCliente\": \"3209876543\", \"lineas\": [{\"idProducto\": 2, \"cantidad\": 12}]}"


-- 3. Intentar confirmar el pedido (Debe responder 409 Conflict)

Bash
curl.exe -i -X POST http://localhost:8080/api/pedidos/2/confirmar \
  -H "Authorization: Bearer $TOKEN"


-- 4. Reconsultar producto (Stock debe permanecer intacto en 8)

Bash
curl.exe -i -X GET http://localhost:8080/api/productos/2 \
  -H "Authorization: Bearer $TOKEN"