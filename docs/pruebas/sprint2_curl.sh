#!/usr/bin/env bash
# Pruebas del Sprint 2 (pedidos). Con el backend corriendo en http://localhost:8080:
#   bash docs/pruebas/sprint2_curl.sh
# Solo usa curl, sed, grep y tr (funciona en Git Bash). Antes de repetir TC-01 ejecuta reset_tc.sql.
BASE=${BASE:-http://localhost:8080/api}
OK=0; FALLOS=0

login() { curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"1234\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }

# api METODO RUTA TOKEN [CUERPO]  ->  deja el código HTTP en $CODIGO y la respuesta en $CUERPO
api() {
  local salida
  if [ -n "$4" ]; then
    salida=$(curl -s -w '\n%{http_code}' -X "$1" "$BASE$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json' -d "$4")
  else
    salida=$(curl -s -w '\n%{http_code}' -X "$1" "$BASE$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json')
  fi
  CODIGO=$(echo "$salida" | tail -n1); CUERPO=$(echo "$salida" | sed '$d')
}

verificar() {  # verificar "descripcion" "esperado" "obtenido"
  if [ "$2" = "$3" ]; then echo "  PASA   $1"; OK=$((OK+1)); else echo "  FALLA  $1  (esperado: $2 | obtenido: $3)"; FALLOS=$((FALLOS+1)); fi
}
contiene() {   # contiene "descripcion" "texto" "$CUERPO"
  if echo "$3" | grep -qF "$2"; then echo "  PASA   $1"; OK=$((OK+1)); else echo "  FALLA  $1  (no aparece: $2) -> $3"; FALLOS=$((FALLOS+1)); fi
}
no_contiene() {  # no_contiene "descripcion" "texto" "$CUERPO"
  if echo "$3" | grep -qF "$2"; then echo "  FALLA  $1  (aparece: $2)"; FALLOS=$((FALLOS+1)); else echo "  PASA   $1"; OK=$((OK+1)); fi
}
id_de()     { echo "$1" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -n1; }
stock_de()  { api GET "/productos?q=$1" "$ADMIN"; echo "$CUERPO" | sed -n 's/.*"existencias":\([0-9]*\).*/\1/p' | head -n1; }
prod_id()   { api GET "/productos?q=$1" "$ADMIN"; id_de "$CUERPO"; }

ADMIN=$(login admin); VEND=$(login vendedor1); BOD=$(login bodega1)
[ -z "$ADMIN" ] || [ -z "$VEND" ] || [ -z "$BOD" ] && { echo "No se pudo iniciar sesión: ¿está corriendo el backend?"; exit 1; }
DET=$(prod_id REF-001); JAB=$(prod_id REF-002); BAR=$(prod_id REF-007)

echo "== TC-01: pedido válido con descuento único (Detergente) =="
ANTES=$(stock_de REF-001); echo "  existencias antes: $ANTES"
api POST /pedidos "$VEND" "{\"cliente\":\"Ferretería El Sol\",\"telefonoCliente\":\"3001234567\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":5}]}"
verificar "crear -> 201" 201 "$CODIGO"; contiene "queda Pendiente" '"estado":"Pendiente"' "$CUERPO"
contiene "historial inicial" 'Registro inicial del pedido' "$CUERPO"
P1=$(id_de "$CUERPO")
verificar "crear NO descuenta existencias" "$ANTES" "$(stock_de REF-001)"
api POST "/pedidos/$P1/confirmar" "$VEND"
verificar "confirmar -> 200" 200 "$CODIGO"; contiene "pasa a Confirmado" '"estado":"Confirmado"' "$CUERPO"
verificar "existencias bajan exactamente 5" "$((ANTES-5))" "$(stock_de REF-001)"
api POST "/pedidos/$P1/confirmar" "$VEND"
verificar "segunda confirmación -> 409" 409 "$CODIGO"
verificar "no se descuenta dos veces" "$((ANTES-5))" "$(stock_de REF-001)"

echo "== TC-02: existencias insuficientes (Jabón) =="
JANTES=$(stock_de REF-002); echo "  existencias antes: $JANTES"
api POST /pedidos "$VEND" "{\"cliente\":\"Hotel Mirador\",\"telefonoCliente\":\"3109876543\",\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":12}]}"
P2=$(id_de "$CUERPO")
api POST "/pedidos/$P2/confirmar" "$VEND"
verificar "confirmar -> 409" 409 "$CODIGO"
contiene "mensaje con el producto" "No hay existencias suficientes: " "$CUERPO"
contiene "nombra el producto" "Jabón Antibacterial 500ml" "$CUERPO"
contiene "cantidades solicitada y disponible" "(solicitaste 12, disponibles $JANTES)." "$CUERPO"
api GET "/pedidos/$P2" "$VEND"; contiene "el pedido sigue Pendiente" '"estado":"Pendiente"' "$CUERPO"
verificar "existencias sin cambios" "$JANTES" "$(stock_de REF-002)"

echo "== Doble confirmación simultánea (dos clics a la vez) =="
api POST /pedidos "$VEND" "{\"cliente\":\"Doble clic\",\"telefonoCliente\":\"3000000000\",\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":3}]}"
P3=$(id_de "$CUERPO"); BANTES=$(stock_de REF-007)
T=$(mktemp -d)
for i in 1 2; do curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/pedidos/$P3/confirmar" -H "Authorization: Bearer $VEND" > "$T/$i" & done; wait
CODIGOS=$(cat "$T/1" "$T/2" | tr -d '\r' | sort | tr '\n' ' '); rm -rf "$T"
verificar "una petición 200 y otra 409" "200 409 " "$CODIGOS"
verificar "se descuenta una sola vez" "$((BANTES-3))" "$(stock_de REF-007)"

echo "== Cancelar un Confirmado devuelve las existencias una sola vez =="
api POST "/pedidos/$P3/cancelar" "$VEND" '{"motivo":"El cliente desiste"}'
verificar "cancelar -> 200" 200 "$CODIGO"; contiene "queda Cancelado" '"estado":"Cancelado"' "$CUERPO"
verificar "existencias repuestas" "$BANTES" "$(stock_de REF-007)"
api POST "/pedidos/$P3/cancelar" "$VEND" '{"motivo":"El cliente desiste"}'
verificar "cancelar de nuevo -> 409" 409 "$CODIGO"
verificar "no se repone dos veces" "$BANTES" "$(stock_de REF-007)"

echo "== Editar un pedido Pendiente (el cliente acepta menos unidades) =="
EANTES=$(stock_de REF-002); echo "  existencias antes: $EANTES"
api POST /pedidos "$VEND" "{\"cliente\":\"Colegio San José\",\"telefonoCliente\":\"3012223344\",\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":12}]}"
P4=$(id_de "$CUERPO")
api PUT "/pedidos/$P4" "$VEND" "{\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":5}]}"
verificar "editar -> 200" 200 "$CODIGO"; contiene "sigue Pendiente" '"estado":"Pendiente"' "$CUERPO"
contiene "nueva cantidad" '"cantidad":5' "$CUERPO"
contiene "total recalculado (5 x 8500)" '"total":42500' "$CUERPO"
contiene "historial de la edición" 'Cantidades modificadas a solicitud del cliente' "$CUERPO"
verificar "editar NO toca las existencias" "$EANTES" "$(stock_de REF-002)"
api PUT "/pedidos/$P4" "$BOD" "{\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":4}]}"
verificar "Bodega no edita -> 403" 403 "$CODIGO"
api PUT "/pedidos/$P4" "$VEND" '{"lineas":[]}'
verificar "sin líneas -> 400" 400 "$CODIGO"
api PUT "/pedidos/$P4" "$VEND" "{\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":0}]}"
verificar "cantidad 0 -> 400" 400 "$CODIGO"
api PUT "/pedidos/$P4" "$VEND" "{\"lineas\":[{\"idProducto\":$DET,\"cantidad\":1}]}"
verificar "producto que no estaba en el pedido -> 400" 400 "$CODIGO"
api PUT /pedidos/99999 "$VEND" "{\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":1}]}"
verificar "pedido inexistente -> 404" 404 "$CODIGO"
api POST "/pedidos/$P4/confirmar" "$VEND"
verificar "confirmar el pedido editado -> 200" 200 "$CODIGO"
verificar "se descuentan las 5 unidades editadas" "$((EANTES-5))" "$(stock_de REF-002)"
api PUT "/pedidos/$P4" "$VEND" "{\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":1}]}"
verificar "editar un Confirmado -> 409" 409 "$CODIGO"
contiene "mensaje" "Solo se puede editar un pedido en estado Pendiente. El pedido está en estado Confirmado." "$CUERPO"

echo "== Editar: quitar líneas, sin cambios y errores =="
api POST /pedidos "$VEND" "{\"cliente\":\"Dos líneas\",\"telefonoCliente\":\"3000000001\",\"lineas\":[{\"idProducto\":$JAB,\"cantidad\":2},{\"idProducto\":$BAR,\"cantidad\":3}]}"
P5=$(id_de "$CUERPO")
api PUT "/pedidos/$P5" "$VEND" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":3}]}"
verificar "quitar una línea -> 200" 200 "$CODIGO"
api GET "/pedidos/$P5" "$VEND"    # GET aparte: prueba que la fila se borró de la base, no solo de la respuesta
no_contiene "la línea quitada ya no aparece" '"codigo":"REF-002"' "$CUERPO"
contiene "queda la otra línea" '"codigo":"REF-007"' "$CUERPO"
contiene "total recalculado (3 x 3500)" '"total":10500' "$CUERPO"
api PUT "/pedidos/$P5" "$VEND" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":3}]}"
verificar "guardar sin cambios -> 200" 200 "$CODIGO"
EDICIONES=$(echo "$CUERPO" | grep -o 'Cantidades modificadas a solicitud del cliente' | wc -l | tr -d ' ')
verificar "sin cambios el historial no crece (1 edición)" 1 "$EDICIONES"
api PUT "/pedidos/$P5" "$VEND" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1},{\"idProducto\":$BAR,\"cantidad\":2}]}"
verificar "producto repetido -> 400" 400 "$CODIGO"
api PUT "/pedidos/$P5" "$VEND" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":-2}]}"
verificar "cantidad negativa -> 400" 400 "$CODIGO"
api PUT "/pedidos/$P5" "$VEND" '{}'
verificar "cuerpo sin líneas -> 400" 400 "$CODIGO"
api PUT "/pedidos/$P5" "invalido" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1}]}"
verificar "token inválido -> 401" 401 "$CODIGO"
api PUT "/pedidos/$P5" "$ADMIN" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1}]}"
verificar "Administrador sí edita -> 200" 200 "$CODIGO"
api POST "/pedidos/$P5/rechazar" "$VEND" '{"motivo":"Otro"}'
api PUT "/pedidos/$P5" "$VEND" "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":2}]}"
verificar "editar un Rechazado -> 409" 409 "$CODIGO"
contiene "mensaje" "El pedido está en estado Rechazado." "$CUERPO"

echo "== Confirmar con varios productos sin existencias: un solo 409 con todos =="
SD=$(stock_de REF-001); SJ=$(stock_de REF-002); QD=$((SD+100)); QJ=$((SJ+100))
api POST /pedidos "$VEND" "{\"cliente\":\"Varios faltantes\",\"telefonoCliente\":\"3000000002\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":$QD},{\"idProducto\":$JAB,\"cantidad\":$QJ}]}"
P6=$(id_de "$CUERPO")
api POST "/pedidos/$P6/confirmar" "$VEND"
verificar "confirmar -> 409" 409 "$CODIGO"
contiene "nombra el primer producto" "Detergente Multiusos 1L (solicitaste $QD, disponibles $SD)" "$CUERPO"
contiene "nombra el segundo producto" "Antibacterial 500ml (solicitaste $QJ, disponibles $SJ)" "$CUERPO"
contiene "los separa con punto y coma" "; " "$CUERPO"
verificar "existencias de Detergente sin cambios" "$SD" "$(stock_de REF-001)"
verificar "existencias de Jabón sin cambios" "$SJ" "$(stock_de REF-002)"
api POST "/pedidos/$P6/rechazar" "$VEND" '{"motivo":"Existencias insuficientes"}'

echo "== Editar y confirmar a la vez: se turnan y el descuento coincide con lo que quedó =="
B2=$(stock_de REF-007)
api POST /pedidos "$VEND" "{\"cliente\":\"Carrera editar-confirmar\",\"telefonoCliente\":\"3000000003\",\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":4}]}"
P7=$(id_de "$CUERPO")
T=$(mktemp -d)
curl -s -o /dev/null -w '%{http_code}\n' -X PUT "$BASE/pedidos/$P7" -H "Authorization: Bearer $VEND" -H 'Content-Type: application/json' -d "{\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":2}]}" > "$T/1" &
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/pedidos/$P7/confirmar" -H "Authorization: Bearer $VEND" > "$T/2" &
wait
COD_EDITAR=$(tr -d '\r' < "$T/1"); COD_CONFIRMAR=$(tr -d '\r' < "$T/2"); rm -rf "$T"
verificar "confirmar responde 200" 200 "$COD_CONFIRMAR"
verificar "editar responde 200 (llegó antes) o 409 (llegó tarde)" "ok" "$([ "$COD_EDITAR" = 200 ] || [ "$COD_EDITAR" = 409 ] && echo ok || echo "$COD_EDITAR")"
api GET "/pedidos/$P7" "$VEND"; contiene "el pedido queda Confirmado" '"estado":"Confirmado"' "$CUERPO"
FINAL=$(echo "$CUERPO" | sed -n 's/.*"cantidad":\([0-9]*\).*/\1/p' | head -n1)
verificar "la cantidad final coincide con el resultado de editar" "$([ "$COD_EDITAR" = 200 ] && echo 2 || echo 4)" "$FINAL"
verificar "se descontó exactamente la cantidad final" "$((B2-FINAL))" "$(stock_de REF-007)"
api POST "/pedidos/$P7/cancelar" "$VEND" '{"motivo":"Otro"}'
verificar "al cancelar se reponen las existencias" "$B2" "$(stock_de REF-007)"

echo "== Rechazar y motivo obligatorio =="
api POST "/pedidos/$P2/rechazar" "$VEND" '{"motivo":""}'
verificar "rechazar sin motivo -> 400" 400 "$CODIGO"
contiene "mensaje" "Debe seleccionar un motivo para rechazar el pedido" "$CUERPO"
api POST "/pedidos/$P2/rechazar" "$VEND" '{"motivo":"Otra cosa inventada"}'
verificar "motivo fuera de la lista -> 400" 400 "$CODIGO"
api POST "/pedidos/$P2/rechazar" "$VEND" '{"motivo":"Existencias insuficientes"}'
verificar "rechazar con motivo -> 200" 200 "$CODIGO"; contiene "queda Rechazado" '"estado":"Rechazado"' "$CUERPO"
api POST "/pedidos/$P2/cancelar" "$VEND" '{"motivo":"Otro"}'
verificar "cancelar un Rechazado -> 409" 409 "$CODIGO"
api POST "/pedidos/$P1/rechazar" "$VEND" '{"motivo":"Otro"}'
verificar "rechazar un Confirmado -> 409" 409 "$CODIGO"

echo "== Roles y token =="
api POST "/pedidos/$P1/confirmar" "$BOD"; verificar "Bodega no confirma -> 403" 403 "$CODIGO"
api POST /pedidos "$BOD" "{\"cliente\":\"x\",\"telefonoCliente\":\"1\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":1}]}"
verificar "Bodega no crea -> 403" 403 "$CODIGO"
api GET /pedidos "$BOD"; verificar "Bodega no lista pedidos -> 403" 403 "$CODIGO"
api GET "/pedidos/$P1" "$BOD"; verificar "Bodega sí ve el detalle -> 200" 200 "$CODIGO"
api GET /pedidos "invalido"; verificar "token inválido -> 401" 401 "$CODIGO"
api GET /pedidos "$ADMIN"; verificar "Administrador lista -> 200" 200 "$CODIGO"

echo "== Validaciones y manipulación de parámetros =="
api POST /pedidos "$VEND" "{\"cliente\":\"Cant cero\",\"telefonoCliente\":\"3\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":0}]}"
verificar "cantidad 0 -> 400" 400 "$CODIGO"
api POST /pedidos "$VEND" "{\"cliente\":\"Cant neg\",\"telefonoCliente\":\"3\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":-2}]}"
verificar "cantidad -2 -> 400" 400 "$CODIGO"
api POST /pedidos "$VEND" "{\"cliente\":\"\",\"telefonoCliente\":\"3\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":1}]}"
verificar "sin cliente -> 400" 400 "$CODIGO"
contiene "mensaje" "El nombre y contacto del cliente son obligatorios para registrar el pedido" "$CUERPO"
api POST /pedidos "$VEND" '{"cliente":"Sin items","telefonoCliente":"3","lineas":[]}'
verificar "sin productos -> 400" 400 "$CODIGO"
api POST /pedidos "$VEND" "{\"cliente\":\"Repetido\",\"telefonoCliente\":\"3\",\"lineas\":[{\"idProducto\":$DET,\"cantidad\":1},{\"idProducto\":$DET,\"cantidad\":2}]}"
verificar "producto repetido -> 400" 400 "$CODIGO"
api POST /pedidos "$VEND" '{"cliente":"Fantasma","telefonoCliente":"3","lineas":[{"idProducto":99999,"cantidad":1}]}'
verificar "producto inexistente -> 404" 404 "$CODIGO"
api POST /pedidos "$VEND" "{\"cliente\":\"Tramposo\",\"telefonoCliente\":\"3\",\"total\":1,\"lineas\":[{\"idProducto\":$DET,\"cantidad\":2,\"precioUnitario\":1,\"precio\":1}]}"
verificar "crear con total/precio manipulados -> 201" 201 "$CODIGO"
contiene "el servidor ignora el precio del JSON (2 x 12000 = 24000)" '"total":24000' "$CUERPO"
api GET /pedidos/99999 "$VEND"; verificar "pedido inexistente -> 404" 404 "$CODIGO"
api GET "/pedidos?estado=Pendiente" "$VEND"; verificar "filtro por estado -> 200" 200 "$CODIGO"
echo "$CUERPO" | grep -q '"estado":"Confirmado"' && { echo "  FALLA  el filtro Pendiente devolvió Confirmados"; FALLOS=$((FALLOS+1)); } || { echo "  PASA   el filtro solo devuelve Pendientes"; OK=$((OK+1)); }

echo; echo "Resultado: $OK pasan, $FALLOS fallan."
[ "$FALLOS" -eq 0 ]
