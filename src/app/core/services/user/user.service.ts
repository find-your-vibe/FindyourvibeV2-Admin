import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface User {
  _id?: string;
  name: string;
  email: string;
  role?: string;
  interests?: string[];
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  phone?: string;
}

export interface PaginatedUsersResponse {
  success: boolean;
  data: User[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    search?: string;
  };
}

export interface WishlistEvent {
  eventId: string;
  addedAt: string;
  _id: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl.user;

  constructor(private http: HttpClient) { }

  // Get all users with pagination (admin only)
  getAllUsers(
    page: number = 1, 
    limit: number = 10,
    search: string = ''
  ): Observable<PaginatedUsersResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
  
    if (search) {
      params = params.set('search', search);
    }
  
    return this.http.get<PaginatedUsersResponse>(`${this.apiUrl}/`, { params });
  }

  // Update user role (admin only)
  updateUserRole(userId: string, role: string): Observable<{ success: boolean, data: User }> {
    return this.http.patch<{ success: boolean, data: User }>(
      `${this.apiUrl}/${userId}/role`,
      { role }
    );
  }

  // Get current user's details
  getMyDetails(): Observable<{ success: boolean, data: User }> {
    return this.http.get<{ success: boolean, data: User }>(`${this.apiUrl}/me`);
  }

  // Delete user (admin only)
  deleteUser(userId: string): Observable<{ success: boolean, message: string }> {
    return this.http.delete<{ success: boolean, message: string }>(
      `${this.apiUrl}/${userId}`
    );
  }
}