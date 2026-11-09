package co.ladorada.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import co.ladorada.backend.model.Usuario;
import jakarta.persistence.LockModeType;

public interface UsuarioRepository extends JpaRepository<Usuario, Integer> {
    Optional<Usuario> findByUsername(String username);

    List<Usuario> findAllByOrderByIdAsc();

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByUsernameIgnoreCaseAndIdNot(String username, Integer id);

    /**
     * SELECT ... FOR UPDATE de los Administradores activos, siempre en orden por id. Sirve para "no dejar al sistema
     * sin Administrador": quien desactive o cambie de rol a uno espera a que termine el anterior y cuenta de nuevo
     * los que quedan. Si la base ya cambió una fila mientras esperaba, Postgres la vuelve a evaluar y no la devuelve.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.rol = 'ADMINISTRADOR' and u.estado = 'ACTIVO' order by u.id")
    List<Usuario> bloquearAdministradoresActivos();
}
