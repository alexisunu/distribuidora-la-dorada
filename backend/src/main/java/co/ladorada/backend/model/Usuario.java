package co.ladorada.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "usuario")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_usuario")
    private Integer id;

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "contrasena_hash", nullable = false)
    private String contrasenaHash;

    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    /** ADMINISTRADOR, VENDEDOR o BODEGA */
    @Column(name = "rol", nullable = false, length = 20)
    private String rol;

    /** ACTIVO o INACTIVO (los usuarios nunca se borran) */
    @Column(name = "estado", nullable = false, length = 10)
    private String estado;

    @Column(name = "fecha_retiro")
    private LocalDateTime fechaRetiro;
}
