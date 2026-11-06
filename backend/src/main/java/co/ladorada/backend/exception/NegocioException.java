package co.ladorada.backend.exception;

/** Regla de negocio incumplida (409). Ej: "No hay existencias suficientes: solicitaste 30, disponibles 20." */
public class NegocioException extends RuntimeException {
    public NegocioException(String mensaje) { super(mensaje); }
}
