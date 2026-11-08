package co.ladorada.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import co.ladorada.backend.dto.MotivoRequest;
import co.ladorada.backend.dto.PedidoDto;
import co.ladorada.backend.dto.PedidoRequest;
import co.ladorada.backend.service.PedidoService;

/** Matriz de permisos (documento técnico, Tabla 3): Bodega solo consulta el detalle; despachar llega en el Sprint 3. */
@RestController
@RequestMapping("/api/pedidos")
public class PedidoController {

    private final PedidoService service;

    public PedidoController(PedidoService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR')")
    public List<PedidoDto> listar(@RequestParam(required = false) String estado) {
        return service.listar(estado);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR','BODEGA')")
    public PedidoDto obtener(@PathVariable Integer id) {
        return service.obtener(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR')")
    public PedidoDto crear(@RequestBody PedidoRequest r, @AuthenticationPrincipal Jwt jwt) {
        return service.crear(r, idUsuario(jwt));
    }

    @PostMapping("/{id}/confirmar")
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR')")
    public PedidoDto confirmar(@PathVariable Integer id, @AuthenticationPrincipal Jwt jwt) {
        return service.confirmar(id, idUsuario(jwt));
    }

    @PostMapping("/{id}/rechazar")
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR')")
    public PedidoDto rechazar(@PathVariable Integer id, @RequestBody(required = false) MotivoRequest r,
                              @AuthenticationPrincipal Jwt jwt) {
        return service.rechazar(id, r == null ? null : r.motivo(), idUsuario(jwt));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasAnyRole('VENDEDOR','ADMINISTRADOR')")
    public PedidoDto cancelar(@PathVariable Integer id, @RequestBody(required = false) MotivoRequest r,
                              @AuthenticationPrincipal Jwt jwt) {
        return service.cancelar(id, r == null ? null : r.motivo(), idUsuario(jwt));
    }

    /** El responsable sale del token firmado (claim "uid"), no de algo que mande el cliente. */
    private static Integer idUsuario(Jwt jwt) {
        return ((Number) jwt.getClaim("uid")).intValue();
    }
}
