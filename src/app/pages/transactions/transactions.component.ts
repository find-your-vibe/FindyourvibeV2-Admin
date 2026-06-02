import { Component, OnInit } from '@angular/core';
import { PaymentService, Transaction, TransactionResponse } from '../../core/services/payments/payment.service';

@Component({
  selector: 'app-admin-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.css']
})
export class TransactionsComponent implements OnInit {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  isLoading = true;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  searchTerm = '';
  statusFilter: string = 'success';
  transactionTypes = ['all', 'online', 'offline'];
  statusTypes = ['all', 'pending', 'success', 'failed'];

  constructor(private paymentService: PaymentService) {}

  ngOnInit(): void {
    this.loadTransactions();
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.paymentService.getAllTransactions(
      this.currentPage,
      this.itemsPerPage,
      this.searchTerm,
      this.statusFilter
    ).subscribe({
      next: (response) => {
        this.transactions = response.data || [];
        this.filteredTransactions = [...this.transactions];
        this.totalItems = response.pagination?.total || 0;
        
        // Calculate total pages based on total items and items per page
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading transactions:', err);
        this.isLoading = false;
      }
    });
  }

  searchTransactions(): void {
    this.currentPage = 1;
    this.loadTransactions();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchTransactions();
  }

  onStatusFilterChange(): void {
    this.currentPage = 1;
    this.loadTransactions();
  }

  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'success':
        return 'badge bg-success';
      case 'failed':
        return 'badge bg-danger';
      case 'pending':
        return 'badge bg-warning text-dark';
      default:
        return 'badge bg-secondary';
    }
  }

  pageChanged(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadTransactions();
    }
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
}