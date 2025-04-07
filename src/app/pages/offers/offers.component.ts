import { Component, OnInit } from '@angular/core';
import { Offer, OfferService } from '../../core/services/offers/offer.service';

@Component({
  selector: 'app-admin-offers',
  templateUrl: './offers.component.html',
  styleUrls: ['./offers.component.css']
})
export class OffersComponent implements OnInit {
  offers: Offer[] = [];
  filteredOffers: Offer[] = [];
  isLoading = true;
  searchTerm = '';

  constructor(private offerService: OfferService) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.isLoading = true;
    this.offerService.getOffers().subscribe({
      next: (response) => {
        this.offers = response.data;
        this.filteredOffers = [...this.offers];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading offers:', err);
        this.isLoading = false;
      }
    });
  }

  filterOffers(): void {
    if (!this.searchTerm) {
      this.filteredOffers = [...this.offers];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredOffers = this.offers.filter(offer => 
      offer.title.toLowerCase().includes(term) || 
      (offer.description && offer.description.toLowerCase().includes(term))
    );
  }

  toggleOfferStatus(offer: Offer): void {
    const newStatus = offer.status === 'active' ? 'inactive' : 'active';
    if (!confirm(`Are you sure you want to change the status of this offer to ${newStatus}?`)) {
      return;
    }
    this.offerService.editOffer(offer._id!, { status: newStatus }).subscribe({
      next: () => {
        offer.status = newStatus;
        // Update the filtered offers if needed
        this.filterOffers();
      },
      error: (err) => {
        console.error('Error updating offer status:', err);
      }
    });
  }
}