import { Component } from '@angular/core';

interface ToastMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-toaster',
  templateUrl: './toaster.component.html',
  styleUrls: ['./toaster.component.css'],
})
export class ToasterComponent {
  toasts: ToastMessage[] = [];

  showToast(type: 'success' | 'error' | 'warning' | 'info', message: string) {
    const toast = { type, message };
    this.toasts.push(toast);

    setTimeout(() => {
      this.removeToast(toast);
    }, 3000);
  }

  removeToast(toast: ToastMessage) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }
}
