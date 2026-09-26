import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from '../services/toast.service';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

function extractErrorMessage(error: HttpErrorResponse): string {
  if (error.error) {
    if (typeof error.error === 'object') {
      if (typeof error.error.message === 'string' && error.error.message.trim().length > 0) {
        return error.error.message;
      }
      if (error.error.errors && typeof error.error.errors === 'object') {
        const firstKey = Object.keys(error.error.errors)[0];
        const firstVal = error.error.errors[firstKey];
        if (Array.isArray(firstVal) && firstVal.length > 0) {
          return firstVal[0];
        } else if (typeof firstVal === 'string' && firstVal.trim().length > 0) {
          return firstVal;
        }
      }
      if (typeof error.error.error === 'string' && error.error.error.trim().length > 0) {
        return error.error.error;
      }
    } else if (typeof error.error === 'string' && error.error.trim().length > 0) {
      try {
        const parsed = JSON.parse(error.error);
        if (parsed?.message && typeof parsed.message === 'string') {
          return parsed.message;
        }
      } catch {
        return error.error;
      }
    }
  }

  if (error.status === 0) {
    return 'Server nicht erreichbar oder Netzwerkfehler.';
  }

  if (error.status === 413) {
    return 'Die Datei ist zu groß für den Upload.';
  }

  return error.statusText || error.message || 'Ein Fehler ist aufgetreten.';
}

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const toastService = inject(ToastService);
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
          catchError((retryErr: unknown) => {
            if (retryErr instanceof HttpErrorResponse && !req.headers.has('X-Skip-Toast')) {
              toastService.error(extractErrorMessage(retryErr));
            }
            return throwError(() => retryErr);
          })
        );
      }

      if (error instanceof HttpErrorResponse && !req.headers.has('X-Skip-Toast')) {
        toastService.error(extractErrorMessage(error));
      }

      return throwError(() => error);
    })
  );
};

