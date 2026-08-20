export type Role = 'USER' | 'ADMIN';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'READY' | 'COLLECTED' | 'STOCKED' | 'REJECTED' | 'CANCELLED';
export type BatchStatus = 'PENDING' | 'COMPLETED';
export type ItemCategory = string;

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: Role[];
  departmentId: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface Department {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  unit: string;
  defaultStock?: number;
  currentStock?: number;
  price?: number;
  imageUrl?: string;
  remark?: string;
}

export interface RequisitionRequest {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  batchId?: string;
  ticketId?: string;
  rejectReason?: string;
}

export interface ConsolidatedBatch {
  id: string;
  departmentId: string;
  coordinatorId: string;
  status: BatchStatus;
  createdAt: string;
  completedAt?: string;
  isRestock?: boolean;
}
