import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BorrowRecord, BorrowType, BorrowStatus } from '@/types';
import { mockBorrowRecords } from '@/data/mockData';
import { generateId, formatDate, isOverdue } from '@/utils';
import { useAssetStore } from './assetStore';

interface BorrowState {
  records: BorrowRecord[];
  activeTab: 'receive' | 'return' | 'borrow' | 'transfer';
  setActiveTab: (tab: 'receive' | 'return' | 'borrow' | 'transfer') => void;
  getRecordsByType: (type: BorrowType) => BorrowRecord[];
  getActiveBorrows: () => BorrowRecord[];
  getUnreturnedRecords: () => BorrowRecord[];
  getOverdueRecords: () => BorrowRecord[];
  addBorrowRecord: (record: Omit<BorrowRecord, 'id' | 'status' | 'operator'>) => void;
  returnAsset: (recordId: string, remark?: string) => void;
  transferAsset: (record: Omit<BorrowRecord, 'id' | 'status' | 'operator' | 'type'>) => void;
}

export const useBorrowStore = create<BorrowState>()(
  persist(
    (set, get) => ({
      records: mockBorrowRecords,
      activeTab: 'receive',
      setActiveTab: (tab) => set({ activeTab: tab }),
      getRecordsByType: (type) => {
        return get().records.filter((r) => r.type === type).sort((a, b) => 
          new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime()
        );
      },
      getActiveBorrows: () => {
        return get().records.filter((r) => r.status === 'active');
      },
      getUnreturnedRecords: () => {
        return get().records.filter(
          (r) => r.status === 'active' || r.status === 'overdue'
        );
      },
      getOverdueRecords: () => {
        return get().records.filter(
          (r) => r.status === 'active' && isOverdue(r.expectedReturnDate)
        );
      },
      addBorrowRecord: (recordData) => {
        const record: BorrowRecord = {
          ...recordData,
          id: generateId('B'),
          status: 'active',
          operator: '管理员',
        };
        set((state) => ({ records: [record, ...state.records] }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        updateAsset(recordData.assetId, {
          status: recordData.type === 'borrow' ? 'borrowed' : 'in_use',
        });
        addOperationLog(
          recordData.assetId,
          recordData.type,
          `${recordData.employeeName}${recordData.type === 'receive' ? '领用' : recordData.type === 'borrow' ? '借用' : '转移'}`,
          '管理员'
        );
      },
      returnAsset: (recordId, remark = '') => {
        const record = get().records.find((r) => r.id === recordId);
        if (!record) return;
        
        set((state) => ({
          records: state.records.map((r) =>
            r.id === recordId
              ? { ...r, status: 'returned' as BorrowStatus, actualReturnDate: formatDate(new Date()), remark: remark || r.remark }
              : r
          ),
        }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        updateAsset(record.assetId, { status: 'idle' });
        addOperationLog(record.assetId, 'return', `${record.employeeName}归还`, '管理员');
      },
      transferAsset: (recordData) => {
        const record: BorrowRecord = {
          ...recordData,
          type: 'transfer',
          id: generateId('B'),
          status: 'active',
          operator: '管理员',
        };
        set((state) => ({ records: [record, ...state.records] }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        updateAsset(recordData.assetId, {
          responsiblePerson: recordData.employeeName,
          department: recordData.department,
        });
        addOperationLog(
          recordData.assetId,
          'transfer',
          `转移给${recordData.employeeName}（${recordData.department}）`,
          '管理员'
        );
      },
    }),
    {
      name: 'borrow-store',
    }
  )
);
