import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InventoryTask, InventoryItem, InventoryStatus, InventoryItemStatus } from '@/types';
import { mockInventoryTasks, mockInventoryItems } from '@/data/mockData';
import { generateId, formatDate, formatDateTime } from '@/utils';
import { useAssetStore } from './assetStore';

interface InventoryState {
  tasks: InventoryTask[];
  items: InventoryItem[];
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  getTasksByStatus: (status: InventoryStatus) => InventoryTask[];
  getTaskItems: (taskId: string) => InventoryItem[];
  getTaskItemsByStatus: (taskId: string, status: InventoryItemStatus) => InventoryItem[];
  createTask: (task: Omit<InventoryTask, 'id' | 'createDate' | 'status' | 'totalCount' | 'checkedCount' | 'surplusCount' | 'deficitCount'>) => void;
  startTask: (taskId: string) => void;
  completeTask: (taskId: string) => void;
  updateItemStatus: (itemId: string, status: InventoryItemStatus, remark?: string) => void;
  batchUpdateItems: (taskId: string, status: InventoryItemStatus) => void;
  importInventory: (taskId: string, assets: { code: string; name: string }[]) => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      tasks: mockInventoryTasks,
      items: mockInventoryItems,
      activeTaskId: 'INV001',
      setActiveTaskId: (id) => set({ activeTaskId: id }),
      getTasksByStatus: (status) => {
        return get()
          .tasks.filter((t) => t.status === status)
          .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());
      },
      getTaskItems: (taskId) => {
        return get().items.filter((i) => i.taskId === taskId);
      },
      getTaskItemsByStatus: (taskId, status) => {
        return get().items.filter((i) => i.taskId === taskId && i.status === status);
      },
      createTask: (taskData) => {
        const task: InventoryTask = {
          ...taskData,
          id: generateId('INV'),
          createDate: formatDate(new Date()),
          status: 'pending',
          totalCount: 0,
          checkedCount: 0,
          surplusCount: 0,
          deficitCount: 0,
        };
        set((state) => ({ tasks: [task, ...state.tasks] }));
      },
      startTask: (taskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;
        
        const { assets } = useAssetStore.getState();
        const newItems: InventoryItem[] = assets
          .filter((a) => {
            if (task.range === '全公司') return true;
            return a.department === task.range || a.location.includes(task.range);
          })
          .map((asset) => ({
            id: generateId('II'),
            taskId,
            assetId: asset.id,
            assetCode: asset.code,
            assetName: asset.name,
            location: asset.location,
            responsiblePerson: asset.responsiblePerson,
            status: 'unchecked' as InventoryItemStatus,
            remark: '',
          }));
        
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, status: 'ongoing' as InventoryStatus, totalCount: newItems.length }
              : t
          ),
          items: [...newItems, ...state.items],
        }));
      },
      completeTask: (taskId) => {
        const items = get().getTaskItems(taskId);
        const checkedCount = items.filter((i) => i.status !== 'unchecked').length;
        const surplusCount = items.filter((i) => i.status === 'surplus').length;
        const deficitCount = items.filter((i) => i.status === 'deficit').length;
        
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: 'completed' as InventoryStatus,
                  checkedCount,
                  surplusCount,
                  deficitCount,
                }
              : t
          ),
        }));
      },
      updateItemStatus: (itemId, status, remark) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return;
        
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId
              ? {
                  ...i,
                  status,
                  remark: remark ?? i.remark,
                  checkTime: status !== 'unchecked' ? formatDateTime(new Date()) : undefined,
                }
              : i
          ),
        }));
        
        const task = get().tasks.find((t) => t.id === item.taskId);
        if (task) {
          const taskItems = get().getTaskItems(task.id);
          const checkedCount = taskItems.filter((i) => i.status !== 'unchecked').length;
          const surplusCount = taskItems.filter((i) => i.status === 'surplus').length;
          const deficitCount = taskItems.filter((i) => i.status === 'deficit').length;
          
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === task.id
                ? { ...t, checkedCount, surplusCount, deficitCount }
                : t
            ),
          }));
        }
      },
      batchUpdateItems: (taskId, status) => {
        const items = get().getTaskItems(taskId);
        const now = formatDateTime(new Date());
        
        set((state) => ({
          items: state.items.map((i) =>
            i.taskId === taskId
              ? {
                  ...i,
                  status,
                  checkTime: status !== 'unchecked' ? now : undefined,
                }
              : i
          ),
        }));
        
        const task = get().tasks.find((t) => t.id === taskId);
        if (task) {
          const taskItems = get().getTaskItems(taskId);
          const checkedCount = taskItems.filter((i) => i.status !== 'unchecked').length;
          const surplusCount = taskItems.filter((i) => i.status === 'surplus').length;
          const deficitCount = taskItems.filter((i) => i.status === 'deficit').length;
          
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? { ...t, checkedCount, surplusCount, deficitCount }
                : t
            ),
          }));
        }
      },
      importInventory: (taskId, assets) => {
        const newItems: InventoryItem[] = assets.map((asset) => ({
          id: generateId('II'),
          taskId,
          assetId: generateId('A'),
          assetCode: asset.code,
          assetName: asset.name,
          location: '',
          responsiblePerson: '',
          status: 'unchecked' as InventoryItemStatus,
          remark: '',
        }));
        
        set((state) => ({
          items: [...newItems, ...state.items],
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, totalCount: t.totalCount + newItems.length } : t
          ),
        }));
      },
    }),
    {
      name: 'inventory-store',
    }
  )
);
