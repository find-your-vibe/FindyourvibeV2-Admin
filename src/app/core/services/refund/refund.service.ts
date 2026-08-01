import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import {
  DashboardMetrics,
  RefundBatch,
  RefundBooking,
  RefundExecutionResult,
  RefundValidationResult,
  Wallet,
  WalletTransaction,
  ExportBookingRow
} from './refund.models';

export interface CancelledEventResponse {
  success: boolean;
  data: any[]; // Adjust according to EventItem
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HistoryResponse {
  success: boolean;
  data: RefundBatch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RefundService {
  private baseUrl = environment.apiUrl.wallet;

  constructor(private http: HttpClient) {}

  getDashboardMetrics(): Observable<{ success: boolean; data: DashboardMetrics }> {
    return this.http.get<{ success: boolean; data: DashboardMetrics }>(`${this.baseUrl}/admin/metrics`);
  }

  getCancelledEvents(page: number = 1, limit: number = 10, search?: string): Observable<CancelledEventResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString())
      .set('status', 'cancelled');
    
    if (search) {
      params = params.set('search', search);
    }
    
    // We assume the event service or a specific endpoint gives cancelled events
    return this.http.get<CancelledEventResponse>(`${environment.apiUrl.event}/admin/events`, { params });
  }

  getEventBookings(eventId: string): Observable<{ success: boolean; data: RefundBooking[] }> {
    return this.http.get<{ success: boolean; data: RefundBooking[] }>(`${this.baseUrl}/admin/events/${eventId}/bookings`);
  }

  exportBookings(eventId: string): Observable<{ success: boolean; data: ExportBookingRow[] }> {
    return this.http.get<{ success: boolean; data: ExportBookingRow[] }>(`${this.baseUrl}/admin/events/${eventId}/export-bookings`);
  }

  validateRefundUpload(eventId: string, data: any[]): Observable<{ success: boolean; data: RefundValidationResult }> {
    return this.http.post<{ success: boolean; data: RefundValidationResult }>(`${this.baseUrl}/admin/events/${eventId}/validate-refunds`, { refunds: data });
  }

  executeRefund(eventId: string, mode: 'one_click' | 'excel', data?: any[]): Observable<RefundExecutionResult> {
    const payload: any = { mode };
    if (data && mode === 'excel') {
      payload.refunds = data;
    }
    return this.http.post<RefundExecutionResult>(`${this.baseUrl}/admin/events/${eventId}/execute-refund`, payload);
  }

  getRefundStatus(eventId: string): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/admin/events/${eventId}/refund-status`);
  }

  getRefundHistory(page: number = 1, limit: number = 10): Observable<HistoryResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    return this.http.get<HistoryResponse>(`${this.baseUrl}/admin/refund-history`, { params });
  }

  getAuditLog(batchId: string): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/admin/refund-batches/${batchId}/audit`);
  }

  getWalletBalance(userId: string): Observable<{ success: boolean; data: Wallet }> {
    return this.http.get<{ success: boolean; data: Wallet }>(`${this.baseUrl}/admin/users/${userId}/wallet`);
  }

  getWalletHistory(userId: string, page: number = 1, limit: number = 10): Observable<{ success: boolean; data: WalletTransaction[], pagination: any }> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
      
    return this.http.get<{ success: boolean; data: WalletTransaction[], pagination: any }>(`${this.baseUrl}/admin/users/${userId}/wallet/history`, { params });
  }
}
