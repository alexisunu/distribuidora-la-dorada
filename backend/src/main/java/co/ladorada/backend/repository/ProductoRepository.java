package co.ladorada.backend.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import co.ladorada.backend.model.Producto;
import jakarta.persistence.LockModeType;

public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    /**
     * SELECT ... FOR UPDATE de varios productos. Siempre en orden por id: si dos pedidos comparten productos,
     * ambos los bloquean en el mismo orden y no se produce un interbloqueo (deadlock).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Producto p where p.id in :ids order by p.id")
    List<Producto> bloquearPorIds(@Param("ids") Collection<Integer> ids);


    boolean existsByReferenciaIgnoreCase(String referencia);

    boolean existsByReferenciaIgnoreCaseAndIdNot(String referencia, Integer id);

    List<Producto> findAllByOrderByNombreAsc();

    List<Producto> findByNombreContainingIgnoreCaseOrReferenciaContainingIgnoreCaseOrderByNombreAsc(String nombre, String referencia);
}
