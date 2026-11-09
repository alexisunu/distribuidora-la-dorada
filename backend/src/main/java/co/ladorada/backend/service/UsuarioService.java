package co.ladorada.backend.service;

import java.time.temporal.ChronoUnit;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.ladorada.backend.dto.EstadoUsuarioRequest;
import co.ladorada.backend.dto.UsuarioDto;
import co.ladorada.backend.dto.UsuarioRequest;
import co.ladorada.backend.exception.NegocioException;
import co.ladorada.backend.exception.NoEncontradoException;
import co.ladorada.backend.exception.SolicitudInvalidaException;
import co.ladorada.backend.model.Usuario;
import co.ladorada.backend.repository.UsuarioRepository;

/**
 * Gestión de usuarios (RF-19, CU-11). Solo la usa el Administrador. Los usuarios nunca se borran: se desactivan y
 * conservan sus pedidos e historial. La contraseña se guarda con BCrypt y no sale en ninguna respuesta.
 * Cada operación es una sola transacción.
 */
@Service
public class UsuarioService {

    private static final Set<String> ROLES = Set.of("ADMINISTRADOR", "VENDEDOR", "BODEGA");
    private static final String ADMINISTRADOR = "ADMINISTRADOR";
    private static final String ACTIVO = "ACTIVO";
    private static final String INACTIVO = "INACTIVO";
    private static final int CLAVE_MINIMA = 8;
    private static final int CLAVE_MAXIMA = 72;   // BCrypt solo lee los primeros 72 bytes

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;

    public UsuarioService(UsuarioRepository usuarios, PasswordEncoder encoder) {
        this.usuarios = usuarios;
        this.encoder = encoder;
    }

    // ------------------------------------------------------------- consultar

    @Transactional(readOnly = true)
    public List<UsuarioDto> listar() {
        return usuarios.findAllByOrderByIdAsc().stream().map(UsuarioDto::de).toList();
    }

    // ----------------------------------------------------------------- crear

    @Transactional
    public UsuarioDto crear(UsuarioRequest r) {
        Datos datos = validar(r);
        if (r.password() == null || r.password().isBlank()) {
            throw new SolicitudInvalidaException("La contraseña temporal es obligatoria.");
        }
        validarClave(r.password());
        if (usuarios.existsByUsernameIgnoreCase(datos.username())) {
            throw new NegocioException("El nombre de usuario \"" + datos.username() + "\" ya está registrado.");
        }

        Usuario u = new Usuario();
        u.setUsername(datos.username());
        u.setNombreCompleto(datos.nombre());
        u.setRol(datos.rol());
        u.setContrasenaHash(encoder.encode(r.password()));   // nunca se guarda la clave escrita
        u.setEstado(ACTIVO);
        return UsuarioDto.de(usuarios.save(u));
    }

    // ---------------------------------------------------------------- editar

    /**
     * Cambia nombre, nombre de usuario y rol; la contraseña solo si llega una nueva. No se puede quitar el rol de
     * Administrador al último Administrador activo (se cuenta con los Administradores bloqueados).
     */
    @Transactional
    public UsuarioDto editar(Integer id, UsuarioRequest r) {
        Datos datos = validar(r);
        boolean cambiaClave = r.password() != null && !r.password().isBlank();
        if (cambiaClave) {
            validarClave(r.password());
        }

        List<Usuario> administradores = usuarios.bloquearAdministradoresActivos();   // FOR UPDATE, en orden por id
        Usuario u = buscar(id);
        if (usuarios.existsByUsernameIgnoreCaseAndIdNot(datos.username(), id)) {
            throw new NegocioException("El nombre de usuario \"" + datos.username() + "\" ya está en uso.");
        }
        if (esAdministradorActivo(u) && !ADMINISTRADOR.equals(datos.rol()) && administradores.size() <= 1) {
            throw new NegocioException("No se puede cambiar el rol al último Administrador activo.");
        }

        u.setNombreCompleto(datos.nombre());
        u.setUsername(datos.username());
        u.setRol(datos.rol());
        if (cambiaClave) {
            u.setContrasenaHash(encoder.encode(r.password()));
        }
        return UsuarioDto.de(u);
    }

    // ---------------------------------------------------------------- estado

    /**
     * Desactiva (con fecha de retiro) o reactiva (sin fecha). Pedir el estado en el que ya está responde 200 sin
     * tocar nada, para no pisar la fecha de retiro. No se desactiva al último Administrador activo: los
     * Administradores se bloquean primero, así que dos desactivaciones a la vez se turnan y la segunda recibe 409.
     */
    @Transactional
    public UsuarioDto cambiarEstado(Integer id, EstadoUsuarioRequest r) {
        if (r == null || r.activo() == null) {
            throw new SolicitudInvalidaException("Debe indicar si el usuario queda activo o inactivo.");
        }

        List<Usuario> administradores = usuarios.bloquearAdministradoresActivos();   // FOR UPDATE, en orden por id
        Usuario u = buscar(id);
        if (ACTIVO.equals(u.getEstado()) == r.activo()) {
            return UsuarioDto.de(u);
        }

        if (r.activo()) {
            u.setEstado(ACTIVO);
            u.setFechaRetiro(null);
        } else {
            if (esAdministradorActivo(u) && administradores.size() <= 1) {
                throw new NegocioException("No se puede desactivar al último Administrador activo.");
            }
            u.setEstado(INACTIVO);
            u.setFechaRetiro(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        }
        return UsuarioDto.de(u);
    }

    // ---------------------------------------------------------------- apoyo

    /** Lo que llega del formulario ya limpio: sin espacios sobrantes, usuario en minúsculas y rol en mayúsculas. */
    private record Datos(String nombre, String username, String rol) {}

    /** Validación en servidor (RNF-04), con los mismos mensajes de la pantalla de Usuarios. */
    private Datos validar(UsuarioRequest r) {
        String nombre = r.nombre() == null ? "" : r.nombre().trim();
        String username = r.username() == null ? "" : r.username().trim().toLowerCase(Locale.ROOT);
        if (nombre.isEmpty() || username.isEmpty()) {
            throw new SolicitudInvalidaException("El nombre completo y el nombre de usuario son obligatorios.");
        }
        if (nombre.length() > 150) {
            throw new SolicitudInvalidaException("El nombre completo admite máximo 150 caracteres.");
        }
        if (username.length() > 50) {
            throw new SolicitudInvalidaException("El nombre de usuario admite máximo 50 caracteres.");
        }
        if (username.chars().anyMatch(Character::isWhitespace)) {
            throw new SolicitudInvalidaException("El nombre de usuario no puede tener espacios.");
        }
        String rol = r.rol() == null ? "" : r.rol().trim().toUpperCase(Locale.ROOT);
        if (!ROLES.contains(rol)) {
            throw new SolicitudInvalidaException("El rol no es válido.");
        }
        return new Datos(nombre, username, rol);
    }

    private void validarClave(String clave) {
        if (clave.length() < CLAVE_MINIMA) {
            throw new SolicitudInvalidaException("La contraseña debe tener al menos " + CLAVE_MINIMA + " caracteres.");
        }
        if (clave.getBytes(StandardCharsets.UTF_8).length > CLAVE_MAXIMA) {
            throw new SolicitudInvalidaException("La contraseña admite máximo " + CLAVE_MAXIMA + " caracteres.");
        }
    }

    private boolean esAdministradorActivo(Usuario u) {
        return ADMINISTRADOR.equals(u.getRol()) && ACTIVO.equals(u.getEstado());
    }

    private Usuario buscar(Integer id) {
        return usuarios.findById(id).orElseThrow(() -> new NoEncontradoException("Usuario no encontrado."));
    }
}
