package co.ladorada.backend.exception;

/** Credenciales inválidas (401). */
public class NoAutorizadoException extends RuntimeException {
    public NoAutorizadoException(String mensaje) { super(mensaje); }
}
