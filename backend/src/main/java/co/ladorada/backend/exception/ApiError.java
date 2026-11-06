package co.ladorada.backend.exception;

import java.time.OffsetDateTime;

/** Formato único de error: el frontend solo lee "mensaje". */
public record ApiError(int status, String mensaje, OffsetDateTime fecha) {
    public static ApiError of(int status, String mensaje) {
        return new ApiError(status, mensaje, OffsetDateTime.now());
    }
}
