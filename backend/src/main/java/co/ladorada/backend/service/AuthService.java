package co.ladorada.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import co.ladorada.backend.dto.LoginRequest;
import co.ladorada.backend.dto.LoginResponse;
import co.ladorada.backend.dto.UsuarioDto;
import co.ladorada.backend.exception.NoAutorizadoException;
import co.ladorada.backend.model.Usuario;
import co.ladorada.backend.repository.UsuarioRepository;

@Service
public class AuthService {

    private static final String MENSAJE = "Usuario o contraseña incorrectos.";

    private final UsuarioRepository usuarios;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarios, PasswordEncoder encoder, JwtService jwt) {
        this.usuarios = usuarios;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest req) {
        Usuario u = usuarios.findByUsername(req.username().trim())
                .orElseThrow(() -> new NoAutorizadoException(MENSAJE));
        if (!"ACTIVO".equals(u.getEstado()) || !encoder.matches(req.password(), u.getContrasenaHash())) {
            throw new NoAutorizadoException(MENSAJE);
        }
        return new LoginResponse(jwt.generar(u), UsuarioDto.de(u));
    }
}
