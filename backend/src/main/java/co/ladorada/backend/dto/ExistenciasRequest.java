package co.ladorada.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Nuevo valor total de existencias (no una diferencia). BigDecimal con @Digits(fraction = 0) para que 1.5 responda
 * 400 en vez de que Jackson lo trunque a 1.
 */
public record ExistenciasRequest(
        @NotNull(message = "Las existencias son obligatorias")
        @PositiveOrZero(message = ExistenciasRequest.MSG_NEGATIVAS)
        @Digits(integer = 9, fraction = 0, message = ExistenciasRequest.MSG_ENTERAS) BigDecimal existencias) {

    public static final String MSG_NEGATIVAS = "Las existencias no pueden ser negativas";
    public static final String MSG_ENTERAS = "Las existencias deben ser un número entero de hasta 9 dígitos";
}
