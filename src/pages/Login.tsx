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
  const [mounted, setMounted] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

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
      if (await login(employeeId, pa  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url('/bg-full.jpg')" }}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-0"></div>
      
      {/* Animated Card Container */}
      <div 
        className={`w-full max-w-md bg-surface/95 border border-white/50 rounded-[24px] p-8 shadow-2xl shadow-primary/10 backdrop-blur-md z-10 relative transition-all duration-700 ease-out transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30 transform transition-transform hover:scale-105 duration-300">R</div>
        </div>

        {/* Pill Toggle Switch */}
        <div className="flex p-1 bg-neutral/10 rounded-full mb-8 relative">
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-sm transition-all duration-300 ease-in-out"
            style={{ left: isRegistering ? 'calc(50% + 2px)' : '4px' }}
          ></div>
          <button
            type="button"
            onClick={() => { setIsRegistering(false); setError(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-full z-10 transition-colors duration-300 ${!isRegistering ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            type="button"
            onClick={() => { setIsRegistering(true); setError(false); }}
            className={`flex-1 py-2 text-sm font-medium rounded-full z-10 transition-colors duration-300 ${isRegistering ? 'text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            ลงทะเบียน
          </button>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2 transition-all duration-300">
            {isRegistering ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับมา'}
          </h1>
          <p className="text-sm text-text-secondary">ระบบเบิกอุปกรณ์สำนักงาน</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {/* Smooth Expand for Register Fields (Name) */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isRegistering ? 'max-h-[100px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
              className="transition-shadow duration-300 focus:shadow-[0_0_12px_rgba(var(--color-primary),0.3)]"
              tabIndex={isRegistering ? 0 : -1}
            />
          </div>

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
              className="transition-shadow duration-300 focus:shadow-[0_0_12px_rgba(var(--color-primary),0.3)]"
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
              className="transition-shadow duration-300 focus:shadow-[0_0_12px_rgba(var(--color-primary),0.3)]"
              rightElement={
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text-secondary hover:text-text-primary transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
              autoComplete="new-password"
            />
            
            {/* Smooth Expand for Register Fields (Department) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isRegistering ? 'max-h-[100px] opacity-100 mt-5' : 'max-h-0 opacity-0 mt-0'}`}>
              <label className="block text-sm font-medium text-text-primary mb-2">
                แผนก
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                tabIndex={isRegistering ? 0 : -1}
                className="flex h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-shadow duration-300 focus:shadow-[0_0_12px_rgba(var(--color-primary),0.3)]"
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
            
            {/* Error Message with Fade */}
            <div className={`transition-all duration-300 ease-in-out ${error ? 'max-h-10 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}>
              <p className="text-xs text-error font-medium">{errorMessage}</p>
            </div>
          </div>
          
          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full relative overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)]" 
              size="lg"
            >
              <span className="relative z-10">{isRegistering ? 'ยืนยันลงทะเบียน' : 'เข้าสู่ระบบ'}</span>
              {/* Button Shine Effect */}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
