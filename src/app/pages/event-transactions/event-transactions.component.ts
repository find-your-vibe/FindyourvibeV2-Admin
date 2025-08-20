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
      phone: '',
    },
    useOfflinePricing: false,
  };

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 5;
  ticketPages: { [key: string]: number } = {};

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

  isEditingOfflineTickets: boolean = false;
  editableTickets: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private eventService: EventService,
    @Inject(TicketService) private transactionService: TicketService,
    private authService: AuthService,
    private checkInService: CheckInService,
    private router: Router
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
          this.applyFilters();

          // Initialize pagination for each ticket type
          this.getTicketTypes().forEach((ticketType) => {
            this.ticketPages[ticketType] = 1;
          });

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
    // First, get all filtered transactions based on search and status
    const filteredTransactions = this.getFilteredTransactions();

    // Reset the filtered grouped transactions
    this.filteredGroupedTransactions = {};

    // Group all transactions by ticket type, regardless of current filter
    filteredTransactions.forEach((transaction) => {
      if (transaction.tickets && transaction.tickets.length > 0) {
        transaction.tickets.forEach((ticket: any) => {
          if (!this.filteredGroupedTransactions[ticket.title]) {
            this.filteredGroupedTransactions[ticket.title] = [];
          }

          this.filteredGroupedTransactions[ticket.title].push({
            ...transaction,
            currentTicket: ticket,
          });
        });
      }
    });

    // Initialize pagination for each ticket type
    this.getTicketTypes().forEach((ticketType) => {
      if (!this.ticketPages[ticketType]) {
        this.ticketPages[ticketType] = 1;
      }
    });
  }

  prepareNewBookingTickets(): void {
  if (this.eventDetails && this.eventDetails.tickets) {
    this.newBooking.tickets = this.eventDetails.tickets.map(
      (ticket: any) => ({
        title: ticket.title,
        price: ticket.price,
        offlinePrice: ticket.offlinePrice || ticket.price,
        quantity: 0,
        ticketId: ticket._id,
        maxQuantity: ticket.seatsLeft > 0 ? ticket.seatsLeft : Infinity,
      })
    );
    // Initialize editable tickets
    this.editableTickets = JSON.parse(
      JSON.stringify(this.newBooking.tickets)
    );
  }
}

toggleOfflinePricing(): void {
  if (this.newBooking.useOfflinePricing) {
    // When enabling offline pricing, make a copy of the original tickets
    this.editableTickets = JSON.parse(
      JSON.stringify(this.newBooking.tickets)
    );
  } else {
    // When disabling, reset to original prices
    this.newBooking.tickets.forEach((ticket: any) => {
      const original = this.eventDetails.tickets.find(
        (t: any) => t._id === ticket.ticketId
      );
      if (original) {
        ticket.offlinePrice = original.offlinePrice || original.price;
      }
    });
  }
}

applyTicketChanges(index: number): void {
  if (this.editableTickets[index]) {
    this.newBooking.tickets[index].title = this.editableTickets[index].title;
    this.newBooking.tickets[index].offlinePrice =
      this.editableTickets[index].offlinePrice;
  }
  this.toaster.showToast('success', 'Ticket changes applied');
}

  createOfflineBooking(): void {
  this.isCreatingBooking = true;
  const validTickets = this.newBooking.tickets
    .filter((t: any) => t.quantity > 0)
    .map((ticket: any) => ({
      ...ticket,
      // Use offline price if enabled, otherwise use regular price
      price: this.newBooking.useOfflinePricing
        ? ticket.offlinePrice
        : ticket.price,
    }));

  if (validTickets.length === 0) {
    this.toaster.showToast('error', 'Please select at least one ticket');
    this.isCreatingBooking = false;
    return;
  }

  if (!this.newBooking.customerInfo.name) {
    this.toaster.showToast('error', 'Customer name is required');
    this.isCreatingBooking = false;
    return;
  }
  if (!this.newBooking.customerInfo.email) {
    this.toaster.showToast('error', 'Customer email is required');
    this.isCreatingBooking = false;
    return;
  }

  this.checkInService
    .createOfflineBooking(
      this.eventId,
      validTickets,
      this.newBooking.customerInfo,
      this.newBooking.useOfflinePricing // Pass the offline pricing flag
    )
    .subscribe({
      next: (response) => {
        if (response.success) {
          this.toaster.showToast(
            'success',
            'Offline booking created successfully'
          );
          this.resetNewBookingForm();
          this.showCreateForm = false;
          this.isCreatingBooking = false;
          this.loadTransactions();
          this.searchQuery = '';
        }
      },
      error: (error) => {
        this.toaster.showToast(
          'error',
          error.error?.message || 'Failed to create offline booking'
        );
        this.isCreatingBooking = false;
      },
    });
}

  resetNewBookingForm(): void {
  this.newBooking = {
    tickets: this.eventDetails.tickets.map((ticket: any) => ({
      title: ticket.title,
      price: ticket.price,
      offlinePrice: ticket.offlinePrice || ticket.price, // Include offline price
      quantity: 0,
      ticketId: ticket._id,
      maxQuantity: ticket.seatsLeft > 0 ? ticket.seatsLeft : 100,
    })),
    customerInfo: {
      name: '',
      email: '',
      phone: '',
    },
    useOfflinePricing: false, // Reset this flag
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
    const price =
      this.newBooking.useOfflinePricing && ticket.offlinePrice
        ? ticket.offlinePrice
        : ticket.price;
    return sum + price * ticket.quantity;
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
          if (transaction.transactionType === 'offline') {
            transaction.tickets.forEach((ticket: any) => {
              if (!ticket.price) {
                ticket.price = ticket.offlinePrice || ticket.price;
              }
            });
          }
          // Copy price if missing
          if (!ticket.price && this.eventDetails?.tickets) {
            const eventTicket = this.eventDetails.tickets.find(
              (t: any) => t._id === ticket.ticketId || t.title === ticket.title
            );
            if (eventTicket) ticket.price = eventTicket.price;
          }

          // Handle dates - prioritize transaction ticketDate first
          if (!ticket.dates) {
            if (ticket.ticketDate) {
              // Use the ticketDate from the transaction if available
              ticket.dates = [[new Date(ticket.ticketDate)]];
            } else if (this.eventDetails?.tickets) {
              const eventTicket = this.eventDetails.tickets.find(
                (t: any) =>
                  t._id === ticket.ticketId || t.title === ticket.title
              );

              if (eventTicket) {
                if (eventTicket.dates) {
                  ticket.dates = eventTicket.dates;
                } else if (eventTicket.ticketDate) {
                  ticket.dates = [[eventTicket.ticketDate]];
                } else if (this.eventDetails.date) {
                  // Fall back to event dates
                  if (
                    this.eventDetails.date.dateType === 'single' &&
                    this.eventDetails.date.date
                  ) {
                    ticket.dates = [[new Date(this.eventDetails.date.date)]];
                  } else if (
                    this.eventDetails.date.dateType === 'multiple' &&
                    this.eventDetails.date.date &&
                    this.eventDetails.date.endDate
                  ) {
                    ticket.dates = [
                      [
                        new Date(this.eventDetails.date.date),
                        new Date(this.eventDetails.date.endDate),
                      ],
                    ];
                  }
                }
              }
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

    // Get regular ticket types
    const regularTickets = this.eventDetails.tickets.map(
      (ticket: any) => ticket.title
    );

    // Get unique ticket types from all transactions (including offline)
    const allTicketTypes = [
      ...new Set(
        this.transactions.flatMap((t) =>
          t.tickets.map((ticket: any) => ticket.title)
        )
      ),
    ];

    // Combine and remove duplicates
    return [...new Set([...regularTickets, ...allTicketTypes])];
  }

  // Get paginated data
  getPaginatedData(data: any[], ticketType: string): any[] {
    const currentPage = this.ticketPages[ticketType] || 1;
    const startIndex = (currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return data.slice(startIndex, endIndex);
  }

  // Pagination controls
  goToPreviousPage(ticketType: string): void {
    if (this.ticketPages[ticketType] > 1) {
      this.ticketPages[ticketType]--;
    }
  }

  goToNextPage(ticketType: string, totalItems: number): void {
    const totalPages = Math.ceil(totalItems / this.itemsPerPage);
    if (this.ticketPages[ticketType] < totalPages) {
      this.ticketPages[ticketType]++;
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
    if (!this.filteredGroupedTransactions[ticketTitle]) return 0;

    return this.filteredGroupedTransactions[ticketTitle].reduce(
      (total: number, transaction: any) => {
        return total + (transaction.currentTicket.quantity || 1);
      },
      0
    );
  }

  // This sums all ticket quantities across all ticket types
  totalAllTicketsSold(): number {
    let total = 0;
    for (const ticketTitle in this.filteredGroupedTransactions) {
      total += this.totalQuantityOfTicketSold(ticketTitle);
    }
    return total;
  }

  // This counts the number of transactions (purchases)
  countTicketPurchases(ticketTitle: string): number {
    return this.filteredGroupedTransactions[ticketTitle]?.length || 0;
  }

  // This counts total number of transactions across all ticket types
  totalAllPurchases(): number {
    let total = 0;
    for (const ticketTitle in this.filteredGroupedTransactions) {
      total += this.countTicketPurchases(ticketTitle);
    }
    return total;
  }

  totalAllBuyers(): number {
    let total = 0;
    for (const ticketTitle in this.filteredGroupedTransactions) {
      total += this.filteredGroupedTransactions[ticketTitle].length;
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
    const processedTransactionIds = new Set<string>();

    // Loop through all ticket types in filtered transactions
    for (const ticketTitle in this.filteredGroupedTransactions) {
      // Loop through transactions for this ticket type
      this.filteredGroupedTransactions[ticketTitle].forEach((transaction: any) => {
        // Only process each transaction once (avoid duplicates)
        if (!processedTransactionIds.has(transaction._id)) {
          processedTransactionIds.add(transaction._id);
          
          if (transaction.checkIns && transaction.checkIns.length > 0) {
            // Sum up the quantity of all check-ins for this transaction
            totalCheckedIn += transaction.checkIns.reduce((sum: number, checkIn: any) => {
              return sum + (checkIn.quantity || 1);
            }, 0);
          }
        }
      });
    }

    return totalCheckedIn;
  }

  navigateToOfflineCheckin(): void {
    this.router.navigate(['/organizer/offline-checkin', this.eventId]);
    console.log('Navigating to offline check-in');
  }

  calculateTotalRevenue(): { original: number; discounted: number } {
  let originalRevenue = 0;
  let discountedRevenue = 0;

  for (const transaction of this.transactions) {
    if (transaction.status === 'success' && transaction.tickets) {
      for (const ticket of transaction.tickets) {
        const ticketTotal = (ticket.price || 0) * (ticket.quantity || 1);
        originalRevenue += ticketTotal;
        
        // For discounted revenue, use the proportional discount if available
        if (transaction.discountedPrice && transaction.originalPrice) {
          const discountRatio = transaction.discountedPrice / transaction.originalPrice;
          discountedRevenue += ticketTotal * discountRatio;
        } else {
          discountedRevenue += ticketTotal;
        }
      }
    }
  }

  return {
    original: originalRevenue,
    discounted: discountedRevenue,
  };
}

  // Calculate offline revenue
  calculateOfflineRevenue(): { original: number; discounted: number } {
    let originalRevenue = 0;
    let discountedRevenue = 0;

    for (const transaction of this.transactions) {
      if (transaction.status === 'success' && transaction.transactionType === 'offline' && transaction.tickets) {
        for (const ticket of transaction.tickets) {
          const ticketTotal = (ticket.price || 0) * (ticket.quantity || 1);
          originalRevenue += ticketTotal;
          
          // For discounted revenue, use the proportional discount if available
          if (transaction.discountedPrice && transaction.originalPrice) {
            const discountRatio = transaction.discountedPrice / transaction.originalPrice;
            discountedRevenue += ticketTotal * discountRatio;
          } else {
            discountedRevenue += ticketTotal;
          }
        }
      }
    }

    return {
      original: originalRevenue,
      discounted: discountedRevenue,
    };
  }

  // Calculate online revenue
  calculateOnlineRevenue(): { original: number; discounted: number } {
    let originalRevenue = 0;
    let discountedRevenue = 0;

    for (const transaction of this.transactions) {
      if (transaction.status === 'success' && transaction.transactionType === 'online' && transaction.tickets) {
        for (const ticket of transaction.tickets) {
          const ticketTotal = (ticket.price || 0) * (ticket.quantity || 1);
          originalRevenue += ticketTotal;
          
          // For discounted revenue, use the proportional discount if available
          if (transaction.discountedPrice && transaction.originalPrice) {
            const discountRatio = transaction.discountedPrice / transaction.originalPrice;
            discountedRevenue += ticketTotal * discountRatio;
          } else {
            discountedRevenue += ticketTotal;
          }
        }
      }
    }

    return {
      original: originalRevenue,
      discounted: discountedRevenue,
    };
  }

  refreshTransactions(): void {
    this.loading = true;
    this.loadTransactions();
    this.toaster.showToast('info', 'Transactions refreshed successfully');
  }

  // Export booking data to CSV
  exportBookingData(): void {
    try {
      // Prepare data for export
      const exportData: any[] = [];
      
      // Add header row
      const headers = [
        'Serial No.',
        'Buyer Name',
        'Buyer Email',
        'Buyer Phone',
        'Ticket Type',
        'Quantity',
        'Original Price (₹)',
        'Discounted Price (₹)',
        'Discount %',
        'Total Amount (₹)',
        'Purchase Date',
        'Transaction Type',
        'Receipt ID',
        'Status',
        'Checked In Quantity',
        'Remaining Quantity',
        'Valid Dates'
      ];
      
      exportData.push(headers);
      
      // Add data rows
      let serialNo = 1;
      
      for (const transaction of this.transactions) {
        if (transaction.tickets && transaction.tickets.length > 0) {
          for (const ticket of transaction.tickets) {
            const checkedInQty = this.getCheckedInQuantity(transaction, ticket._id || ticket.ticketId);
            const remainingQty = (ticket.quantity || 1) - checkedInQty;
            
            // Calculate prices
            const originalPrice = ticket.price || 0;
            const discountedPrice = transaction.discountedPrice ? 
              (transaction.discountedPrice / transaction.originalPrice) * originalPrice : originalPrice;
            const discountPercentage = transaction.discountPercentage || 0;
            const totalAmount = discountedPrice * (ticket.quantity || 1);
            
            // Format valid dates
            let validDates = 'N/A';
            if (ticket.dates && ticket.dates.length > 0) {
              validDates = ticket.dates.map((dateRange: any) => {
                if (Array.isArray(dateRange) && dateRange.length > 0) {
                  const startDate = new Date(dateRange[0]).toLocaleDateString();
                  const endDate = dateRange[1] ? new Date(dateRange[1]).toLocaleDateString() : '';
                  return endDate ? `${startDate} - ${endDate}` : startDate;
                }
                return new Date(dateRange).toLocaleDateString();
              }).join(', ');
            } else if (ticket.ticketDate) {
              validDates = new Date(ticket.ticketDate).toLocaleDateString();
            }
            
            const row = [
              serialNo++,
              transaction.userId?.name || transaction.customerInfo?.name || 'Anonymous',
              transaction.userId?.email || transaction.customerInfo?.email || 'N/A',
              transaction.userId?.phone || transaction.customerInfo?.phone || 'N/A',
              ticket.title,
              ticket.quantity || 1,
              originalPrice,
              discountedPrice.toFixed(2),
              discountPercentage,
              totalAmount.toFixed(2),
              new Date(transaction.createdAt).toLocaleString(),
              transaction.transactionType || 'online',
              transaction.receipt,
              transaction.status,
              checkedInQty,
              remainingQty,
              validDates
            ];
            
            exportData.push(row);
          }
        }
      }
      
      // Convert to CSV
      const csvContent = exportData.map(row => 
        row.map((field: any) => {
          // Handle fields that might contain commas or quotes
          if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
          }
          return field;
        }).join(',')
      ).join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${this.eventDetails?.title || 'Event'}_Booking_Data_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.toaster.showToast('success', 'Booking data exported successfully');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.toaster.showToast('error', 'Failed to export booking data');
    }
  }
}
