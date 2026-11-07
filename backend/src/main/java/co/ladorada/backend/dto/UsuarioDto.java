package co.ladorada.backend.dto;

import co.ladorada.backend.model.Usuario;

/** Misma forma que la interfaz Usuario del frontend. */
public record UsuarioDto(Integer id, String nombre, String username, String rol, boolean activo) {
    public static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombreCompleto(), u.getUsername(), u.getRol(), "ACTIVO".equals(u.getEstado()));
    }
}
