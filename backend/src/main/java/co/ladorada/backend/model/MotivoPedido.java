package co.ladorada.backend.model;

/** Lista corta de motivos (RF-07). Los textos son los mismos de MOTIVOS en models.ts. */
public enum MotivoPedido {
    EXISTENCIAS_INSUFICIENTES("Existencias insuficientes"),
    ERROR_DE_CAPTURA("Error de captura"),
    CLIENTE_DESISTE("El cliente desiste"),
    SIN_EXISTENCIA_FISICA("Sin existencia física"),
    OTRO("Otro");

    private final String etiqueta;

    MotivoPedido(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String etiqueta() {
        return etiqueta;
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
}
