import { Component } from '@angular/core';
import { AuthService } from './core/services/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'frontend';
  isMenuOpen: boolean = false;
  currentYear: number = new Date().getFullYear();

  constructor(private authService: AuthService) {}

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }
}

