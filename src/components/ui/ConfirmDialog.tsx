import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-error">
            <Trash2 size={32} />
          </div>
          
          <h2 className="mb-2 text-2xl font-extrabold text-text-primary">{title}</h2>
          <p className="mb-6 text-sm text-text-secondary">
            {description}
          </p>
          
          <div className="flex w-full flex-col gap-3">
            <Button 
              className={isDestructive ? 'bg-error hover:bg-error/90 w-full text-base py-5' : 'w-full text-base py-5'} 
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
            <Button 
              variant="secondary" 
              className="w-full text-base py-5 bg-surface-alt/70 hover:bg-border/50 text-text-secondary font-semibold border-none"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
