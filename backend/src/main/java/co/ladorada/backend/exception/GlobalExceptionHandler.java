package co.ladorada.backend.exception;

import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NegocioException.class)
    public ResponseEntity<ApiError> negocio(NegocioException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiError.of(409, e.getMessage()));
    }

    @ExceptionHandler(SolicitudInvalidaException.class)
    public ResponseEntity<ApiError> solicitudInvalida(SolicitudInvalidaException e) {
        return ResponseEntity.badRequest().body(ApiError.of(400, e.getMessage()));
    }

    /** Ej: GET /api/pedidos/abc (el id no es un número). */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> parametroInvalido(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.badRequest().body(ApiError.of(400, "El parámetro " + e.getName() + " no es válido."));
    }

    @ExceptionHandler(NoEncontradoException.class)
    public ResponseEntity<ApiError> noEncontrado(NoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiError.of(404, e.getMessage()));
    }

    @ExceptionHandler(NoAutorizadoException.class)
    public ResponseEntity<ApiError> noAutorizado(NoAutorizadoException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiError.of(401, e.getMessage()));
    }

    @ExceptionHandler(ProhibidoException.class)
    public ResponseEntity<ApiError> prohibidoRecurso(ProhibidoException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of(403, e.getMessage()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> prohibido(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiError.of(403, "No tienes permiso para esta acción."));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validacion(MethodArgumentNotValidException e) {
        String msg = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ApiError.of(400, msg));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> cuerpoInvalido(HttpMessageNotReadableException e) {
        return ResponseEntity.badRequest().body(ApiError.of(400, "El cuerpo de la solicitud no es válido."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> otro(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of(500, "Error interno del servidor."));
    }
}
