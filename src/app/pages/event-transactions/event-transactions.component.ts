import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from '../../core/services/events/event.service';
import { TicketService } from '../../core/services/ticket/ticket.service';
import { AuthService } from 'src/app/core/services/auth/auth.service';
import { CheckInService } from 'src/app/core/services/check-in/check-in.service';
import { ToasterComponent } from 'src/app/components/toaster/toaster.component';

@Component({
  selector: 'app-event-transactions',
  templateUrl: './event-transactions.component.html',
  styleUrls: ['./event-transactions.component.css'],
})
export class EventTransactionsComponent implements OnInit {
  @ViewChild(ToasterComponent) toaster!: ToasterComponent;
  eventId: string = '';
  eventDetails: any = null;
  transactions: any[] = [];
  loading: boolean = true;
  groupedTransactions: any = {};
  filteredGroupedTransactions: any = {};
  showCreateForm: boolean = false;
  newBooking: any = {
    tickets: [],
    customerInfo: {
      name: '',
      email: '',
      phone: ''
    }
  };

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;

  // Filter options
  filterStatus: string = 'all';
  filterTicketType: string = 'all';
  searchQuery: string = '';

  // Check-in Modal properties
  showCheckInModal: boolean = false;
  selectedTransaction: any = null;
  showCheckInForm: boolean = false;
  checkInQuantity: number = 1;
  isCreatingBooking: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    @Inject(TicketService) private transactionService: TicketService,
    private authService: AuthService,
    private checkInService: CheckInService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.eventId = params['eventid'];
      this.loadEventDetails();
      this.loadTransactions();
    });
  }

  loadEventDetails(): void {
    this.eventService.getEventById(this.eventId).subscribe(
      (event) => {
        this.eventDetails = event;
        this.prepareNewBookingTickets();
      },
      (error) => {
        console.error('Error loading event details:', error);
      }
    );
  }

  loadTransactions(): void {
    this.transactionService.getTransactionsByEvent(this.eventId).subscribe(
      (response) => {
        if (response.success) {
          this.transactions = response.data;
          this.processTransactions();
          this.applyFilters(); // Apply initial filters
          this.loading = false;
        }
      },
      (error) => {
        console.error('Error loading transactions:', error);
        this.loading = false;
      }
    );
  }

  applyFilters(): void {
    // First get filtered transactions
    const filteredTransactions = this.getFilteredTransactions();

    // Then group them
    this.groupTransactions(filteredTransactions);
  }

  prepareNewBookingTickets(): void {
    if (this.eventDetails && this.eventDetails.tickets) {
      this.newBooking.tickets = this.eventDetails.tickets.map((ticket: any) => ({
        title: ticket.title,
        price: ticket.price,
        quantity: 0,
        ticketId: ticket._id,
        maxQuantity: ticket.seatsLeft > 0 ? ticket.seatsLeft : Infinity // Arbitrary high number for unlimited
      }));
    }
  }

  createOfflineBooking(): void {
    // Filter out tickets with quantity 0
    this.isCreatingBooking = true;
    const validTickets = this.newBooking.tickets.filter((t: any) => t.quantity > 0);
    
    if (validTickets.length === 0) {
      this.toaster.showToast('error', 'Please select at least one ticket');
      return;
    }

    if (!this.newBooking.customerInfo.name) {
      this.toaster.showToast('error', 'Customer name is required');
      return;
    }
    if (!this.newBooking.customerInfo.email) {
      this.toaster.showToast('error', 'Customer email is required');
      return;
    }

    this.checkInService.createOfflineBooking(
      this.eventId,
      validTickets,
      this.newBooking.customerInfo
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.toaster.showToast('success', 'Offline booking created successfully');
          this.resetNewBookingForm();
          this.showCreateForm = false;
          this.isCreatingBooking = false;
          this.loadTransactions(); // Reload transactions to reflect the new booking
          this.searchQuery = ''; // Reset search query
        }
      },
      error: (error) => {
        this.toaster.showToast('error', error.error?.message || 'Failed to create offline booking');
        this.isCreatingBooking = false;
      }
    });
  }

  resetNewBookingForm(): void {
    this.newBooking = {
      tickets: this.eventDetails.tickets.map((ticket: any) => ({
        title: ticket.title,
        price: ticket.price,
        quantity: 0,
        ticketId: ticket._id,
        maxQuantity: ticket.seatsLeft > 0 ? ticket.seatsLeft : 100
      })),
      customerInfo: {
        name: '',
        email: '',
        phone: ''
      }
    };
  }

  increaseQuantity(ticket: any): void {
    if (ticket.quantity < ticket.maxQuantity) {
      ticket.quantity++;
    }
  }

  decreaseQuantity(ticket: any): void {
    if (ticket.quantity > 0) {
      ticket.quantity--;
    }
  }

  getTotalAmount(): number {
    return this.newBooking.tickets.reduce((sum: number, ticket: any) => {
      return sum + (ticket.price * ticket.quantity);
    }, 0);
  }

  // Update the grouping method
  groupTransactions(transactions: any[]): void {
    this.groupedTransactions = {};
    this.filteredGroupedTransactions = {};

    transactions.forEach((transaction) => {
      if (transaction.tickets && transaction.tickets.length > 0) {
        transaction.tickets.forEach((ticket: any) => {
          if (!this.groupedTransactions[ticket.title]) {
            this.groupedTransactions[ticket.title] = [];
            this.filteredGroupedTransactions[ticket.title] = [];
          }

          this.groupedTransactions[ticket.title].push({
            ...transaction,
            currentTicket: ticket,
          });

          // Only add to filtered if it matches ticket type filter
          if (
            this.filterTicketType === 'all' ||
            this.filterTicketType === ticket.title
          ) {
            this.filteredGroupedTransactions[ticket.title].push({
              ...transaction,
              currentTicket: ticket,
            });
          }
        });
      }
    });
  }

  // Process transactions to ensure ticket-specific data is properly set
  processTransactions(): void {
    this.transactions.forEach((transaction) => {
      if (transaction.tickets && transaction.tickets.length > 0) {
        transaction.tickets.forEach((ticket: any) => {
          // Make sure each ticket has its individual price
          if (!ticket.price && this.eventDetails && this.eventDetails.tickets) {
            const eventTicket = this.eventDetails.tickets.find(
              (t: any) => t.title === ticket.title
            );
            if (eventTicket) {
              ticket.price = eventTicket.price;
            }
          }

          // Make sure dates are set correctly
          if (!ticket.dates && this.eventDetails && this.eventDetails.tickets) {
            const eventTicket = this.eventDetails.tickets.find(
              (t: any) => t.title === ticket.title
            );
            if (eventTicket && eventTicket.dates) {
              ticket.dates = eventTicket.dates;
            }
          }
        });
      }
    });
  }

  // Get ticket price from event details if not provided in transaction
  getTicketPrice(ticketTitle: string): number {
    if (this.eventDetails && this.eventDetails.tickets) {
      const ticket = this.eventDetails.tickets.find(
        (t: any) => t.title === ticketTitle
      );
      return ticket ? ticket.price : 0;
    }
    return 0;
  }

  groupTransactionsByTicket(): void {
    // Reset grouped transactions
    this.groupedTransactions = {};

    // Group transactions by ticket title
    this.transactions.forEach((transaction) => {
      if (transaction.tickets && transaction.tickets.length > 0) {
        transaction.tickets.forEach((ticket: any) => {
          if (!this.groupedTransactions[ticket.title]) {
            this.groupedTransactions[ticket.title] = [];
          }

          // Add transaction with specific ticket info
          this.groupedTransactions[ticket.title].push({
            ...transaction,
            currentTicket: ticket,
          });
        });
      }
    });
  }

  // Get filtered transactions
  getFilteredTransactions(): any[] {
    let filtered = [...this.transactions];

    // Filter by status
    if (this.filterStatus !== 'all') {
      filtered = filtered.filter((t) => t.status === this.filterStatus);
    }

    // Filter by search query (buyer name, receipt ID, etc.)
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.userId?.name && t.userId.name.toLowerCase().includes(query)) ||
          (t.userId?.email && t.userId.email.toLowerCase().includes(query)) ||
          (t.receipt && t.receipt.toLowerCase().includes(query))
      );
    }

    return filtered;
  }

  // Get ticket types from event details
  getTicketTypes(): string[] {
    if (!this.eventDetails || !this.eventDetails.tickets) return [];
    return this.eventDetails.tickets.map((ticket: any) => ticket.title);
  }

  // Get paginated data
  getPaginatedData(data: any[]): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }

  // Pagination controls
  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage(totalItems: number): void {
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
    }
  }

  // Format date to readable string
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  // Get transaction status class for styling
  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  calculateTotalPages(items: number, itemsPerPage: number): number {
    return Math.ceil(items / itemsPerPage);
  }

  totalQuantityOfTicketSold(ticketTitle: string): number {
    let total = 0;
    if (this.groupedTransactions[ticketTitle]) {
      this.groupedTransactions[ticketTitle].forEach((transaction: any) => {
        total += transaction.currentTicket.quantity || 1;
      });
    }
    return total;
  }

  // Add this new function to calculate total tickets across all types
  totalAllTicketsSold(): number {
    let total = 0;
    for (const ticketTitle in this.groupedTransactions) {
      total += this.totalQuantityOfTicketSold(ticketTitle);
    }
    return total;
  }

  // UPDATED: Open modal instead of directly checking in
  openCheckInModal(transaction: any): void {
    this.selectedTransaction = transaction;
    this.showCheckInModal = true;
    this.checkInQuantity = 1; // Reset quantity for new check-in
  }

  closeCheckInModal(): void {
    this.showCheckInModal = false;
    this.selectedTransaction = null;
    this.showCheckInForm = false;
  }

  // Check-in form controls
  openCheckInForm(): void {
    this.showCheckInForm = true;
    this.checkInQuantity = 1;
  }

  cancelCheckInForm(): void {
    this.showCheckInForm = false;
  }

  increaseCheckInQuantity(): void {
    const remaining = this.getRemainingTickets();
    if (this.checkInQuantity < remaining) {
      this.checkInQuantity++;
    }
  }

  decreaseCheckInQuantity(): void {
    if (this.checkInQuantity > 1) {
      this.checkInQuantity--;
    }
  }

  getRemainingTickets(): number {
    if (!this.selectedTransaction) return 0;

    const totalTickets = this.selectedTransaction.currentTicket.quantity || 1;
    const checkedInTickets = this.getCheckedInQuantity(
      this.selectedTransaction,
      this.selectedTransaction.currentTicket._id
    );

    return totalTickets - checkedInTickets;
  }

  submitCheckIn(): void {
    if (!this.selectedTransaction || this.checkInQuantity < 1) return;

    this.checkInService
      .checkInUser(
        this.selectedTransaction._id,
        this.selectedTransaction.currentTicket._id,
        this.checkInQuantity,
        this.authService.getCurrentUser()._id
      )
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update the local transaction data
            if (!this.selectedTransaction.checkIns) {
              this.selectedTransaction.checkIns = [];
            }
            this.selectedTransaction.checkIns.push(response.data);

            // Close the check-in form but keep modal open
            this.showCheckInForm = false;

            // Show success message (if you have a toast service)
            // this.toastService.success(`Successfully checked in ${this.checkInQuantity} tickets`);
            this.toaster.showToast(
              'success',
              `Successfully checked in ${this.checkInQuantity} tickets`
            );
          }
        },
        error: (error) => {
          console.log('Error checking in:', error);
          this.toaster.showToast(
            'error',
            `Failed to check in: ${error.error?.message || 'Unknown error'}`
          );
        },
      });
  }

  // Original check-in function - now simplified to handle single tickets
  checkIn(transaction: any, ticket: any): void {
    // Simplified approach - always use the modal for better user experience
    this.openCheckInModal(transaction);
  }

  undoCheckIn(transaction: any, checkInId: string): void {
    this.checkInService.undoCheckIn(checkInId).subscribe({
      next: (response) => {
        if (response.success) {
          // Remove the check-in from local data
          transaction.checkIns = transaction.checkIns.filter(
            (ci: any) => ci._id !== checkInId
          );
          this.toaster.showToast('success', `Successfully undone check-in`);
        }
      },
      error: (error) => {
        this.toaster.showToast(
          'error',
          `Failed to undo check-in: ${error.error?.message || 'Unknown error'}`
        );
      },
    });
  }

  getCheckedInQuantity(transaction: any, ticketId: string): number {
    if (!transaction || !transaction.checkIns) return 0;
    return transaction.checkIns
      .filter((ci: any) => ci.ticketId === ticketId)
      .reduce((sum: number, ci: any) => sum + (ci.quantity || 1), 0);
  }

  totalCheckedInCount(): number {
    let totalCheckedIn = 0;

    // Loop through all ticket types
    for (const ticketTitle in this.groupedTransactions) {
      // Loop through transactions for this ticket type
      this.groupedTransactions[ticketTitle].forEach((transaction: any) => {
        if (transaction.checkIns && transaction.checkIns.length > 0) {
          // Sum up the quantity of all check-ins for this transaction
          transaction.checkIns.forEach((checkIn: any) => {
            totalCheckedIn += checkIn.quantity || 1;
          });
        }
      });
    }

    return totalCheckedIn;
  }

  navigateToOfflineCheckin(): void {
    this.router.navigate(['/organizer/offline-checkin', this.eventId]);
    console.log('Navigating to offline check-in');
    
  }
}
