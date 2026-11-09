package co.ladorada.backend.dto;

/**
 * Cuerpo de POST y PUT /api/usuarios (misma forma que GuardarUsuarioDto del frontend). No lleva anotaciones de
 * validación a propósito: UsuarioService valida todo en el servidor con los mensajes de la pantalla de Usuarios.
 * En el PUT, password es opcional: vacía o ausente significa "no cambiar la contraseña".
 */
public record UsuarioRequest(String nombre, String username, String rol, String password) {}
