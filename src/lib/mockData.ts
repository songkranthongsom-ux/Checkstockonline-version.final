import { Department, Item, User } from '../types';

export const mockDepartments: Department[] = [
  { id: 'd1', name: 'แผนก IT' },
  { id: 'd2', name: 'แผนกบัญชี' },
  { id: 'd3', name: 'แผนกบุคคล' },
];

export const mockUsers: User[] = [
  { id: 'u1', employeeId: 'E001', name: 'สมชาย ไอที (Admin)', role: ['USER', 'ADMIN'], departmentId: 'd1', password: 'password', mustChangePassword: true },
  { id: 'u2', employeeId: 'E002', name: 'สมศรี ไอที (User)', role: ['USER'], departmentId: 'd1', password: 'password', mustChangePassword: true },
  { id: 'u3', employeeId: 'E003', name: 'สมหมาย บัญชี', role: ['USER'], departmentId: 'd2', password: 'password', mustChangePassword: true },
  { id: 'u4', employeeId: 'E004', name: 'สมหญิง บัญชี (User)', role: ['USER'], departmentId: 'd2', password: 'password', mustChangePassword: true },
];

export const mockItems: Item[] = [
  { id: 'i1', name: 'กระดาษ A4', category: 'อุปกรณ์สำนักงาน', unit: 'รีม', defaultStock: 50, currentStock: 50, imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=400&fit=crop' },
  { id: 'i2', name: 'ปากกาลูกลื่น น้ำเงิน', category: 'อุปกรณ์เครื่องเขียน', unit: 'ด้าม', defaultStock: 100, currentStock: 100, imageUrl: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=400&h=400&fit=crop' },
  { id: 'i3', name: 'แฟ้มเอกสาร', category: 'อุปกรณ์สำนักงาน', unit: 'แฟ้ม', defaultStock: 30, currentStock: 30, imageUrl: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&h=400&fit=crop' },
  { id: 'i4', name: 'เมาส์ไร้สาย', category: 'อุปกรณ์ IT', unit: 'อัน', defaultStock: 15, currentStock: 15, imageUrl: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=400&fit=crop' },
  { id: 'i5', name: 'คีย์บอร์ด', category: 'อุปกรณ์ IT', unit: 'อัน', defaultStock: 10, currentStock: 10, imageUrl: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=400&h=400&fit=crop' },
  { id: 'i6', name: 'กระดาษทิชชู่', category: 'อุปกรณ์เบ็ดเตล็ด', unit: 'ม้วน', defaultStock: 100, currentStock: 100, imageUrl: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&h=400&fit=crop' },
];
