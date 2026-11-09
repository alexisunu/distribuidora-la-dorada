package co.ladorada.backend.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import co.ladorada.backend.model.Usuario;

@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final long horas;

    public JwtService(JwtEncoder encoder, @Value("${app.jwt-horas}") long horas) {
        this.encoder = encoder;
        this.horas = horas;
    }

    public String generar(Usuario u) {
        Instant ahora = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(u.getUsername())
                .issuedAt(ahora)
                .expiresAt(ahora.plus(horas, ChronoUnit.HOURS))
                .claim("rol", u.getRol())
                .claim("uid", u.getId())
                .build();
        JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(cabecera, claims)).getTokenValue();
    }
}
