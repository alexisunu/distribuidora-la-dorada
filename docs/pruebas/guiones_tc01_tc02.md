# Guiones de Pruebas Funcionales TC-01 y TC-02 (con cURL)

Estos escenarios están cubiertos de forma automatizada en `docs/pruebas/sprint2_curl.sh` y el restablecimiento de existencias se encuentra en `docs/pruebas/reset_tc.sql`.

---

## Preparación: Paso 1 - Iniciar sesión (Login) y obtener Token JWT automáticamente
- **Usuarios:** `admin`, `vendedor1`, `bodega1`
- **Contraseña:** `1234`

```powershell
$LOGIN_RESP = curl.exe -s -X POST http://localhost:8080/api/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\": \"vendedor1\", \"password\": \"1234\"}'
$TOKEN = ($LOGIN_RESP | ConvertFrom-Json).token
```

---

## Escenario TC-01: Pedido válido con descuento único e idempotencia
- **Producto:** Detergente Multiusos 1L (`REF-001`, `idProducto: 1`)
- **Stock inicial:** 20 unidades | **Cantidad solicitada:** 5 unidades
- **Resultado esperado:** El pedido pasa a `Confirmado`, las existencias bajan a `15` y una segunda confirmación devuelve `409 Conflict` manteniendo las existencias en `15`.

```powershell
# 1. Consultar stock inicial del producto (REF-001 = 20)
curl.exe -s "http://localhost:8080/api/productos?q=REF-001" -H "Authorization: Bearer $TOKEN"

# 2. Crear el pedido en estado Pendiente y capturar ID automáticamente
$PEDIDO_TC01 = curl.exe -s -X POST http://localhost:8080/api/pedidos `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{\"cliente\": \"Tienda El Sol\", \"telefonoCliente\": \"3101234567\", \"lineas\": [{\"idProducto\": 1, \"cantidad\": 5}]}'
$ID_PEDIDO = ($PEDIDO_TC01 | ConvertFrom-Json).id

# 3. Confirmar el pedido por primera vez (Pasa a Confirmado)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" -H "Authorization: Bearer $TOKEN"

# 4. Consultar producto y verificar descuento de stock (Existencias = 15)
curl.exe -s "http://localhost:8080/api/productos?q=REF-001" -H "Authorization: Bearer $TOKEN"

# 5. Intentar confirmar nuevamente el mismo pedido (Validación de idempotencia -> 409)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" -H "Authorization: Bearer $TOKEN"

# 6. Reconsultar producto (Las existencias deben permanecer en 15)
curl.exe -s "http://localhost:8080/api/productos?q=REF-001" -H "Authorization: Bearer $TOKEN"
```

---

## Escenario TC-02: Pedido inválido por existencias insuficientes
- **Producto:** Jabón Antibacterial 500ml (`REF-002`, `idProducto: 2`)
- **Stock inicial:** 8 unidades | **Cantidad solicitada:** 12 unidades
- **Resultado esperado:** HTTP `409 Conflict` indicando existencias insuficientes, el pedido permanece en `Pendiente` y las existencias se mantienen en `8`.

```powershell
# 1. Consultar stock inicial del producto (REF-002 = 8)
curl.exe -s "http://localhost:8080/api/productos?q=REF-002" -H "Authorization: Bearer $TOKEN"

# 2. Crear el pedido en estado Pendiente y capturar ID automáticamente
$PEDIDO_TC02 = curl.exe -s -X POST http://localhost:8080/api/pedidos `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer $TOKEN" `
  -d '{\"cliente\": \"Restaurante La Plaza\", \"telefonoCliente\": \"3209876543\", \"lineas\": [{\"idProducto\": 2, \"cantidad\": 12}]}'
$ID_PEDIDO = ($PEDIDO_TC02 | ConvertFrom-Json).id

# 3. Intentar confirmar el pedido (Debe rechazar con 409 Conflict)
curl.exe -i -X POST "http://localhost:8080/api/pedidos/$ID_PEDIDO/confirmar" -H "Authorization: Bearer $TOKEN"

# 4. Reconsultar producto (Las existencias deben conservarse en 8)
curl.exe -s "http://localhost:8080/api/productos?q=REF-002" -H "Authorization: Bearer $TOKEN"
```