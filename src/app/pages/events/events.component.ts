import { Component, OnInit } from '@angular/core';
import { EventService, EventItem } from '../../core/services/events/event.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class EventsComponent implements OnInit {
  events: EventItem[] = [];
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  searchTerm = '';

  constructor(
    private eventService: EventService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm || undefined
    };

    this.eventService.getEvents(params).subscribe({
      next: (response: any) => {
        this.events = response.data;
        this.totalItems = response.pagination?.total || 0;
        this.totalPages = response.pagination?.totalPages || 0;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.isLoading = false;
      }
    });
  }

  searchEvents(): void {
    this.currentPage = 1; // Reset to first page when searching
    this.loadEvents();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchEvents();
  }

  toggleEventStatus(event: EventItem): void {
    const newStatus = event.status === 'active' ? 'inactive' : 'active';
    if(!confirm(`Are you sure you want to change the status of this event to ${newStatus}?`)) {
      return;
    }
    this.eventService.editEvent(event._id!, { status: newStatus }).subscribe({
      next: () => {
        event.status = newStatus;
      },
      error: (err) => {
        console.error('Error updating event status:', err);
      }
    });
  }

  pageChanged(page: number): void {
    this.currentPage = page;
    this.loadEvents();
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage: number, endPage: number;
      
      if (this.currentPage <= Math.ceil(maxVisiblePages / 2)) {
        startPage = 1;
        endPage = maxVisiblePages;
      } else if (this.currentPage + Math.floor(maxVisiblePages / 2) >= this.totalPages) {
        startPage = this.totalPages - maxVisiblePages + 1;
        endPage = this.totalPages;
      } else {
        startPage = this.currentPage - Math.floor(maxVisiblePages / 2);
        endPage = this.currentPage + Math.floor(maxVisiblePages / 2);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  viewEventDetails(eventId: string): void {
    this.router.navigate(['/events', eventId]);
  }
}