import { cn } from '@/lib/utils';
import type { AssetStatus, BorrowStatus, MaintenanceStatus, InventoryStatus, InventoryItemStatus } from '@/types';
import {
  AssetStatusMap,
  BorrowStatusMap,
  MaintenanceStatusMap,
  InventoryStatusMap,
  InventoryItemStatusMap,
} from '@/types';

const statusStyles: Record<string, string> = {
  idle: 'bg-slate-100 text-slate-700',
  in_use: 'bg-green-100 text-green-700',
  borrowed: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  scrapped: 'bg-red-100 text-red-700',
  active: 'bg-green-100 text-green-700',
  returned: 'bg-slate-100 text-slate-700',
  overdue: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  repairing: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-700',
  ongoing: 'bg-blue-100 text-blue-700',
  normal: 'bg-green-100 text-green-700',
  surplus: 'bg-purple-100 text-purple-700',
  deficit: 'bg-red-100 text-red-700',
  unchecked: 'bg-slate-100 text-slate-500',
};

interface StatusTagProps {
  status: AssetStatus | BorrowStatus | MaintenanceStatus | InventoryStatus | InventoryItemStatus;
  type?: 'asset' | 'borrow' | 'maintenance' | 'inventory' | 'inventoryItem';
  size?: 'sm' | 'md';
}

export function StatusTag({ status, type = 'asset', size = 'md' }: StatusTagProps) {
  let label = '';
  switch (type) {
    case 'asset':
      label = AssetStatusMap[status as AssetStatus];
      break;
    case 'borrow':
      label = BorrowStatusMap[status as BorrowStatus];
      break;
    case 'maintenance':
      label = MaintenanceStatusMap[status as MaintenanceStatus];
      break;
    case 'inventory':
      label = InventoryStatusMap[status as InventoryStatus];
      break;
    case 'inventoryItem':
      label = InventoryItemStatusMap[status as InventoryItemStatus];
      break;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        statusStyles[status] || 'bg-slate-100 text-slate-700',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'idle' || status === 'returned' || status === 'cancelled' || status === 'unchecked'
            ? 'bg-slate-400'
            : status === 'in_use' || status === 'active' || status === 'completed' || status === 'normal'
            ? 'bg-green-500'
            : status === 'borrowed' || status === 'repairing' || status === 'ongoing'
            ? 'bg-blue-500'
            : status === 'maintenance' || status === 'pending'
            ? 'bg-amber-500'
            : status === 'surplus'
            ? 'bg-purple-500'
            : 'bg-red-500'
        )}
      />
      {label}
    </span>
  );
}

export default StatusTag;
