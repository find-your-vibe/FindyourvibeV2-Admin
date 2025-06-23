import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckInService {
private apiUrl = environment.apiUrl.offlineBooking;

  constructor(private http: HttpClient) { }

  // Online Checkin Methods
  checkInUser(transactionId: string, ticketId: string, quantity: number, organizerId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/check-in`, {
      transactionId,
      ticketId,
      quantity,
      organizerId
    });
  }

  undoCheckIn(checkInId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/check-in/${checkInId}`);
  }

  getCheckInsForTransaction(transactionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/check-ins/${transactionId}`);
  }

  // Offline Booking Methods
  createOfflineBooking(eventId: string, tickets: any[], customerInfo: any, isOfflinePricing:boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/admin-create`, {
      eventId,
      tickets,
      customerInfo,
      isOfflinePricing
    });
  }

  getOfflineBookings(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/event/${eventId}`);
  }
}
