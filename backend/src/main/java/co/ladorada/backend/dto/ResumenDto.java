package co.ladorada.backend.dto;

import java.util.Map;

/**
 * Conteo de pedidos por estado (RF-16). Siempre trae los cinco estados, con 0 si no hay pedidos.
 * Las llaves son las etiquetas del frontend: "Pendiente", "Confirmado", "Despachado", "Rechazado", "Cancelado".
 */
public record ResumenDto(long total, Map<String, Long> porEstado) {
}
