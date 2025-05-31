import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { EventItem } from '../events/event.service';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Ticket {
  title: string;
  ticketId: string;
  type: string;
  price: number;
  quantity: number;
  ticketDate?: Date | null;
}

export interface Transaction {
  _id: string;
  createdAt: string;
  eventId: EventItem;
  receipt: string;
  rzp_order_id: string;
  status: 'pending' | 'success' | 'failed';
  tickets: Ticket[];
  title: string;
  totalAmount: number;
  transactionType: 'online' | 'offline';
  updatedAt: string;
  userId: {
    _id: string;
    username: string;
    email: string;
    phone: string;
  };
  __v?: number;
}

export interface TransactionResponse {
  success: boolean;
  data: Transaction[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private baseUrl = environment.apiUrl.onlinePayment;
  
  constructor(private http: HttpClient) { }
  
  // Create a new order
  createOrder(orderData: any): Observable<{order_id: string, amount: number}> {
    return this.http.post<{ order_id: string, amount: number }>(`${this.baseUrl}/create`, orderData);
  }
  
  // Verify the payment
  verifyPayment(paymentData: any): Observable<{ success: boolean, message: string }> {
    return this.http.post<{ success: boolean, message: string }>(`${this.baseUrl}/verify`, paymentData);
  }

  // Get all transactions (for admin) with pagination and search
  getAllTransactions(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = 'all'
  ): Observable<TransactionResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    
    if (status && status !== 'all') {
      params = params.set('status', status);
    }
    
    return this.http.get<TransactionResponse>(`${this.baseUrl}/`, { params });
  }
}