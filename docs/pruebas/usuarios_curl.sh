#!/usr/bin/env bash
# Pruebas del Sprint 4 (usuarios). Con el backend corriendo en http://localhost:8080:
#   bash docs/pruebas/usuarios_curl.sh
# Solo usa curl, sed, grep y tr (funciona en Git Bash). No necesita reset: cada corrida crea usuarios con un sufijo
# nuevo y al final los deja INACTIVOS (los usuarios no se borran). Los usuarios de siempre quedan como estaban.
BASE=${BASE:-http://localhost:8080/api}
OK=0; FALLOS=0

login() { curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"${2:-1234}\"}" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p'; }
login_codigo() { curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$1\",\"password\":\"$2\"}"; }

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
id_de()      { echo "$1" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -n1; }
retiro_de()  { echo "$1" | sed -n 's/.*"fechaRetiro":"\([^"]*\)".*/\1/p'; }
admins_activos() { api GET /usuarios "$ADMIN"; echo "$CUERPO" | grep -o '"rol":"ADMINISTRADOR","activo":true' | wc -l | tr -d ' '; }
estado() { api PATCH "/usuarios/$1/estado" "$ADMIN" "{\"activo\":$2}"; }   # estado ID true|false

ADMIN=$(login admin); VEND=$(login vendedor1); BOD=$(login bodega1)
[ -z "$ADMIN" ] || [ -z "$VEND" ] || [ -z "$BOD" ] && { echo "No se pudo iniciar sesión: ¿está corriendo el backend?"; exit 1; }
SUF=$(date +%s)

echo "== Permisos: solo el Administrador =="
api GET /usuarios "$ADMIN"; verificar "Administrador lista -> 200" 200 "$CODIGO"
LISTA="$CUERPO"
ID_ADMIN=$(echo "$LISTA" | sed -n 's/.*"id":\([0-9]*\),"nombre":"[^"]*","username":"admin".*/\1/p')
api GET /usuarios "$VEND"; verificar "Vendedor no lista -> 403" 403 "$CODIGO"
api GET /usuarios "$BOD"; verificar "Bodega no lista -> 403" 403 "$CODIGO"
api GET /usuarios "invalido"; verificar "token inválido -> 401" 401 "$CODIGO"
api POST /usuarios "$VEND" '{"nombre":"x","username":"x","rol":"VENDEDOR","password":"12345678"}'
verificar "Vendedor no crea -> 403" 403 "$CODIGO"
api PUT "/usuarios/$ID_ADMIN" "$BOD" '{"nombre":"x","username":"admin","rol":"ADMINISTRADOR"}'
verificar "Bodega no edita -> 403" 403 "$CODIGO"
api PATCH "/usuarios/$ID_ADMIN/estado" "$VEND" '{"activo":false}'
verificar "Vendedor no desactiva -> 403" 403 "$CODIGO"
api DELETE "/usuarios/$ID_ADMIN" "$ADMIN"
verificar "no existe borrado físico: DELETE no responde 2xx" "ok" "$([ "${CODIGO:0:1}" != 2 ] && echo ok || echo "$CODIGO")"
api GET /usuarios "$ADMIN"; contiene "y el usuario sigue en la lista" '"username":"admin"' "$CUERPO"

echo "== Listar =="
contiene "trae a admin" '"username":"admin"' "$LISTA"
contiene "trae a vendedor1" '"username":"vendedor1"' "$LISTA"
contiene "trae a bodega1" '"username":"bodega1"' "$LISTA"
contiene "trae rol y activo" '"rol":"ADMINISTRADOR","activo":true' "$LISTA"
no_contiene "no devuelve la contraseña ni su hash" '$2a$' "$LISTA"
no_contiene "no hay campo de contraseña" 'contrasena' "$LISTA"

echo "== Crear =="
NUEVO="prueba$SUF"; CLAVE="clave$SUF"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Usuario de Prueba\",\"username\":\"$NUEVO\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "crear -> 201" 201 "$CODIGO"
contiene "devuelve el nombre de usuario" "\"username\":\"$NUEVO\"" "$CUERPO"
contiene "devuelve el rol" '"rol":"VENDEDOR"' "$CUERPO"
contiene "queda activo" '"activo":true' "$CUERPO"
no_contiene "sin fecha de retiro" '"fechaRetiro":"' "$CUERPO"
no_contiene "la respuesta no trae la contraseña" "$CLAVE" "$CUERPO"
no_contiene "la respuesta no trae el hash" '$2a$' "$CUERPO"
U1=$(id_de "$CUERPO")
verificar "el usuario nuevo inicia sesión con su contraseña -> 200" 200 "$(login_codigo "$NUEVO" "$CLAVE")"
verificar "con otra contraseña -> 401" 401 "$(login_codigo "$NUEVO" "otraclave123")"
api POST /usuarios "$ADMIN" "{\"nombre\":\"  Segunda Prueba  \",\"username\":\"  PRUEBAB$SUF \",\"rol\":\"BODEGA\",\"password\":\"$CLAVE\"}"
verificar "con espacios y mayúsculas -> 201" 201 "$CODIGO"
contiene "el nombre se guarda sin espacios sobrantes" '"nombre":"Segunda Prueba"' "$CUERPO"
contiene "el usuario se guarda en minúsculas" "\"username\":\"pruebab$SUF\"" "$CUERPO"
U2=$(id_de "$CUERPO")
api POST /usuarios "$ADMIN" "{\"nombre\":\"Repetido\",\"username\":\"$(echo "$NUEVO" | tr 'a-z' 'A-Z')\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "usuario repetido (aunque cambien las mayúsculas) -> 409" 409 "$CODIGO"
contiene "mensaje" "ya está registrado" "$CUERPO"

echo "== Crear: validaciones =="
api POST /usuarios "$ADMIN" "{\"nombre\":\"\",\"username\":\"v$SUF\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "sin nombre -> 400" 400 "$CODIGO"
contiene "mensaje" "El nombre completo y el nombre de usuario son obligatorios." "$CUERPO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Sin usuario\",\"username\":\"\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "sin nombre de usuario -> 400" 400 "$CODIGO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Con espacio\",\"username\":\"mal usuario\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "usuario con espacios -> 400" 400 "$CODIGO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Rol malo\",\"username\":\"v$SUF\",\"rol\":\"SUPERVISOR\",\"password\":\"$CLAVE\"}"
verificar "rol inventado -> 400" 400 "$CODIGO"
contiene "mensaje" "El rol no es válido." "$CUERPO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Sin clave\",\"username\":\"v$SUF\",\"rol\":\"VENDEDOR\"}"
verificar "sin contraseña -> 400" 400 "$CODIGO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Clave corta\",\"username\":\"v$SUF\",\"rol\":\"VENDEDOR\",\"password\":\"1234567\"}"
verificar "contraseña de 7 caracteres -> 400" 400 "$CODIGO"
contiene "mensaje" "La contraseña debe tener al menos 8 caracteres." "$CUERPO"
api POST /usuarios "$ADMIN" "{\"nombre\":\"Clave en blanco\",\"username\":\"v$SUF\",\"rol\":\"VENDEDOR\",\"password\":\"        \"}"
verificar "contraseña solo con espacios -> 400" 400 "$CODIGO"
LARGO=$(printf 'a%.0s' $(seq 1 51))
api POST /usuarios "$ADMIN" "{\"nombre\":\"Largo\",\"username\":\"$LARGO\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
verificar "nombre de usuario de 51 caracteres -> 400" 400 "$CODIGO"
api POST /usuarios "$ADMIN" '{"nombre":"Roto"'
verificar "JSON roto -> 400" 400 "$CODIGO"
api GET /usuarios "$ADMIN"; no_contiene "ninguno de los rechazados se guardó" "\"username\":\"v$SUF\"" "$CUERPO"

echo "== Editar =="
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"$NUEVO\",\"rol\":\"BODEGA\",\"password\":\"\"}"
verificar "cambiar nombre y rol -> 200" 200 "$CODIGO"
contiene "nombre nuevo" '"nombre":"Nombre Cambiado"' "$CUERPO"
contiene "rol nuevo" '"rol":"BODEGA"' "$CUERPO"
verificar "contraseña vacía = no cambia: la anterior sigue sirviendo" 200 "$(login_codigo "$NUEVO" "$CLAVE")"
CLAVE2="nueva$SUF"
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"$NUEVO\",\"rol\":\"BODEGA\",\"password\":\"$CLAVE2\"}"
verificar "cambiar la contraseña -> 200" 200 "$CODIGO"
no_contiene "la respuesta no trae la contraseña" "$CLAVE2" "$CUERPO"
verificar "la contraseña anterior ya no sirve -> 401" 401 "$(login_codigo "$NUEVO" "$CLAVE")"
verificar "la nueva sí -> 200" 200 "$(login_codigo "$NUEVO" "$CLAVE2")"
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"admin\",\"rol\":\"BODEGA\"}"
verificar "usar el usuario de otro -> 409" 409 "$CODIGO"
contiene "mensaje" "ya está en uso" "$CUERPO"
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"$NUEVO\",\"rol\":\"BODEGA\"}"
verificar "guardar con su propio usuario no choca consigo mismo -> 200" 200 "$CODIGO"
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"$NUEVO\",\"rol\":\"SUPERVISOR\"}"
verificar "rol inventado -> 400" 400 "$CODIGO"
api PUT "/usuarios/$U1" "$ADMIN" "{\"nombre\":\"Nombre Cambiado\",\"username\":\"$NUEVO\",\"rol\":\"BODEGA\",\"password\":\"corta\"}"
verificar "contraseña nueva corta -> 400" 400 "$CODIGO"
api PUT /usuarios/99999 "$ADMIN" '{"nombre":"x","username":"x99999","rol":"BODEGA"}'
verificar "usuario inexistente -> 404" 404 "$CODIGO"
contiene "mensaje" "Usuario no encontrado." "$CUERPO"
api PUT /usuarios/abc "$ADMIN" '{"nombre":"x","username":"x","rol":"BODEGA"}'
verificar "id que no es número -> 400" 400 "$CODIGO"

echo "== Desactivar y reactivar (nunca se borra) =="
estado "$U1" false
verificar "desactivar -> 200" 200 "$CODIGO"
contiene "queda inactivo" '"activo":false' "$CUERPO"
contiene "con fecha de retiro" '"fechaRetiro":"' "$CUERPO"
RETIRO1=$(retiro_de "$CUERPO")
verificar "un usuario inactivo no inicia sesión -> 401" 401 "$(login_codigo "$NUEVO" "$CLAVE2")"
estado "$U1" false
verificar "desactivar de nuevo -> 200" 200 "$CODIGO"
verificar "no se pisa la fecha de retiro" "$RETIRO1" "$(retiro_de "$CUERPO")"
api GET /usuarios "$ADMIN"; contiene "el inactivo sigue en la lista" "\"username\":\"$NUEVO\"" "$CUERPO"
estado "$U1" true
verificar "reactivar -> 200" 200 "$CODIGO"
contiene "vuelve a activo" '"activo":true' "$CUERPO"
no_contiene "la fecha de retiro se limpia" '"fechaRetiro":"' "$CUERPO"
verificar "puede iniciar sesión otra vez -> 200" 200 "$(login_codigo "$NUEVO" "$CLAVE2")"
api PATCH "/usuarios/$U1/estado" "$ADMIN" '{}'
verificar "sin el campo activo -> 400" 400 "$CODIGO"
api PATCH "/usuarios/$U1/estado" "$ADMIN" '{"activo":"quizas"}'
verificar "activo que no es verdadero o falso -> 400" 400 "$CODIGO"
estado 99999 false
verificar "usuario inexistente -> 404" 404 "$CODIGO"

echo "== Un usuario inactivo conserva sus pedidos =="
api POST /usuarios "$ADMIN" "{\"nombre\":\"Vendedora Retirada\",\"username\":\"retirada$SUF\",\"rol\":\"VENDEDOR\",\"password\":\"$CLAVE\"}"
U3=$(id_de "$CUERPO")
TOK3=$(login "retirada$SUF" "$CLAVE")
api GET "/productos?q=REF-007" "$ADMIN"; BAR=$(id_de "$CUERPO")
api POST /pedidos "$TOK3" "{\"cliente\":\"Pedido de la retirada\",\"telefonoCliente\":\"3000000009\",\"lineas\":[{\"idProducto\":$BAR,\"cantidad\":1}]}"
verificar "la vendedora crea un pedido -> 201" 201 "$CODIGO"
PX=$(id_de "$CUERPO")
estado "$U3" false
verificar "se desactiva -> 200" 200 "$CODIGO"
api GET "/pedidos/$PX" "$ADMIN"
contiene "el pedido sigue a su nombre" '"vendedor":"Vendedora Retirada"' "$CUERPO"
api POST "/pedidos/$PX/confirmar" "$TOK3"
verificar "su token vigente ya no opera pedidos -> 401" 401 "$CODIGO"
api POST "/pedidos/$PX/rechazar" "$VEND" '{"motivo":"Otro"}'   # limpieza: no deja un Pendiente de prueba

echo "== Último Administrador activo =="
api POST /usuarios "$ADMIN" "{\"nombre\":\"Segundo Administrador\",\"username\":\"adm$SUF\",\"rol\":\"ADMINISTRADOR\",\"password\":\"$CLAVE\"}"
verificar "crear un segundo Administrador -> 201" 201 "$CODIGO"
A2=$(id_de "$CUERPO")
estado "$A2" false
verificar "con dos Administradores activos se puede desactivar uno -> 200" 200 "$CODIGO"
estado "$A2" true
verificar "reactivarlo -> 200" 200 "$CODIGO"

ACTIVOS=$(admins_activos)
if [ "$ACTIVOS" = 2 ]; then
  T=$(mktemp -d)
  curl -s -o /dev/null -w '%{http_code}\n' -X PATCH "$BASE/usuarios/$ID_ADMIN/estado" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"activo":false}' > "$T/1" &
  curl -s -o /dev/null -w '%{http_code}\n' -X PATCH "$BASE/usuarios/$A2/estado" -H "Authorization: Bearer $ADMIN" -H 'Content-Type: application/json' -d '{"activo":false}' > "$T/2" &
  wait
  CODIGOS=$(cat "$T/1" "$T/2" | tr -d '\r' | sort | tr '\n' ' '); rm -rf "$T"
  verificar "dos desactivaciones a la vez: una 200 y la otra 409" "200 409 " "$CODIGOS"
  verificar "queda exactamente un Administrador activo" 1 "$(admins_activos)"
  estado "$ID_ADMIN" true; estado "$A2" true      # restaura a los dos
  verificar "se restauran los dos Administradores" 2 "$(admins_activos)"
else
  echo "  (omitida la prueba de dos desactivaciones a la vez: hay $ACTIVOS Administradores activos y necesita exactamente 2)"
fi

estado "$A2" false
ACTIVOS=$(admins_activos)
if [ "$ACTIVOS" = 1 ]; then
  estado "$ID_ADMIN" false
  verificar "desactivar al último Administrador -> 409" 409 "$CODIGO"
  contiene "mensaje" "No se puede desactivar al último Administrador activo." "$CUERPO"
  api PUT "/usuarios/$ID_ADMIN" "$ADMIN" '{"nombre":"Administrador General","username":"admin","rol":"VENDEDOR"}'
  verificar "quitarle el rol de Administrador al último -> 409" 409 "$CODIGO"
  contiene "mensaje" "No se puede cambiar el rol al último Administrador activo." "$CUERPO"
  api PUT "/usuarios/$ID_ADMIN" "$ADMIN" '{"nombre":"Administrador General","username":"admin","rol":"ADMINISTRADOR"}'
  verificar "editarlo sin cambiar el rol sí se puede -> 200" 200 "$CODIGO"
  verificar "el último Administrador sigue activo" 1 "$(admins_activos)"
  verificar "y sigue iniciando sesión -> 200" 200 "$(login_codigo admin 1234)"
else
  echo "  (omitida la prueba del último Administrador: hay $ACTIVOS activos y necesita exactamente 1)"
fi

echo "== Limpieza: los usuarios de prueba quedan inactivos =="
for U in $U1 $U2 $U3 $A2; do estado "$U" false; done
echo "  (los usuarios de siempre no se tocaron; los de prueba no se pueden borrar y quedan INACTIVOS)"

echo; echo "Resultado: $OK pasan, $FALLOS fallan."
[ "$FALLOS" -eq 0 ]
