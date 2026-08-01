import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { RefundService } from '../../core/services/refund/refund.service';
import { DashboardMetrics, RefundBatch, RefundBooking, RefundValidationResult, ExportBookingRow } from '../../core/services/refund/refund.models';
import { ToasterComponent } from '../../components/toaster/toaster.component';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-refund-management',
  templateUrl: './refund-management.component.html',
  styleUrls: ['./refund-management.component.css']
})
export class RefundManagementComponent implements OnInit {
  @ViewChild(ToasterComponent) toaster!: ToasterComponent;
  @ViewChild('fileInput') fileInput!: ElementRef;

  activeTab: 'dashboard' | 'process' | 'history' | 'audit' = 'dashboard';
  
  // Dashboard
  metrics: DashboardMetrics | null = null;
  isLoadingMetrics = false;

  // Process Refund Tab
  processMode: 'one_click' | 'excel' = 'one_click';
  cancelledEvents: any[] = [];
  selectedEvent: any = null;
  isLoadingEvents = false;
  isProcessing = false;
  eventBookings: RefundBooking[] = [];
  
  // Excel Mode
  validationResult: RefundValidationResult | null = null;
  uploadedFileName: string = '';
  isUploading = false;

  // History Tab
  historyBatches: RefundBatch[] = [];
  isLoadingHistory = false;
  historyPage = 1;
  historyLimit = 10;
  historyTotalPages = 1;
  historyTotalItems = 0;

  // Audit Tab
  selectedBatchId: string | null = null;
  auditLogs: any[] = [];
  isLoadingAudit = false;

  // Confirmation Modal
  showConfirmModal = false;
  confirmActionType: 'one_click' | 'excel' | null = null;

  constructor(private refundService: RefundService) {}

  ngOnInit(): void {
    this.loadDashboardMetrics();
  }

  setTab(tab: 'dashboard' | 'process' | 'history' | 'audit'): void {
    this.activeTab = tab;
    if (tab === 'dashboard') this.loadDashboardMetrics();
    if (tab === 'process') this.loadCancelledEvents();
    if (tab === 'history') this.loadHistory();
  }

  // --- Dashboard ---
  loadDashboardMetrics(): void {
    this.isLoadingMetrics = true;
    this.refundService.getDashboardMetrics().subscribe({
      next: (res) => {
        if (res.success) {
          this.metrics = res.data;
        }
        this.isLoadingMetrics = false;
      },
      error: () => {
        this.isLoadingMetrics = false;
        if(this.toaster) this.toaster.showToast('error', 'Failed to load metrics');
      }
    });
  }

  // --- Process Refund ---
  loadCancelledEvents(): void {
    this.isLoadingEvents = true;
    this.refundService.getCancelledEvents(1, 100).subscribe({
      next: (res) => {
        if (res.success) {
          this.cancelledEvents = res.data || [];
        }
        this.isLoadingEvents = false;
      },
      error: () => {
        this.isLoadingEvents = false;
        if(this.toaster) this.toaster.showToast('error', 'Failed to load cancelled events');
      }
    });
  }

  onEventSelect(event: any): void {
    if (!event) {
      this.selectedEvent = null;
      this.eventBookings = [];
      this.validationResult = null;
      return;
    }
    
    // Attempt to parse string value if coming directly from select
    try {
      this.selectedEvent = typeof event === 'string' ? JSON.parse(event) : event;
    } catch {
      // Find event if ID was passed
      this.selectedEvent = this.cancelledEvents.find(e => e._id === event);
    }
    
    if (this.selectedEvent && this.processMode === 'one_click') {
      this.loadEventBookings(this.selectedEvent._id);
    }
    this.validationResult = null;
    this.uploadedFileName = '';
  }

  setProcessMode(mode: 'one_click' | 'excel'): void {
    this.processMode = mode;
    this.validationResult = null;
    this.uploadedFileName = '';
    if (this.selectedEvent && mode === 'one_click') {
      this.loadEventBookings(this.selectedEvent._id);
    }
  }

  loadEventBookings(eventId: string): void {
    this.isProcessing = true;
    this.refundService.getEventBookings(eventId).subscribe({
      next: (res) => {
        if (res.success) {
          this.eventBookings = res.data;
        }
        this.isProcessing = false;
      },
      error: () => {
        this.isProcessing = false;
        if(this.toaster) this.toaster.showToast('error', 'Failed to load bookings for event');
      }
    });
  }

  get getTotalRefundAmount(): number {
    return this.eventBookings.reduce((sum, booking) => sum + booking.amount, 0);
  }

  openConfirmModal(type: 'one_click' | 'excel'): void {
    if (!this.selectedEvent) return;
    if (type === 'excel' && (!this.validationResult || !this.validationResult.valid)) {
      if(this.toaster) this.toaster.showToast('error', 'Please upload and validate a valid Excel file first');
      return;
    }
    this.confirmActionType = type;
    this.showConfirmModal = true;
  }

  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.confirmActionType = null;
  }

  executeRefund(): void {
    if (!this.selectedEvent || !this.confirmActionType) return;
    
    this.isProcessing = true;
    this.showConfirmModal = false;
    
    const payload = this.confirmActionType === 'excel' && this.validationResult ? this.validationResult.validatedData : undefined;
    
    this.refundService.executeRefund(this.selectedEvent._id, this.confirmActionType, payload).subscribe({
      next: (res) => {
        this.isProcessing = false;
        if (res.success) {
          if(this.toaster) this.toaster.showToast('success', res.message || 'Refund process initiated successfully');
          this.setTab('history');
        } else {
          if(this.toaster) this.toaster.showToast('error', res.message || 'Failed to initiate refund');
        }
      },
      error: (err) => {
        this.isProcessing = false;
        if(this.toaster) this.toaster.showToast('error', err.error?.message || 'Error executing refund');
      }
    });
  }

  // --- Excel Mode ---
  exportBookingsTemplate(): void {
    if (!this.selectedEvent) return;
    
    this.refundService.exportBookings(this.selectedEvent._id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(res.data);
          const wb: XLSX.WorkBook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
          XLSX.writeFile(wb, `Refund_Template_${this.selectedEvent.title.replace(/\s+/g, '_')}.xlsx`);
        }
      },
      error: () => {
        if(this.toaster) this.toaster.showToast('error', 'Failed to generate template');
      }
    });
  }

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileChange(event: any): void {
    const target = event.target;
    if (target.files.length !== 1) return;
    
    const file = target.files[0];
    this.uploadedFileName = file.name;
    this.isUploading = true;
    
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
        
        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];
        
        const data = XLSX.utils.sheet_to_json(ws);
        
        this.validateUpload(data);
      } catch (error) {
        this.isUploading = false;
        if(this.toaster) this.toaster.showToast('error', 'Invalid Excel file format');
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset file input
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  validateUpload(data: any[]): void {
    if (!this.selectedEvent) return;
    
    this.refundService.validateRefundUpload(this.selectedEvent._id, data).subscribe({
      next: (res) => {
        this.isUploading = false;
        if (res.success) {
          this.validationResult = res.data;
          if (this.validationResult.valid) {
            if(this.toaster) this.toaster.showToast('success', 'File validated successfully');
          } else {
            if(this.toaster) this.toaster.showToast('warning', 'Validation found errors in the file');
          }
        }
      },
      error: (err) => {
        this.isUploading = false;
        if(this.toaster) this.toaster.showToast('error', err.error?.message || 'Failed to validate uploaded file');
      }
    });
  }

  // --- History ---
  loadHistory(): void {
    this.isLoadingHistory = true;
    this.refundService.getRefundHistory(this.historyPage, this.historyLimit).subscribe({
      next: (res) => {
        if (res.success) {
          this.historyBatches = res.data;
          this.historyTotalItems = res.pagination.total;
          this.historyTotalPages = res.pagination.totalPages;
        }
        this.isLoadingHistory = false;
      },
      error: () => {
        this.isLoadingHistory = false;
        if(this.toaster) this.toaster.showToast('error', 'Failed to load refund history');
      }
    });
  }

  changeHistoryPage(page: number): void {
    if (page >= 1 && page <= this.historyTotalPages) {
      this.historyPage = page;
      this.loadHistory();
    }
  }

  viewAuditLog(batchId: string): void {
    this.selectedBatchId = batchId;
    this.setTab('audit');
    this.loadAuditLog(batchId);
  }

  // --- Audit ---
  loadAuditLog(batchId: string): void {
    this.isLoadingAudit = true;
    this.refundService.getAuditLog(batchId).subscribe({
      next: (res) => {
        if (res.success) {
          this.auditLogs = res.data;
        }
        this.isLoadingAudit = false;
      },
      error: () => {
        this.isLoadingAudit = false;
        if(this.toaster) this.toaster.showToast('error', 'Failed to load audit logs');
      }
    });
  }

  getStatusBadgeClass(status: string): string {
    switch(status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100';
      case 'partial':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }
}
