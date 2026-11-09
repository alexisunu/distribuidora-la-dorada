#!/usr/bin/env bash
# Pruebas del Sprint 3 (despachos, despachar y resumen). Con el backend corriendo en http://localhost:8080:
#   bash docs/pruebas/sprint3_curl.sh
# Solo usa curl, sed, grep y tr (funciona en Git Bash). Crea sus propios pedidos con el producto REF-007;
# al final cancela los que dejó en la cola y gasta unas 3 unidades por corrida; si faltan, ejecuta reset_tc.sql (lo deja en 40).
BASE=${BASE:-http://localhost:8080/api}
OK=0; FALLOS=0

login() { curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"1234\"}" | tr -d '\r' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }

# api METODO RUTA TOKEN [CUERPO]  ->  deja el código HTTP en $CODIGO y la respuesta en $CUERPO
api() {
  local salida
  if [ -n "$4" ]; then
    salida=$(curl -s -w '\n%{http_code}' -X "$1" "$BASE$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json' -d "$4" | tr -d '\r')
  else
    salida=$(curl -s -w '\n%{http_code}' -X "$1" "$BASE$2" -H "Authorization: Bearer $3" -H 'Content-Type: application/json' | tr -d '\r')
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
ids_de()    { echo "$1" | grep -o '"id":[0-9]*' | sed 's/"id"://' | tr '\n' ' '; }   # ids de pedido, en el orden que llegan
cuenta_de() { echo "$1" | sed -n "s/.*\"$2\":\([0-9]*\).*/\1/p" | head -n1; }        # número de un estado del resumen

# pedido_nuevo "cliente"  ->  crea un pedido Pendiente de 1 unidad de REF-007 y deja su id en $PEDIDO
pedido_nuevo() {
  api POST /pedidos "$VEND" "{\"cliente\":\"$1\",\"telefonoCliente\":\"3000000000\",\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1}]}"
  PEDIDO=$(id_de "$CUERPO")
}
# pedido_confirmado "cliente"  ->  lo crea y lo confirma
pedido_confirmado() { pedido_nuevo "$1"; api POST "/pedidos/$PEDIDO/confirmar" "$VEND"; }

ADMIN=$(login admin); VEND=$(login vendedor1); BOD=$(login bodega1)
[ -z "$ADMIN" ] || [ -z "$VEND" ] || [ -z "$BOD" ] && { echo "No se pudo iniciar sesión: ¿está corriendo el backend?"; exit 1; }
BAR=$(prod_id REF-007)
S0=$(stock_de REF-007)
[ "${S0:-0}" -lt 12 ] && { echo "REF-007 tiene pocas existencias: ejecuta docs/pruebas/reset_tc.sql y repite."; exit 1; }

echo "== Despachar: camino feliz =="
pedido_confirmado "Despacho feliz"; PA=$PEDIDO
verificar "el pedido quedó Confirmado" 200 "$CODIGO"
STOCK=$(stock_de REF-007)
api GET /despachos "$BOD"; verificar "Bodega ve la cola -> 200" 200 "$CODIGO"
contiene "el pedido está en la cola" "\"id\":$PA," "$CUERPO"
api POST "/pedidos/$PA/despachar" "$BOD"
verificar "Bodega despacha -> 200" 200 "$CODIGO"; contiene "pasa a Despachado" '"estado":"Despachado"' "$CUERPO"
contiene "historial: Confirmado -> Despachado" '"estadoAnterior":"Confirmado","estadoNuevo":"Despachado"' "$CUERPO"
contiene "historial: queda el usuario de Bodega" '"usuario":"Encargada de Bodega"' "$CUERPO"
verificar "despachar NO cambia las existencias" "$STOCK" "$(stock_de REF-007)"
api GET /despachos "$BOD"; no_contiene "ya no está en la cola" "\"id\":$PA," "$CUERPO"
api GET "/pedidos/$PA" "$VEND"; contiene "Ventas lo ve Despachado" '"estado":"Despachado"' "$CUERPO"

echo "== Cola de despachos: solo Confirmados, del más antiguo al más reciente =="
pedido_confirmado "Cola uno"; PB=$PEDIDO
pedido_confirmado "Cola dos"; PC=$PEDIDO
pedido_nuevo "Cola pendiente"; PP=$PEDIDO
api GET /despachos "$BOD"
IDS=$(ids_de "$CUERPO"); ORDENADOS=$(echo "$IDS" | tr ' ' '\n' | grep . | sort -n | tr '\n' ' ')
verificar "ids en orden ascendente" "$ORDENADOS" "$IDS"
contiene "incluye los dos Confirmados" "\"id\":$PB," "$CUERPO"; contiene "incluye el segundo" "\"id\":$PC," "$CUERPO"
no_contiene "no incluye el Pendiente" "\"id\":$PP," "$CUERPO"
ESTADOS=$(echo "$CUERPO" | grep -o '"estado":"[A-Za-z]*"' | sort -u | tr '\n' ' ')
verificar "todos los de la cola están Confirmados" '"estado":"Confirmado" ' "$ESTADOS"
api GET /despachos "$ADMIN"; verificar "Administrador ve la cola -> 200" 200 "$CODIGO"
api GET /despachos "$VEND"; verificar "Vendedor no ve la cola -> 403" 403 "$CODIGO"
api GET /despachos "invalido"; verificar "token inválido -> 401" 401 "$CODIGO"

echo "== Doble despacho simultáneo (dos clics a la vez) =="
pedido_confirmado "Doble despacho"; PD=$PEDIDO
T=$(mktemp -d)
for i in 1 2; do curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/pedidos/$PD/despachar" -H "Authorization: Bearer $BOD" > "$T/$i" & done; wait
CODIGOS=$(cat "$T/1" "$T/2" | tr -d '\r' | sort | tr '\n' ' '); rm -rf "$T"
verificar "una petición 200 y otra 409" "200 409 " "$CODIGOS"
api GET "/pedidos/$PD" "$BOD"
FILAS=$(echo "$CUERPO" | grep -o '"estadoNuevo":"Despachado"' | wc -l | tr -d ' ')
verificar "una sola fila de historial Despachado" 1 "$FILAS"

echo "== Despachar un pedido que no está Confirmado =="
api POST "/pedidos/$PP/despachar" "$BOD"
verificar "Pendiente -> 409" 409 "$CODIGO"
contiene "mensaje" "Solo se puede despachar un pedido en estado Confirmado. El pedido está en estado Pendiente." "$CUERPO"
api GET "/pedidos/$PP" "$VEND"; contiene "el Pendiente sigue Pendiente" '"estado":"Pendiente"' "$CUERPO"
api POST "/pedidos/$PA/despachar" "$BOD"
verificar "ya Despachado -> 409" 409 "$CODIGO"
pedido_nuevo "Rechazado"; PR=$PEDIDO
api POST "/pedidos/$PR/rechazar" "$VEND" '{"motivo":"Error de captura"}'
api POST "/pedidos/$PR/despachar" "$BOD"; verificar "Rechazado -> 409" 409 "$CODIGO"
pedido_confirmado "Cancelado"; PX=$PEDIDO
api POST "/pedidos/$PX/cancelar" "$VEND" '{"motivo":"El cliente desiste"}'
api POST "/pedidos/$PX/despachar" "$BOD"; verificar "Cancelado -> 409" 409 "$CODIGO"
api POST /pedidos/99999/despachar "$BOD"; verificar "pedido inexistente -> 404" 404 "$CODIGO"
api POST /pedidos/abc/despachar "$BOD"; verificar "id que no es número -> 400" 400 "$CODIGO"

echo "== Roles al despachar y al operar pedidos =="
pedido_confirmado "Solo bodega"; PE=$PEDIDO
api POST "/pedidos/$PE/despachar" "$VEND"; verificar "Vendedor no despacha -> 403" 403 "$CODIGO"
api GET "/pedidos/$PE" "$VEND"; contiene "el pedido sigue Confirmado" '"estado":"Confirmado"' "$CUERPO"
api POST "/pedidos/$PE/despachar" "$ADMIN"; verificar "Administrador sí despacha -> 200" 200 "$CODIGO"
api POST "/pedidos/$PE/despachar" "invalido"; verificar "despachar sin token válido -> 401" 401 "$CODIGO"
api POST /pedidos "$BOD" "{\"cliente\":\"x\",\"telefonoCliente\":\"1\",\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1}]}"
verificar "Bodega no crea -> 403" 403 "$CODIGO"
api POST "/pedidos/$PP/confirmar" "$BOD"; verificar "Bodega no confirma -> 403" 403 "$CODIGO"
api POST "/pedidos/$PP/rechazar" "$BOD" '{"motivo":"Otro"}'; verificar "Bodega no rechaza -> 403" 403 "$CODIGO"
api POST "/pedidos/$PB/cancelar" "$BOD" '{"motivo":"Otro"}'; verificar "Bodega no cancela -> 403" 403 "$CODIGO"
api GET /pedidos "$BOD"; verificar "Bodega no lista pedidos -> 403" 403 "$CODIGO"

echo "== Bodega y el detalle: solo Confirmado o Despachado =="
api GET "/pedidos/$PP" "$BOD"
verificar "detalle de un Pendiente -> 403" 403 "$CODIGO"
contiene "mensaje" "Bodega solo puede ver pedidos Confirmados o Despachados." "$CUERPO"
no_contiene "la respuesta no filtra datos del pedido" "Cola pendiente" "$CUERPO"
api GET "/pedidos/$PR" "$BOD"; verificar "detalle de un Rechazado -> 403" 403 "$CODIGO"
api GET "/pedidos/$PX" "$BOD"; verificar "detalle de un Cancelado -> 403" 403 "$CODIGO"
api GET "/pedidos/$PB" "$BOD"; verificar "detalle de un Confirmado -> 200" 200 "$CODIGO"
api GET "/pedidos/$PA" "$BOD"; verificar "detalle de un Despachado -> 200" 200 "$CODIGO"
api GET /pedidos/99999 "$BOD"; verificar "detalle inexistente -> 404" 404 "$CODIGO"
api GET "/pedidos/$PP" "$VEND"; verificar "Vendedor sí ve un Pendiente -> 200" 200 "$CODIGO"
api GET "/pedidos/$PP" "$ADMIN"; verificar "Administrador sí ve un Pendiente -> 200" 200 "$CODIGO"

echo "== Resumen por estado =="
api GET /pedidos/resumen "$VEND"
verificar "Vendedor -> 200 (resumen no se confunde con un id)" 200 "$CODIGO"
contiene "trae el total" '"total":' "$CUERPO"
for E in Pendiente Confirmado Despachado Rechazado Cancelado; do contiene "trae $E" "\"$E\":" "$CUERPO"; done
TOTAL=$(cuenta_de "$CUERPO" total); P_ANTES=$(cuenta_de "$CUERPO" Pendiente); C_ANTES=$(cuenta_de "$CUERPO" Confirmado)
api GET /pedidos "$VEND"; LISTADOS=$(ids_de "$CUERPO" | wc -w | tr -d ' ')
verificar "el total coincide con el listado" "$LISTADOS" "$TOTAL"
api GET "/pedidos?estado=Pendiente" "$VEND"; PEND_LISTA=$(ids_de "$CUERPO" | wc -w | tr -d ' ')
verificar "Pendiente coincide con el listado filtrado" "$PEND_LISTA" "$P_ANTES"
pedido_nuevo "Resumen cambia"; PS=$PEDIDO
api GET /pedidos/resumen "$ADMIN"; verificar "Administrador -> 200" 200 "$CODIGO"
verificar "un pedido nuevo suma 1 a Pendiente" "$((P_ANTES+1))" "$(cuenta_de "$CUERPO" Pendiente)"
api POST "/pedidos/$PS/confirmar" "$VEND"
api GET /pedidos/resumen "$VEND"
verificar "al confirmarlo, Pendiente vuelve a su valor" "$P_ANTES" "$(cuenta_de "$CUERPO" Pendiente)"
verificar "y Confirmado sube 1" "$((C_ANTES+1))" "$(cuenta_de "$CUERPO" Confirmado)"
api GET /pedidos/resumen "$BOD"; verificar "Bodega no ve el resumen -> 403" 403 "$CODIGO"
api GET /pedidos/resumen "invalido"; verificar "token inválido -> 401" 401 "$CODIGO"

echo "== Limpieza: deja la cola sin los pedidos de prueba =="
for P in $PB $PC $PS; do api POST "/pedidos/$P/cancelar" "$VEND" '{"motivo":"Otro"}'; done
api POST "/pedidos/$PP/rechazar" "$VEND" '{"motivo":"Otro"}'
echo "  (Confirmados cancelados con sus existencias repuestas y el Pendiente rechazado)"

echo; echo "Resultado: $OK pasan, $FALLOS fallan."
[ "$FALLOS" -eq 0 ]
