# Guiones de Pruebas Funcionales TC-01 y TC-02 (con cURL)

Estos escenarios están cubiertos de forma automatizada en `docs/pruebas/sprint2_curl.sh` y el restablecimiento de existencias se encuentra en `docs/pruebas/reset_tc.sql`.

## Preparación: Paso 1 - Iniciar sesión (Login) y obtener Token JWT
- **Usuarios:** `admin`, `vendedor1`, `bodega1`
- **Contraseña:** `1234`

```bash
# 0. Login y captura del Token JWT
curl.exe -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"vendedor1\", \"password\": \"1234\"}"

# Guardar el token devuelto en la respuesta:
TOKEN="PEGAR_AQUI_EL_TOKEN_RECIBIDO"





# 1. Consultar stock inicial del producto (REF-001 = 20)
curl.exe -i -X GET "http://localhost:8080/api/productos?q=REF-001" \
  -H "Authorization: Bearer $TOKEN"

# 2. Crear el pedido en estado PENDIENTE (5 unidades de idProducto 1)
curl.exe -i -X POST http://localhost:8080/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente\": \"Tienda El Sol\", \"telefonoCliente\": \"3101234567\", \"lineas\": [{\"idProducto\": 1, \"cantidad\": 5}]}"

# Guardar el id del pedido devuelto en el JSON del POST anterior:
ID_PEDIDO="PEGAR_ID_DEL_PEDIDO_CREADO"

# 3. Confirmar el pedido por primera vez (Pasa a CONFIRMADO)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" \
  -H "Authorization: Bearer $TOKEN"

# 4. Consultar producto y verificar descuento de stock (Stock = 15)
curl.exe -i -X GET "http://localhost:8080/api/productos?q=REF-001" \
  -H "Authorization: Bearer $TOKEN"

# 5. Intentar confirmar nuevamente el mismo pedido (Validación de idempotencia)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" \
  -H "Authorization: Bearer $TOKEN"

# 6. Reconsultar producto (El stock debe permanecer en 15)
curl.exe -i -X GET "http://localhost:8080/api/productos?q=REF-001" \
  -H "Authorization: Bearer $TOKEN"








# 1. Consultar stock inicial del producto (REF-002 = 8)
curl.exe -i -X GET "http://localhost:8080/api/productos?q=REF-002" \
  -H "Authorization: Bearer $TOKEN"

# 2. Crear el pedido en estado PENDIENTE (12 unidades de idProducto 2)
curl.exe -i -X POST http://localhost:8080/api/pedidos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"cliente\": \"Restaurante La Plaza\", \"telefonoCliente\": \"3209876543\", \"lineas\": [{\"idProducto\": 2, \"cantidad\": 12}]}"

# Guardar el id del nuevo pedido devuelto en el JSON del POST anterior:
ID_PEDIDO="PEGAR_ID_DEL_SEGUNDO_PEDIDO"

# 3. Intentar confirmar el pedido (Debe rechazar con 409 Conflict)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" \
  -H "Authorization: Bearer $TOKEN"

# 4. Reconsultar producto (El stock debe conservarse en 8)
curl.exe -i -X GET "http://localhost:8080/api/productos?q=REF-002" \
  -H "Authorization: Bearer $TOKEN"

```
