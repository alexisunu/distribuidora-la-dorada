package co.ladorada.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import co.ladorada.backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByUsername(String username);
}
