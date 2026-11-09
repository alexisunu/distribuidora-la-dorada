package co.ladorada.backend.dto;

import java.math.BigDecimal;

import co.ladorada.backend.model.Producto;

/** Misma forma que la interfaz Producto del frontend (codigo = referencia, precio, existencias). */
public record ProductoDto(Integer id, String codigo, String nombre, String descripcion,
                          BigDecimal precio, Integer existencias, Integer stockMinimo) {
    public static ProductoDto de(Producto p) {
        return new ProductoDto(p.getId(), p.getReferencia(), p.getNombre(), p.getDescripcion(),
                p.getPrecioUnitario(), p.getStockActual(), p.getStockMinimo());
    }
}
