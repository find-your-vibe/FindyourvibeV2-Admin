export interface Wallet {
  userId: string;
  balance: number;
  currency: string;
  status: 'active' | 'suspended' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  referenceId: string;
  referenceType: 'refund' | 'payment' | 'withdrawal' | 'adjustment';
  description?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RefundBooking {
  bookingId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  amount: number;
  ticketCount: number;
  paymentMethod: string;
  paymentStatus: string;
}

export interface RefundBatch {
  _id: string;
  eventId: string;
  eventTitle?: string;
  totalAmount: number;
  totalBookings: number;
  successfulRefunds: number;
  failedRefunds: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
  processedBy: string;
  mode: 'one_click' | 'excel';
  createdAt: string;
  updatedAt: string;
}

export interface RefundItem {
  _id: string;
  batchId: string;
  bookingId: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalRefundsAmount: number;
  totalRefundsCount: number;
  pendingRefunds: number;
  failedRefunds: number;
  todayRefundsAmount: number;
}

export interface RefundValidationResult {
  valid: boolean;
  totalAmount: number;
  validCount: number;
  invalidCount: number;
  errors: { row: number; reason: string; bookingId?: string }[];
  validatedData: RefundBooking[];
}

export interface RefundExecutionResult {
  success: boolean;
  message: string;
  batchId?: string;
  totalProcessed?: number;
  successful?: number;
  failed?: number;
}

export interface ExportBookingRow {
  bookingId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  tickets: number;
  paymentMethod: string;
  status: string;
}
