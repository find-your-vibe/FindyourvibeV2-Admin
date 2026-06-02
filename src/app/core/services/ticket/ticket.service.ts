import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = environment.apiUrl.onlinePayment;

  constructor(private http: HttpClient) { }

  /**
   * Get all transactions for a specific event
   * @param eventId The ID of the event to get transactions for
   * @returns Observable with transaction data
   */
  getTransactionsByEvent(eventId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/${eventId}`);
  }

  /**
   * Get transaction details by ID
   * @param transactionId The ID of the transaction
   * @returns Observable with transaction details
   */
  getTransactionById(transactionId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/details/${transactionId}`);
  }

  /**
   * Get transactions summary for dashboard analytics
   * @returns Observable with transaction summary data
   */
  getTransactionsSummary(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/summary`);
  }
}
