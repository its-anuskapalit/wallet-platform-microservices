import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router  = inject(Router);
  const toast   = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        toast.error('Network error — make sure all backend services are running.');
      } else if (error.status === 403) {
        toast.error('Access denied. You do not have permission for this action.');
      } else if (error.status === 404) {
        // Let components handle 404s silently
      } else if (error.status === 409) {
        const msg = error.error?.error ?? 'A conflict occurred.';
        toast.error(msg);
      } else if (error.status >= 500) {
        toast.error('Server error — please try again later.');
      }
      return throwError(() => error);
    })
  );
};
