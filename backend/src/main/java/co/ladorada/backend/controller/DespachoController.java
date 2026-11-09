package co.ladorada.backend.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import co.ladorada.backend.dto.PedidoDto;
import co.ladorada.backend.service.PedidoService;

/** Cola de despachos de Bodega (CU-07). Es la única lista de pedidos que Bodega puede consultar. */
@RestController
@RequestMapping("/api/despachos")
public class DespachoController {

    private final PedidoService service;

    public DespachoController(PedidoService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('BODEGA','ADMINISTRADOR')")
    public List<PedidoDto> cola() {
        return service.colaDespachos();
    }
}
