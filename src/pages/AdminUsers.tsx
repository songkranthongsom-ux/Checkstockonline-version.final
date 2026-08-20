import React, { useState } from 'react';
import { KeyRound, Plus, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Role } from '../types';

const blankUser = () => ({ employeeId: '', name: '', departmentId: '', password: '1234', role: ['USER'] as Role[] });

export const AdminUsers = () => {
  const { user } = useAuth();
  const { users, departments, addUser, deleteUser, updateUser } = useData();
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, departmentId: string, role: Role[]}>({ name: '', departmentId: '', role: [] });
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string, name: string} | null>(null);
  const [newUser, setNewUser] = useState(blankUser);
  const [formError, setFormError] = useState('');
  
  if (!user || !user.role.includes('ADMIN')) return null;
  
  const toggleRole = (role: Role) => setEditForm(current => ({...current, role: current.role.includes(role) ? current.role.filter(item => item !== role) : [...current.role, role]}));
  const toggleNewUserRole = (role: Role) => setNewUser(current => ({ ...current, role: current.role.includes(role) ? current.role.filter(item => item !== role) : [...current.role, role] }));
  
  const saveUser = async () => { if (!newUser.employeeId.trim() || !newUser.name.trim() || !newUser.departmentId) return setFormError('กรุณากรอกข้อมูลให้ครบถ้วน'); const created = await addUser({ ...newUser, mustChangePassword: true, password: '1234' }); if (created) { setIsCreating(false); setNewUser(blankUser()); setFormError(''); } else setFormError('ไม่สามารถเพิ่มผู้ใช้ได้ หรือรหัสพนักงานนี้มีอยู่แล้ว'); };
  const confirmRemoveUser = async () => { if (userToDelete) { await deleteUser(userToDelete.id); setUserToDelete(null); } };
  const resetPassword = async (id: string, name: string) => { if (!window.confirm(`ต้องการรีเซ็ตรหัสผ่านของ “${name}” ให้กลับเป็น '1234' ใช่หรือไม่?`)) return; await updateUser(id, { password: '1234', mustChangePassword: true }); alert('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว'); };

  const saveEdit = async (id: string) => {
    if (!editForm.name.trim() || !editForm.departmentId) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    await updateUser(id, { name: editForm.name, departmentId: editForm.departmentId, role: editForm.role });
    setEditingUserId(null);
  };

  return <div className="space-y-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-sm font-semibold text-primary">Access management</p><h1 className="text-3xl font-bold">จัดการผู้ใช้</h1><p className="mt-2 text-text-secondary">เพิ่มบัญชี และกำหนดสิทธิ์การใช้งาน (รหัสผ่านเริ่มต้นคือ 1234)</p></div><Button onClick={() => { setIsCreating(true); setNewUser({ ...blankUser(), departmentId: departments[0]?.id || '' }); }}><UserPlus size={18} className="mr-2" />เพิ่มผู้ใช้ใหม่</Button></div>
    {isCreating && <Card className="border-primary/30 p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><h2 className="font-bold">เพิ่มผู้ใช้ใหม่</h2><Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>ปิด</Button></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"><Field label="รหัสพนักงาน"><Input value={newUser.employeeId} onChange={event => setNewUser({ ...newUser, employeeId: event.target.value })} placeholder="เช่น 7000XXXX" /></Field><Field label="ชื่อ-นามสกุล"><Input value={newUser.name} onChange={event => setNewUser({ ...newUser, name: event.target.value })} placeholder="ชื่อผู้ใช้งาน" /></Field><Field label="แผนก"><select className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={newUser.departmentId} onChange={event => setNewUser({ ...newUser, departmentId: event.target.value })}><option value="">เลือกแผนก</option>{departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field><Field label="สิทธิ์ผู้ใช้งาน"><div className="flex flex-wrap gap-3 mt-2">{(['USER', 'ADMIN'] as Role[]).map(role => <label key={role} className="flex items-center gap-1.5"><input type="checkbox" checked={newUser.role.includes(role)} onChange={() => toggleNewUserRole(role)} />{role}</label>)}</div></Field></div><p className="mt-3 text-sm text-text-secondary">รหัสผ่านเริ่มต้นคือ <strong>1234</strong> (ผู้ใช้จะต้องตั้งรหัสผ่านใหม่เมื่อเข้าสู่ระบบครั้งแรก)</p>{formError && <p className="mt-2 text-sm text-error">{formError}</p>}<div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setIsCreating(false)}>ยกเลิก</Button><Button onClick={saveUser}><Plus size={16} className="mr-1" />บันทึกผู้ใช้</Button></div></Card>}
    <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border bg-surface-alt"><tr><th className="px-6 py-4">รหัสพนักงาน</th><th className="px-6 py-4">ชื่อ-สกุล</th><th className="px-6 py-4">แผนก</th><th className="px-6 py-4">สิทธิ์</th><th className="px-6 py-4 text-right">จัดการ</th></tr></thead><tbody className="divide-y divide-border">{users.map(currentUser => { const department = departments.find(item => item.id === currentUser.departmentId); const isEditing = editingUserId === currentUser.id; return <tr key={currentUser.id}><td className="px-6 py-4 font-mono text-text-secondary">{currentUser.employeeId}</td><td className="px-6 py-4 font-semibold">{isEditing ? <Input value={editForm.name} onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))} className="h-9 text-sm font-semibold" /> : currentUser.name}</td><td className="px-6 py-4 text-text-secondary">{isEditing ? <select className="flex h-9 w-full rounded-xl border border-border bg-surface px-3 py-1 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" value={editForm.departmentId} onChange={e => setEditForm(prev => ({...prev, departmentId: e.target.value}))}><option value="">เลือกแผนก</option>{departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}</select> : (department?.name || '-')}</td><td className="px-6 py-4">{isEditing ? <div className="flex flex-wrap gap-3">{(['USER', 'ADMIN'] as Role[]).map(role => <label key={role} className="flex items-center gap-1.5"><input type="checkbox" checked={editForm.role.includes(role)} onChange={() => toggleRole(role)} disabled={role === 'ADMIN' && currentUser.id === user.id} />{role}</label>)}</div> : <div className="flex flex-wrap gap-1">{currentUser.role.map(role => <Badge key={role} variant={role === 'ADMIN' ? 'error' : 'default'}>{role}</Badge>)}</div>}</td><td className="px-6 py-4 text-right">{isEditing ? <div className="flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setEditingUserId(null)}>ยกเลิก</Button><Button size="sm" onClick={() => saveEdit(currentUser.id)}>บันทึก</Button></div> : <div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => resetPassword(currentUser.id, currentUser.name)}>รีเซ็ตรหัส</Button><Button variant="outline" size="sm" onClick={() => { setEditingUserId(currentUser.id); setEditForm({ name: currentUser.name, departmentId: currentUser.departmentId, role: currentUser.role }); }}>แก้ไข</Button><Button aria-label="ลบผู้ใช้" variant="ghost" size="sm" disabled={currentUser.id === user.id} className="text-error hover:bg-error/10 hover:text-error" onClick={() => setUserToDelete({id: currentUser.id, name: currentUser.name})}><Trash2 size={16} /></Button></div>}</td></tr>; })}</tbody></table></div></Card>
    
    <ConfirmDialog 
      isOpen={!!userToDelete} 
      title="Delete Account" 
      description={`Are you sure you want to delete ${userToDelete?.name}?`} 
      onConfirm={confirmRemoveUser} 
      onCancel={() => setUserToDelete(null)} 
    />
    </div>;
};
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label><span className="mb-2 block text-sm font-semibold">{label}</span>{children}</label>;

