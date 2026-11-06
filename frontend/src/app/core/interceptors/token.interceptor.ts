import { HttpInterceptorFn } from '@angular/common/http';

/** Agrega el token a cada llamada a /api */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const t = sessionStorage.getItem('token');
  return next(t ? req.clone({ setHeaders: { Authorization: `Bearer ${t}` } }) : req);
};
