package co.ladorada.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import co.ladorada.backend.dto.ProductoDto;
import co.ladorada.backend.dto.ProductoRequest;
import co.ladorada.backend.exception.NegocioException;
import co.ladorada.backend.exception.NoEncontradoException;
import co.ladorada.backend.exception.SolicitudInvalidaException;
import co.ladorada.backend.model.Producto;
import co.ladorada.backend.repository.ProductoRepository;

@Service
public class ProductoService {

    private final ProductoRepository productos;

    public ProductoService(ProductoRepository productos) {
        this.productos = productos;
    }

    @Transactional(readOnly = true)
    public List<ProductoDto> listar(String q) {
        List<Producto> lista = (q == null || q.isBlank())
                ? productos.findAllByOrderByNombreAsc()
                : productos.findByNombreContainingIgnoreCaseOrReferenciaContainingIgnoreCaseOrderByNombreAsc(q.trim(), q.trim());
        return lista.stream().map(ProductoDto::de).toList();
    }

    /** Las existencias iniciales solo se fijan aquí (y después con ajustarExistencias). */
    @Transactional
    public ProductoDto crear(ProductoRequest r) {
        if (r.existencias() == null) {
            throw new SolicitudInvalidaException("Las existencias iniciales son obligatorias al crear un producto");
        }
        if (productos.existsByReferenciaIgnoreCase(r.codigo().trim())) {
            throw new NegocioException("Ya existe un producto con el código " + r.codigo().trim() + ".");
        }
        Producto p = new Producto();
        aplicar(p, r);
        p.setStockActual(r.existencias().intValueExact());   // @Digits(fraction = 0) ya garantizó que es entero
        return ProductoDto.de(productos.save(p));
    }

    /** Ignora r.existencias(): el stock no se edita aquí, solo cambia con crear y ajustarExistencias. */
    @Transactional
    public ProductoDto editar(Integer id, ProductoRequest r) {
        Producto p = buscar(id);
        if (productos.existsByReferenciaIgnoreCaseAndIdNot(r.codigo().trim(), id)) {
            throw new NegocioException("Ya existe otro producto con el código " + r.codigo().trim() + ".");
        }
        aplicar(p, r);
        return ProductoDto.de(p);
    }

    @Transactional
    public ProductoDto ajustarExistencias(Integer id, Integer existencias) {
        Producto p = buscar(id);
        p.setStockActual(existencias);
        return ProductoDto.de(p);
    }

    private Producto buscar(Integer id) {
        return productos.findById(id).orElseThrow(() -> new NoEncontradoException("Producto no encontrado."));
    }

    private void aplicar(Producto p, ProductoRequest r) {
        p.setReferencia(r.codigo().trim());
        p.setNombre(r.nombre().trim());
        p.setDescripcion(r.descripcion());
        p.setPrecioUnitario(r.precio());
        p.setStockMinimo(r.stockMinimo() == null ? 0 : r.stockMinimo());
    }
}
