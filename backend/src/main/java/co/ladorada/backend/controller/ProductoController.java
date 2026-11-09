package co.ladorada.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.ladorada.backend.dto.ExistenciasRequest;
import co.ladorada.backend.dto.ProductoDto;
import co.ladorada.backend.dto.ProductoRequest;
import co.ladorada.backend.service.ProductoService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/productos")
public class ProductoController {

    private final ProductoService service;

    public ProductoController(ProductoService service) {
        this.service = service;
    }

    /** Todos los roles autenticados. */
    @GetMapping
    public List<ProductoDto> listar(@RequestParam(required = false) String q) {
        return service.listar(q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ProductoDto crear(@Valid @RequestBody ProductoRequest r) {
        return service.crear(r);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public ProductoDto editar(@PathVariable Integer id, @Valid @RequestBody ProductoRequest r) {
        return service.editar(id, r);
    }

    @PatchMapping("/{id}/existencias")
    @PreAuthorize("hasAnyRole('BODEGA','ADMINISTRADOR')")
    public ProductoDto ajustarExistencias(@PathVariable Integer id, @Valid @RequestBody ExistenciasRequest r) {
        return service.ajustarExistencias(id, r.existencias());
    }
}
