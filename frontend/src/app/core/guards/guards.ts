import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const autenticado: CanActivateFn = () => {
  const a = inject(AuthService);
  return a.usuario() ? true : inject(Router).createUrlTree(['/login']);
};

/** Uso: canActivate: [rolPermitido('ADMINISTRADOR')] */
export const rolPermitido = (...roles: string[]): CanActivateFn => () => {
  const a = inject(AuthService);
  return a.rol() && roles.includes(a.rol()!) ? true : inject(Router).createUrlTree([a.usuario() ? a.inicio(a.rol()!) : '/login']);
};
