package co.ladorada.backend.exception;

/** Datos de entrada incorrectos (400). Ej: "Debe agregar al menos un producto al pedido". */
public class SolicitudInvalidaException extends RuntimeException {
    public SolicitudInvalidaException(String mensaje) { super(mensaje); }
}
