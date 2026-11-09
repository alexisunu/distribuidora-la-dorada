package co.ladorada.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Cuerpo de POST y PUT /api/productos. Cada validación lleva su propio mensaje en español, sin el nombre del campo:
 * es el texto que la pantalla muestra tal cual. Las existencias solo cuentan al crear; al editar se ignoran (el stock
 * cambia únicamente con PATCH /api/productos/{id}/existencias). Por eso no son obligatorias aquí: el servicio las exige
 * al crear. Son BigDecimal y no Integer para poder rechazar 1.5, que Jackson convertiría en silencio a 1.
 */
public record ProductoRequest(
        @NotBlank(message = "El código del producto es obligatorio") String codigo,
        @NotBlank(message = "El nombre del producto es obligatorio") String nombre,
        String descripcion,
        @NotNull(message = ProductoRequest.MSG_PRECIO) @Positive(message = ProductoRequest.MSG_PRECIO) BigDecimal precio,
        @PositiveOrZero(message = ExistenciasRequest.MSG_NEGATIVAS)
        @Digits(integer = 9, fraction = 0, message = ExistenciasRequest.MSG_ENTERAS) BigDecimal existencias,
        @PositiveOrZero(message = "El stock mínimo no puede ser negativo") Integer stockMinimo) {

    public static final String MSG_PRECIO = "El precio unitario debe ser un valor numérico válido mayor que cero";
}
