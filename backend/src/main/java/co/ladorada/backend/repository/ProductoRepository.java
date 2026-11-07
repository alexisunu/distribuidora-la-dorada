package co.ladorada.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import co.ladorada.backend.model.Producto;

public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    boolean existsByReferenciaIgnoreCase(String referencia);

    boolean existsByReferenciaIgnoreCaseAndIdNot(String referencia, Integer id);

    List<Producto> findAllByOrderByNombreAsc();

    List<Producto> findByNombreContainingIgnoreCaseOrReferenciaContainingIgnoreCaseOrderByNombreAsc(String nombre, String referencia);
}
