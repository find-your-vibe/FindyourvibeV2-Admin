import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service'; // Import AuthService
import { environment } from 'src/environments/environment';

export interface UploadResponse {
  data: any;
  success: boolean;
  imageUrl: string;
  publicId: string;
}

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = environment.apiUrl.event; 
  private uploadProgress$ = new BehaviorSubject<number>(0);

  constructor(private http: HttpClient, private authService: AuthService) {}

  /**
   * Get the current upload progress
   */
  getUploadProgress(): Observable<number> {
    return this.uploadProgress$.asObservable();
  }

  /**
   * Upload a file with progress tracking
   */
  uploadFile(file: File): Observable<HttpEvent<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    // Add authorization header
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    const req = new HttpRequest('POST', `${this.apiUrl}/image`, formData, {
      reportProgress: true,
      headers: headers, // Include the authorization header
    });

    return this.http.request<UploadResponse>(req).pipe(
      tap((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          this.uploadProgress$.next(progress);
        } else if (event.type === HttpEventType.Response) {
          // Upload complete
          this.uploadProgress$.next(100);
          // Reset progress after a short delay
          setTimeout(() => this.uploadProgress$.next(0), 1000);
        }
      }),
      catchError((error) => {
        console.error('Error uploading file:', error);
        this.uploadProgress$.next(0);
        throw error;
      })
    );
  }

  /**
   * Simple upload without progress tracking
   */
  upload(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    // Add authorization header
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    return this.http
      .post<UploadResponse>(`${this.apiUrl}/image`, formData, { headers })
      .pipe(
        catchError((error) => {
          console.error('Error uploading file:', error);
          throw error;
        })
      );
  }

  /**
   * Delete an uploaded file by public ID
   */
  deleteUpload(publicId: string): Observable<boolean> {
    // Add authorization header
    const headers = new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });

    return this.http
      .delete<{ success: boolean }>(`${this.apiUrl}/image/${publicId}`, { headers })
      .pipe(
        map((response) => response.success),
        catchError((error) => {
          console.error(`Error deleting upload ${publicId}:`, error);
          throw error;
        })
      );
  }
}