
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { delay, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Toast {
  type: 'success' | 'error' | 'info';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast | null>();
  public toast$ = this.toastSubject.asObservable().pipe(
    tap(toast => {
      if (toast) {
        // This is a bit of a trick to auto-dismiss
        // In a real app you might handle this in the component
        setTimeout(() => this.clear(), 3000);
      }
    })
  );

  show(type: Toast['type'], message: string) {
    this.toastSubject.next({ type, message });
  }

  clear() {
    this.toastSubject.next(null);
  }
}
