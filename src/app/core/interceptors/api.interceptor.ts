import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  let headers = req.headers.set('Accept', 'application/json');

  if (environment.apiKey) {
    headers = headers.set('Authorization', `Bearer ${environment.apiKey}`);
  }

  // Attach CSRF token if cookie is present and it's a mutating request
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const xsrfToken = getCookie('XSRF-TOKEN');
    if (xsrfToken) {
      headers = headers.set('X-XSRF-TOKEN', xsrfToken);
    }
  }

  const modifiedReq = req.clone({
    headers,
    withCredentials: true // send cookies for session/sanctum
  });

  return next(modifiedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 419) {
        // CSRF Token mismatch / session expired -> refresh health and retry once
        const healthUrl = `${environment.apiBaseUrl}/health`;
        const healthReq = new HttpRequest('GET', healthUrl, { withCredentials: true });
        
        return next(healthReq).pipe(
          switchMap(() => {
            const freshXsrfToken = getCookie('XSRF-TOKEN');
            let retryHeaders = modifiedReq.headers;
            if (freshXsrfToken) {
              retryHeaders = retryHeaders.set('X-XSRF-TOKEN', freshXsrfToken);
            }
            return next(modifiedReq.clone({ headers: retryHeaders }));
          }),
          catchError(() => throwError(() => error))
        );
      }
      return throwError(() => error);
    })
  );
};
