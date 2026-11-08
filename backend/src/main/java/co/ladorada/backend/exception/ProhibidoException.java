package co.ladorada.backend.exception;

/**
 * El usuario tiene sesión y su rol puede usar el endpoint, pero no puede ver ESTE recurso (403).
 * Ej: Bodega pidiendo el detalle de un pedido Pendiente. El mensaje sí se muestra en pantalla.
 */
public class ProhibidoException extends RuntimeException {
    public ProhibidoException(String mensaje) { super(mensaje); }
}
