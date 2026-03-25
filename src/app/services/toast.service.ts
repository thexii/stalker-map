import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
    public show(message: string, durationMs: number = 2800): void {
        const el = document.createElement('div');
        el.setAttribute('role', 'status');
        el.className = 'app-toast';
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.classList.add('app-toast--visible');
        });
        window.setTimeout(() => {
            el.classList.remove('app-toast--visible');
            window.setTimeout(() => el.remove(), 220);
        }, durationMs);
    }
}
