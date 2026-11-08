package co.ladorada.backend.dto;

import java.time.LocalDateTime;

import co.ladorada.backend.model.Usuario;

/** Misma forma que la interfaz Usuario del frontend. fechaRetiro es null mientras el usuario está activo. */
public record UsuarioDto(Integer id, String nombre, String username, String rol, boolean activo,
                         LocalDateTime fechaRetiro) {
    public static UsuarioDto de(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombreCompleto(), u.getUsername(), u.getRol(),
                "ACTIVO".equals(u.getEstado()), u.getFechaRetiro());
    }
}
