package co.ladorada.backend.model;

/**
 * Lista corta de motivos (RF-07). Los textos son los mismos de MOTIVOS en models.ts.
 * Cada motivo declara en qué acción sirve: el rechazo (solo desde Pendiente, no toca inventario) y la cancelación
 * (solo desde Confirmado, repone inventario) tienen listas distintas. "Error de captura" ya no existe: los errores
 * se corrigen editando el pedido Pendiente.
 */
public enum MotivoPedido {
    EXISTENCIAS_INSUFICIENTES("Existencias insuficientes", true, false),
    CLIENTE_DESISTE("El cliente desiste", false, true),
    SIN_EXISTENCIA_FISICA("Sin existencia física", false, true),
    OTRO("Otro", true, true);

    private final String etiqueta;
    private final boolean paraRechazar;
    private final boolean paraCancelar;

    MotivoPedido(String etiqueta, boolean paraRechazar, boolean paraCancelar) {
        this.etiqueta = etiqueta;
        this.paraRechazar = paraRechazar;
        this.paraCancelar = paraCancelar;
    }

    public String etiqueta() {
        return etiqueta;
    }

    public boolean sirveParaRechazar() {
        return paraRechazar;
    }

    public boolean sirveParaCancelar() {
        return paraCancelar;
    }

    /** Devuelve null si el texto no está en la lista corta. */
    public static MotivoPedido desde(String texto) {
        if (texto == null) return null;
        String t = texto.trim();
        for (MotivoPedido m : values()) {
            if (m.etiqueta.equalsIgnoreCase(t)) return m;
        }
        return null;
    }

    /** Etiquetas permitidas para la acción, separadas por coma, para armar el mensaje de error. */
    public static String permitidosPara(boolean rechazar) {
        StringBuilder sb = new StringBuilder();
        for (MotivoPedido m : values()) {
            if (rechazar ? m.paraRechazar : m.paraCancelar) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(m.etiqueta);
            }
        }
        return sb.toString();
    }
}
