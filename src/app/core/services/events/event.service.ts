import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, shareReplay, map, catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface EventResponse {
  success: boolean;
  data: EventItem[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface EventIdObject {
  _id: string;
}

export interface SingleEventResponse {
  success: boolean;
  data: EventItem;
}

interface CouponItem {
  _id: string,
  code: string,
  value: number,
  expiry: string
}

export interface EventTicket {
  title: string,
  occupancy: number,
  seats: number,
  description: string,
  _id?: string,
  seatsLeft: number,
  price: number,
  dates?: string[],
  ticketDate: Date | null,
}

export interface EventItem {
  _id?: string; // Optional because it might not be available when creating a new event
  title: string;
  location: string;
  venue?: string;
  state: string;
  city: string;
  startTime: string[];
  endTime: string[];
  date: {
    dateType: string;
    recurranceDay?: string;
    endDate?: string;
    date: string;
    _id?: string;
    createdAt?: string;
    updatedAt?: string;
  };
  type: string;
  image: { url: string; public_id: string; _id?: string }[]; // Array of objects with `url`, `public_id`, and optional `_id`
  video?: {
    url: string;
    public_id: string;
    _id?: string;
  };
  description: string;
  price: string;
  postedBy: string;
  postingDate: string;
  language: string[];
  status: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  tickets: EventTicket[];
  tnc?: {
    heading: string;
    text: string;
  }[];
  adultsOnly: boolean;
  createdAt?: string; // Optional, added by Mongoose timestamps
  updatedAt?: string; // Optional, added by Mongoose timestamps
  __v?: number; // Optional, version key added by Mongoose
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  refresh?: boolean;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = environment.apiUrl.event;
  private eventsCache$ = new BehaviorSubject<EventItem[]>([]);
  private isDataLoaded = false;
  private paginationInfo = new BehaviorSubject<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Fetches events from API or returns cached events if already loaded
   * Supports pagination through query parameters
   * 
   * @param options Pagination options (page and limit)
   * @returns Observable of events array
   */
  // Update the getEvents method in EventService to return Observable<EventResponse>
getEvents(options: PaginationOptions = { page: 1, limit: 10 }): Observable<EventResponse> {
  let params = new HttpParams();
  if (options.page) params = params.set('page', options.page.toString());
  if (options.limit) params = params.set('limit', options.limit.toString());
  if (options.search) params = params.set('search', options.search);

  return this.http.get<EventResponse>(this.apiUrl, { params }).pipe(
    tap(response => {
      if (response && response.success && response.pagination) {
        this.paginationInfo.next(response.pagination);
        // Update cache with new data
        this.eventsCache$.next(response.data);
        this.isDataLoaded = true;
      }
    }),
    catchError(error => {
      console.error('Error fetching events:', error);
      return of({ success: false, data: [], pagination: undefined });
    })
  );
}

  /**
   * Gets pagination information for the current events query
   */
  getPaginationInfo(): Observable<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } | null> {
    return this.paginationInfo.asObservable();
  }

  /**
   * Gets active events (status !== 'Inactive')
   * 
   * Useful for components that need to display active events
   */
  getActiveEvents(): Observable<EventItem[]> {
    return this.getEvents().pipe(
      map(response => response.data.filter(event => event.status !== 'inactive'))
    );
  }

  /**
   * Force refreshes the events data from the API
   * 
   * @param options Pagination options (page and limit)
   * @returns Observable of events array
   */
  refreshEvents(options: PaginationOptions = { page: 1, limit: 10 }): Observable<EventItem[]> {
    this.isDataLoaded = false;
    return this.getEvents(options).pipe(
      map(response => response.data)
    );
  }

  /**
   * Gets the current events without making an API call
   * 
   * Useful for components that need to access the current events
   */
  getCurrentEvents(): Observable<EventItem[]> {
    return this.eventsCache$.asObservable();
  }

  /**
   * Get event by ID
   * 
   * @param eventId ID of the event to fetch
   */
  getEventById(eventId: string): Observable<EventItem> {
    return this.http.get<SingleEventResponse>(`${this.apiUrl}/${eventId}`).pipe(
      map(response => {
        if (response && response.success) {
          return response.data;
        }
        throw new Error('Event not found');
      }),
      catchError(error => {
        console.error(`Error fetching event ${eventId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Get multiple events by IDs
   * @param eventIdsFormatted An array of objects with _id property
   */
  getEventsByIds(eventIdsFormatted: EventIdObject[]): Observable<EventItem[]> {
    return this.http.post<EventResponse>(`${this.apiUrl}/events`, eventIdsFormatted).pipe(
      map(response => {
        if (response && response.success) {
          return response.data;
        }
        console.warn('API returned unsuccessful response:', response);
        return [];
      }),
      catchError(error => {
        console.error('Error fetching events by IDs:', error);
        return of([]);
      })
    );
  }

  /**
   * Create a new event
   * 
   * @param event Partial event object with the fields to create
   */
  createEvent(event: Partial<EventItem>): Observable<EventItem> {
    return this.http.post<SingleEventResponse>(this.apiUrl, event).pipe(
      map(response => {
        if (response && response.success) {
          // Update cache
          const currentEvents = this.eventsCache$.getValue();
          this.eventsCache$.next([...currentEvents, response.data]);
          return response.data;
        }
        throw new Error('Failed to create event');
      }),
      catchError(error => {
        console.error('Error creating event:', error);
        throw error;
      })
    );
  }

  /**
   * Edit an existing event
   * 
   * @param eventId ID of the event to edit
   * @param event Partial event object with the fields to update
   */
  editEvent(eventId: string, event: Partial<EventItem>): Observable<EventItem> {
    return this.http.put<SingleEventResponse>(`${this.apiUrl}/admin/${eventId}`, event).pipe(
      map(response => {
        if (response && response.success) {
          // Update cache
          const currentEvents = this.eventsCache$.getValue();
          const updatedEvents = currentEvents.map(e => 
            e._id === eventId ? response.data : e
          );
          this.eventsCache$.next(updatedEvents);
          return response.data;
        }
        throw new Error('Failed to update event');
      }),
      catchError(error => {
        console.error(`Error updating event ${eventId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Delete an event
   * 
   * @param eventId ID of the event to delete
   */
  deleteEvent(eventId: string): Observable<boolean> {
    return this.http.delete<{success: boolean}>(`${this.apiUrl}/${eventId}`).pipe(
      map(response => {
        if (response && response.success) {
          // Update cache
          const currentEvents = this.eventsCache$.getValue();
          this.eventsCache$.next(currentEvents.filter(e => e._id !== eventId));
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error(`Error deleting event ${eventId}:`, error);
        return of(false);
      })
    );
  }
  
  /**
   * Check if a coupon code is valid
   * 
   * @param eventId ID of the event
   * @param couponCode Coupon Code to validate
   */
  validateCouponCode(eventId: string, couponCode: string) {
    return this.http.get<{success: boolean, data?: CouponItem, message?: string}>(`${this.apiUrl}/${eventId}/coupons/${couponCode}`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response;
        }
        return null;
      }),
      catchError(error => {
        console.error(`Error validating coupon event ${eventId}:`, error);
        throw error;
      })
    );
  }

  /**
   * Fetch all the coupons for a particular event
   * 
   * @param eventId ID of the event
   */
  getEventCoupons(eventId: string) {
    return this.http.get<{success: boolean, data?: object[], message?: string}>(`${this.apiUrl}/${eventId}/coupons`).pipe(
      map(response => {
        if (response && response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error(`Error fetching coupons, event ${eventId}:`, error);
        throw error;
      })
    );
  }
}