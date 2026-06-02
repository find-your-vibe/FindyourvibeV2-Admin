import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private authUrl = environment.apiUrl.auth + '/api/v1/auth'; // Auth Microservice URL
  private userSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient) {
    // Initialize the userSubject with data from localStorage on service creation
    this.loadUserFromStorage();
  }

  // Load user from localStorage on app initialization
  private loadUserFromStorage(): void {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (userData && token) {
      try {
        const user = JSON.parse(userData);
        this.userSubject.next(user);
      } catch (error) {
        console.error('Error parsing user data', error);
        this.userSubject.next(null);
      }
    }
  }

  /**
   * Register a new user
   */
  register(
    name: string,
    email: string,
    password: string,
    phone: string,
    role: string
  ): Observable<any> {
    return this.http.post(`${this.authUrl}/register`, {
      name,
      email,
      password,
      phone,
      role,
    });
  }

  /**
   * Login an existing user
   */
  login(email: string, password: string,captchaResponse?: string): Observable<any> {
    return this.http.post(`${this.authUrl}/login`, { email, password,captchaResponse }).pipe(
      map((response: any) => {
        // Store both token and user in localStorage
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('interest_modal_shown', 'false');

        // Update the user subject
        this.userSubject.next(response.user);
        return response;
      })
    );
  }
  /**
   * Logout the current user
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.userSubject.next(null);
  }

  /**
   * Get the current user's token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get the current user
   */
  getCurrentUser(): any {
    return this.userSubject.value;
  }

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
