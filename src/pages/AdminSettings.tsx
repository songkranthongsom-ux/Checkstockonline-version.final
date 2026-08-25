import React, { useState, useEffect } from 'react';
import { useData } from '../store/DataContext';
import { Save, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export const AdminSettings: React.FC = () => {
  const { settings, updateSetting } = useData();
  const [notificationEmail, setNotificationEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (settings) {
      const emailSetting = settings.find(s => s.key === 'NOTIFICATION_EMAIL');
      if (emailSetting && emailSetting.value) {
        setNotificationEmail(emailSetting.value);
      }
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage({ type: '', text: '' });

    try {
      await updateSetting('NOTIFICATION_EMAIL', notificationEmail);
      setSaveMessage({ type: 'success', text: 'บันทึกการตั้งค่าสำเร็จ' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          ตั้งค่าระบบ
        </h1>
        <p className="text-gray-500 mt-1">จัดการการตั้งค่าต่างๆ ของระบบ Checkstockonline</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-800">การแจ้งเตือนทางอีเมล</h2>
          <p className="text-sm text-gray-500 mt-1">ตั้งค่าอีเมลที่ต้องการรับแจ้งเตือนเมื่อมีการขอเบิกอุปกรณ์ใหม่</p>
        </div>

        <form onSubmit={handleSave} className="p-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="notificationEmail" className="block text-sm font-medium text-gray-700 mb-1">
                อีเมลผู้รับการแจ้งเตือน (Notification Email)
              </label>
              <input
                type="text"
                id="notificationEmail"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="เช่น admin@example.com, manager@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">
                * สามารถใส่ได้หลายอีเมล โดยคั่นด้วยลูกน้ำ (,) <br/>
                * หากปล่อยว่างไว้ ระบบจะใช้ค่าเริ่มต้นจากเซิร์ฟเวอร์ (Vercel)
              </p>
            </div>
          </div>

          {saveMessage.text && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className={`mt-4 p-3 rounded-lg text-sm ${
                saveMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {saveMessage.text}
            </motion.div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
