package co.ladorada.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** Nuevo valor total de existencias (no una diferencia). */
public record ExistenciasRequest(@NotNull @PositiveOrZero Integer existencias) {}
