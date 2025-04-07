import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Observable } from 'rxjs';

export interface EmailPayload {
  isSubscribed: boolean;
  subject: string;
  template: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = `${environment.apiUrl.email}`;

  constructor(private http: HttpClient) { }

  sendAdminEmail(payload: EmailPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/send-mail`, payload);
  }
}