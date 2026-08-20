import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Eye, EyeOff } from 'lucide-react';

export const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { departments } = useData();
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (departments.length > 0 && !departmentId) {
      setDepartmentId(departments[0].id);
    }
  }, [departments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering) {
      if (!name || !employeeId || !password || !departmentId) {
        setError(true);
        setErrorMessage('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
      }
      const success = await register(employeeId, name, password, departmentId);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(true);
        setErrorMessage('รหัสพนักงานนี้มีในระบบแล้ว');
      }
    } else {
      if (!employeeId.trim() || !password) {
        setError(true);
        setErrorMessage('กรุณากรอกรหัสพนักงานและรหัสผ่าน');
        return;
      }
      if (await login(employeeId, password)) {
        navigate('/dashboard');
      } else {
        setError(true);
        setErrorMessage('รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง');
      }
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/bg-full.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0"></div>
      <div className="w-full max-w-md bg-surface/90 border border-white/40 rounded-3xl p-8 shadow-2xl shadow-black/20 backdrop-blur-md z-10 relative">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/25">R</div>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            {isRegistering ? 'ลงทะเบียนใหม่' : 'เข้าสู่ระบบ'}
          </h1>
          <p className="text-sm text-text-secondary">ระบบเบิกอุปกรณ์สำนักงาน</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                ชื่อ-นามสกุล
              </label>
              <Input 
                type="text" 
                placeholder="ชื่อ-นามสกุล" 
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(false);
                }}
                error={error && !name}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              รหัสพนักงาน
            </label>
            <Input 
              type="text" 
              placeholder="เช่น 7000XXXX" 
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                setError(false);
              }}
              error={error && !employeeId}
              autoComplete="off"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              รหัสผ่าน
            </label>
            <Input 
              type={showPassword ? "text" : "password"} 
              placeholder="รหัสผ่าน" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              error={error && !password}
              rightElement={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text-secondary hover:text-text-primary">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              autoComplete="new-password"
            />
            {isRegistering && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  แผนก
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="" disabled>-- โปรดเลือกแผนก --</option>
                  {departments.length === 0 && (
                    <option value="" disabled>กำลังโหลดข้อมูลแผนก หรือ ยังไม่มีแผนกในระบบ</option>
                  )}
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {error && (
              <p className="mt-2 text-xs text-error">{errorMessage}</p>
            )}
          </div>
          
          <Button type="submit" className="w-full" size="md">
            {isRegistering ? 'ยืนยันลงทะเบียน' : 'เข้าสู่ระบบ'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError(false);
            }}
            className="text-sm text-primary hover:underline"
          >
            {isRegistering ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? ลงทะเบียนใหม่'}
          </button>
        </div>
      </div>
    </div>
  );
};
