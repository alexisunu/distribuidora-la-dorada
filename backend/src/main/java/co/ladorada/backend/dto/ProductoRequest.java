package co.ladorada.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record ProductoRequest(
        @NotBlank String codigo,
        @NotBlank String nombre,
        String descripcion,
        @NotNull @Positive BigDecimal precio,
        @NotNull @PositiveOrZero Integer existencias,
        @PositiveOrZero Integer stockMinimo) {}
