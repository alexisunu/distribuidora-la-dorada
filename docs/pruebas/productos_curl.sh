#!/usr/bin/env bash
# Pruebas de productos (Sprint 5): editar NO toca las existencias y los mensajes de validación.
# Con el backend corriendo en http://localhost:8080:
#   bash docs/pruebas/productos_curl.sh
# Solo usa curl, sed, grep y tr (funciona en Git Bash). Trabaja sobre REF-013 (Esponja de Fibra Abrasiva x3): cambia
# sus existencias y su descripción, y al final las deja como estaban. Los productos no se pueden borrar, así que todas
# las pruebas de creación son de errores 400 y no crean nada. Si se corta a la mitad, reset_tc.sql deja REF-013 en 50.
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
  if echo "$3" | grep -qF "$2"; then echo "  FALLA  $1  (aparece: $2) -> $3"; FALLOS=$((FALLOS+1)); else echo "  PASA   $1"; OK=$((OK+1)); fi
}
campo() { echo "$CUERPO" | sed -n "s/.*\"$1\":\"\{0,1\}\([^\",}]*\)\"\{0,1\}.*/\1/p" | head -n1; }   # valor de un campo del JSON
stock_de() { api GET "/productos?q=REF-013" "$ADMIN"; campo existencias; }

MSG_PRECIO="El precio unitario debe ser un valor numérico válido mayor que cero"
MSG_NEGATIVAS="Las existencias no pueden ser negativas"
MSG_ENTERAS="Las existencias deben ser un número entero"

ADMIN=$(login admin); VEND=$(login vendedor1); BOD=$(login bodega1)
[ -z "$ADMIN" ] || [ -z "$VEND" ] || [ -z "$BOD" ] && { echo "No se pudo iniciar sesión: ¿está corriendo el backend?"; exit 1; }

api GET "/productos?q=REF-013" "$ADMIN"
ID=$(campo id); NOM=$(campo nombre); DESC0=$(campo descripcion); PRECIO=$(campo precio); MIN=$(campo stockMinimo); STOCK0=$(campo existencias)
[ -z "$ID" ] || [ -z "$STOCK0" ] && { echo "No se encontró REF-013: ¿están cargados los datos de prueba?"; exit 1; }

# producto_json "descripcion" "fragmento de existencias"  ->  cuerpo completo del PUT/POST con los datos de REF-013
producto_json() { echo "{\"codigo\":\"REF-013\",\"nombre\":\"$NOM\",\"descripcion\":\"$1\",\"precio\":$PRECIO$2,\"stockMinimo\":$MIN}"; }

echo "== Bodega ajusta las existencias (PATCH) =="
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":30}'
verificar "Bodega ajusta a 30 -> 200" 200 "$CODIGO"; contiene "responde 30" '"existencias":30' "$CUERPO"
verificar "el catálogo muestra 30" 30 "$(stock_de)"

echo "== Editar un producto NO toca las existencias (PUT) =="
api PUT "/productos/$ID" "$ADMIN" "$(producto_json 'Descripcion de prueba' ',"existencias":999')"
verificar "formulario viejo (manda existencias 999) -> 200" 200 "$CODIGO"
contiene "la descripción sí cambia" "Descripcion de prueba" "$CUERPO"
contiene "la respuesta sigue en 30" '"existencias":30' "$CUERPO"
no_contiene "no aparece 999" '"existencias":999' "$CUERPO"
verificar "el catálogo sigue en 30" 30 "$(stock_de)"
api PUT "/productos/$ID" "$ADMIN" "$(producto_json 'Descripcion de prueba dos' '')"
verificar "formulario nuevo (sin existencias) -> 200" 200 "$CODIGO"
contiene "la descripción cambia" "Descripcion de prueba dos" "$CUERPO"
verificar "el catálogo sigue en 30" 30 "$(stock_de)"
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":45}'
verificar "ajustar de nuevo sigue funcionando -> 200" 200 "$CODIGO"
verificar "el catálogo muestra 45" 45 "$(stock_de)"
api PATCH "/productos/$ID/existencias" "$ADMIN" '{"existencias":0}'
verificar "existencias 0 es válido -> 200" 200 "$CODIGO"
verificar "el catálogo muestra 0" 0 "$(stock_de)"
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":45}'

echo "== Roles y errores al editar =="
api PUT "/productos/$ID" "$VEND" "$(producto_json 'x' '')"; verificar "Vendedor no edita -> 403" 403 "$CODIGO"
api PUT "/productos/$ID" "$BOD" "$(producto_json 'x' '')"; verificar "Bodega no edita -> 403" 403 "$CODIGO"
api PATCH "/productos/$ID/existencias" "$VEND" '{"existencias":1}'; verificar "Vendedor no ajusta -> 403" 403 "$CODIGO"
api PUT "/productos/$ID" "invalido" "$(producto_json 'x' '')"; verificar "token inválido -> 401" 401 "$CODIGO"
api PUT /productos/99999 "$ADMIN" "$(producto_json 'x' '')"; verificar "producto inexistente -> 404" 404 "$CODIGO"
api PATCH /productos/99999/existencias "$BOD" '{"existencias":1}'; verificar "ajustar un inexistente -> 404" 404 "$CODIGO"
api PUT "/productos/$ID" "$ADMIN" "{\"codigo\":\"REF-001\",\"nombre\":\"$NOM\",\"precio\":$PRECIO,\"stockMinimo\":$MIN}"
verificar "código de otro producto -> 409" 409 "$CODIGO"
verificar "nada de lo anterior cambió las existencias" 45 "$(stock_de)"

echo "== Validación del precio =="
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":0,"existencias":1}'
verificar "precio 0 -> 400" 400 "$CODIGO"; contiene "mensaje propio" "$MSG_PRECIO" "$CUERPO"
no_contiene "sin el nombre del campo" "precio:" "$CUERPO"
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":-5,"existencias":1}'
verificar "precio negativo -> 400" 400 "$CODIGO"; contiene "mismo mensaje" "$MSG_PRECIO" "$CUERPO"
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","existencias":1}'
verificar "sin precio -> 400" 400 "$CODIGO"; contiene "mismo mensaje" "$MSG_PRECIO" "$CUERPO"
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":"abc","existencias":1}'
verificar "precio que no es número -> 400" 400 "$CODIGO"
api PUT "/productos/$ID" "$ADMIN" "{\"codigo\":\"REF-013\",\"nombre\":\"$NOM\",\"precio\":0,\"stockMinimo\":$MIN}"
verificar "editar con precio 0 -> 400" 400 "$CODIGO"; contiene "mismo mensaje" "$MSG_PRECIO" "$CUERPO"

echo "== Validación de las existencias =="
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":1000,"existencias":-1}'
verificar "crear con existencias -1 -> 400" 400 "$CODIGO"; contiene "mensaje propio" "$MSG_NEGATIVAS" "$CUERPO"
no_contiene "sin el nombre del campo" "existencias:" "$CUERPO"
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":1000,"existencias":1.5}'
verificar "crear con existencias 1.5 -> 400" 400 "$CODIGO"; contiene "pide un entero" "$MSG_ENTERAS" "$CUERPO"
api POST /productos "$ADMIN" '{"codigo":"ZZ-PRUEBA","nombre":"Prueba","precio":1000}'
verificar "crear sin existencias -> 400" 400 "$CODIGO"; contiene "mensaje" "Las existencias iniciales son obligatorias al crear un producto" "$CUERPO"
api PUT "/productos/$ID" "$ADMIN" "$(producto_json 'x' ',"existencias":-1')"
verificar "editar con existencias -1 -> 400" 400 "$CODIGO"; contiene "mensaje propio" "$MSG_NEGATIVAS" "$CUERPO"
api PUT "/productos/$ID" "$ADMIN" "$(producto_json 'x' ',"existencias":1.5')"
verificar "editar con existencias 1.5 -> 400" 400 "$CODIGO"; contiene "pide un entero" "$MSG_ENTERAS" "$CUERPO"
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":-1}'
verificar "ajustar a -1 -> 400" 400 "$CODIGO"; contiene "mensaje propio" "$MSG_NEGATIVAS" "$CUERPO"
no_contiene "sin el nombre del campo" "existencias:" "$CUERPO"
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":1.5}'
verificar "ajustar a 1.5 -> 400" 400 "$CODIGO"; contiene "pide un entero" "$MSG_ENTERAS" "$CUERPO"
api PATCH "/productos/$ID/existencias" "$BOD" '{"existencias":"abc"}'
verificar "ajustar a un texto -> 400" 400 "$CODIGO"
api PATCH "/productos/$ID/existencias" "$BOD" '{}'
verificar "ajustar sin valor -> 400" 400 "$CODIGO"; contiene "mensaje" "Las existencias son obligatorias" "$CUERPO"
verificar "ningún error cambió las existencias" 45 "$(stock_de)"

echo "== Varios errores a la vez, cada uno con su mensaje =="
api POST /productos "$ADMIN" '{"codigo":"","nombre":"","precio":0,"existencias":-1}'
verificar "cuatro errores -> 400" 400 "$CODIGO"
contiene "código" "El código del producto es obligatorio" "$CUERPO"
contiene "nombre" "El nombre del producto es obligatorio" "$CUERPO"
contiene "precio" "$MSG_PRECIO" "$CUERPO"
contiene "existencias" "$MSG_NEGATIVAS" "$CUERPO"

echo "== Login: los mensajes tampoco llevan el nombre del campo =="
SALIDA=$(curl -s -w '\n%{http_code}' -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"","password":""}' | tr -d '\r')
CODIGO=$(echo "$SALIDA" | tail -n1); CUERPO=$(echo "$SALIDA" | sed '$d')
verificar "login vacío -> 400" 400 "$CODIGO"
contiene "usuario" "El usuario es obligatorio" "$CUERPO"; contiene "contraseña" "La contraseña es obligatoria" "$CUERPO"

echo "== Limpieza: REF-013 vuelve a como estaba =="
api PATCH "/productos/$ID/existencias" "$BOD" "{\"existencias\":$STOCK0}"
api PUT "/productos/$ID" "$ADMIN" "$(producto_json "$DESC0" '')"
verificar "existencias restauradas ($STOCK0)" "$STOCK0" "$(stock_de)"
api GET "/productos?q=REF-013" "$ADMIN"; verificar "descripción restaurada" "$DESC0" "$(campo descripcion)"

echo; echo "Resultado: $OK pasan, $FALLOS fallan."
[ "$FALLOS" -eq 0 ]
