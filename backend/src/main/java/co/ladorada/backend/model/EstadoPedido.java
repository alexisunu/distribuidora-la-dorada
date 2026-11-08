package co.ladorada.backend.model;

/**
 * Estados del pedido. En la base se guardan en mayúsculas (CHECK de la tabla pedido);
 * hacia el frontend viajan con la etiqueta ("Pendiente", "Confirmado"...), igual que EstadoPedido de models.ts.
 */
public enum EstadoPedido {
    PENDIENTE("Pendiente"),
    CONFIRMADO("Confirmado"),
    DESPACHADO("Despachado"),
    RECHAZADO("Rechazado"),
    CANCELADO("Cancelado");

    private final String etiqueta;

    EstadoPedido(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
    }

    /** Acepta "Pendiente" o "PENDIENTE". Devuelve null si el texto no corresponde a ningún estado. */
    public static EstadoPedido desde(String texto) {
        if (texto == null) return null;
        String t = texto.trim();
        for (EstadoPedido e : values()) {
            if (e.name().equalsIgnoreCase(t) || e.etiqueta.equalsIgnoreCase(t)) return e;
        }
        return null;
    }
}
