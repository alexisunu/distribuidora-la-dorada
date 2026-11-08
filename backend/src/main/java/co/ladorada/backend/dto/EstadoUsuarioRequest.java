package co.ladorada.backend.dto;

/** Cuerpo de PATCH /api/usuarios/{id}/estado: {"activo": true} reactiva y {"activo": false} desactiva. */
public record EstadoUsuarioRequest(Boolean activo) {}
