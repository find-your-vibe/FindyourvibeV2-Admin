/**
 * Service to handle offer-related operations.
 *
 * @remarks
 * This service provides methods to interact with the backend API for managing offers.
 *
 * @example
 * ```typescript
 * constructor(private offerService: OfferService) {}
 * 
 * this.offerService.getOffers().subscribe((response) => {
 *   console.log(response.data);
 * });
 * ```
 */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Offer {
  _id?: string;
  title: string;
  image: {
    url: string;
    public_id: string;
  }[];
  date: Date;
  postedBy: string | null;
  status: 'pending' | 'active' | 'inactive';
  likedBy?: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class OfferService {
  private apiUrl = environment.apiUrl.offer;

  constructor(private http: HttpClient) {}

  /**
   * Get all offers.
   *
   * @returns An observable containing a success flag and an array of offers.
   */
  getOffers(): Observable<{ success: boolean; data: Offer[] }> {
    return this.http.get<{ success: boolean; data: Offer[] }>(this.apiUrl);
  }

  /**
   * Get offers by event ID.
   *
   * @param eventId - The ID of the event to filter offers by.
   * @returns An observable containing a success flag and an array of offers.
   */
  getOffersByEvent(eventId: string): Observable<{ success: boolean; data: Offer[] }> {
    return this.http.get<{ success: boolean; data: Offer[] }>(`${this.apiUrl}/${eventId}`);
  }

  /**
   * Create a new offer.
   *
   * @param offer - The offer object to be created.
   * @returns An observable containing a success flag and the created offer.
   */
  createOffer(offer: Offer): Observable<{ success: boolean; data: Offer }> {
    return this.http.post<{ success: boolean; data: Offer }>(this.apiUrl, offer);
  }

  /**
   * Edit an existing offer.
   *
   * @param offerId - The ID of the offer to be edited.
   * @param offerData - The partial offer data to update.
   * @returns An observable containing a success flag and the updated offer.
   */
  editOffer(offerId: string, offerData: Partial<Offer>): Observable<{ success: boolean; data: Offer }> {
    return this.http.patch<{ success: boolean; data: Offer }>(`${this.apiUrl}/${offerId}`, offerData);
  }

  /**
   * Delete an offer.
   *
   * @param offerId - The ID of the offer to be deleted.
   * @returns An observable containing a success flag and the ID of the deleted offer.
   */
  deleteOffer(offerId: string): Observable<{ success: boolean; data: string }> {
    return this.http.delete<{ success: boolean; data: string }>(`${this.apiUrl}/${offerId}`);
  }
}