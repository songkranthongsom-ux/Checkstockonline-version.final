import React from 'react';
import { cn } from '../../lib/utils';
import { RequestStatus } from '../../types';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
          {
            'bg-gray-100 text-gray-600': variant === 'default',
            'bg-primary/10 text-primary': variant === 'primary',
            'bg-success/10 text-success': variant === 'success',
            'bg-warning/10 text-warning': variant === 'warning',
            'bg-error/10 text-error': variant === 'error',
            'border border-border text-text-secondary': variant === 'outline',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export function StatusBadge({ status, labelOverride }: { status: RequestStatus | 'COMPLETED' | 'PENDING', labelOverride?: string }) {
  const map: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    PENDING: { label: 'รออนุมัติ', variant: 'warning' },
    APPROVED: { label: 'อนุมัติแล้ว', variant: 'primary' },
    READY: { label: 'เตรียมแจกจ่าย', variant: 'primary' },
    COLLECTED: { label: 'รับของแล้ว', variant: 'success' },
    STOCKED: { label: 'เก็บเข้าคลังแผนก', variant: 'success' },
    COMPLETED: { label: 'เสร็จสิ้น', variant: 'success' },
    REJECTED: { label: 'ปฏิเสธ', variant: 'error' },
    CANCELLED: { label: 'ยกเลิก', variant: 'default' },
  };

  const config = map[status];
  const finalLabel = labelOverride || config.label;
  
  if (status === 'APPROVED') {
    return (
      <Badge className="bg-primary/10 text-primary">
        {finalLabel}
      </Badge>
    );
  }

  return (
    <Badge variant={config.variant}>
      {finalLabel}
    </Badge>
  );
}
