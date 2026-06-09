import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MaintenanceOrder, MaintenancePlan, MaintenanceStatus, MaintenanceType } from '@/types';
import { mockMaintenanceOrders, mockMaintenancePlans } from '@/data/mockData';
import { generateId, formatDate, daysUntil } from '@/utils';
import { useAssetStore } from './assetStore';

interface MaintenanceState {
  orders: MaintenanceOrder[];
  plans: MaintenancePlan[];
  activeTab: 'orders' | 'plans';
  setActiveTab: (tab: 'orders' | 'plans') => void;
  getOrdersByStatus: (status: MaintenanceStatus) => MaintenanceOrder[];
  getUpcomingMaintenance: (days?: number) => MaintenancePlan[];
  addOrder: (order: Omit<MaintenanceOrder, 'id' | 'createDate' | 'status'>) => void;
  updateOrderStatus: (id: string, status: MaintenanceStatus, cost?: number) => void;
  addPlan: (plan: Omit<MaintenancePlan, 'id' | 'status'>) => void;
  togglePlanStatus: (id: string) => void;
  executePlan: (planId: string) => void;
  getMonthlyCost: () => number;
}

export const useMaintenanceStore = create<MaintenanceState>()(
  persist(
    (set, get) => ({
      orders: mockMaintenanceOrders,
      plans: mockMaintenancePlans,
      activeTab: 'orders',
      setActiveTab: (tab) => set({ activeTab: tab }),
      getOrdersByStatus: (status) => {
        return get().orders
          .filter((o) => o.status === status)
          .sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime());
      },
      getUpcomingMaintenance: (days = 7) => {
        return get().plans.filter(
          (p) => p.status === 'active' && daysUntil(p.nextDate) <= days && daysUntil(p.nextDate) >= 0
        );
      },
      addOrder: (orderData) => {
        const order: MaintenanceOrder = {
          ...orderData,
          id: generateId('M'),
          createDate: formatDate(new Date()),
          status: 'pending',
        };
        set((state) => ({ orders: [order, ...state.orders] }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        updateAsset(orderData.assetId, { status: 'maintenance' });
        addOperationLog(orderData.assetId, 'maintenance', `维修单创建：${orderData.title}`, '管理员');
      },
      updateOrderStatus: (id, status, cost) => {
        const order = get().orders.find((o) => o.id === id);
        if (!order) return;
        
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status,
                  cost: cost ?? o.cost,
                  finishDate: status === 'completed' || status === 'cancelled' ? formatDate(new Date()) : undefined,
                }
              : o
          ),
        }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        if (status === 'completed' || status === 'cancelled') {
          updateAsset(order.assetId, { status: 'idle' });
        }
        addOperationLog(order.assetId, 'maintenance', 
          `维修单状态更新为：${status === 'pending' ? '待处理' : status === 'repairing' ? '维修中' : status === 'completed' ? '已完成' : '已取消'}`,
          '管理员'
        );
      },
      addPlan: (planData) => {
        const plan: MaintenancePlan = {
          ...planData,
          id: generateId('P'),
          status: 'active',
        };
        set((state) => ({ plans: [...state.plans, plan] }));
      },
      togglePlanStatus: (id) => {
        set((state) => ({
          plans: state.plans.map((p) =>
            p.id === id ? { ...p, status: p.status === 'active' ? 'paused' : 'active' } : p
          ),
        }));
      },
      executePlan: (planId) => {
        const plan = get().plans.find((p) => p.id === planId);
        if (!plan) return;
        
        const order: MaintenanceOrder = {
          id: generateId('M'),
          assetId: plan.assetId,
          assetName: plan.assetName,
          assetCode: '',
          type: plan.type,
          title: `定期保养 - ${plan.name}`,
          description: `根据保养计划执行：${plan.name}`,
          createDate: formatDate(new Date()),
          cost: 0,
          status: 'pending',
          handler: '',
          remark: '计划内保养',
        };
        
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + plan.cycleDays);
        
        set((state) => ({
          orders: [order, ...state.orders],
          plans: state.plans.map((p) =>
            p.id === planId
              ? {
                  ...p,
                  lastDate: formatDate(new Date()),
                  nextDate: formatDate(nextDate),
                }
              : p
          ),
        }));
        
        const { updateAsset, addOperationLog } = useAssetStore.getState();
        updateAsset(plan.assetId, { status: 'maintenance' });
        addOperationLog(plan.assetId, 'maintenance', `执行保养计划：${plan.name}`, '管理员');
      },
      getMonthlyCost: () => {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return get()
          .orders.filter((o) => {
            if (o.status !== 'completed' || !o.finishDate) return false;
            return new Date(o.finishDate) >= monthStart;
          })
          .reduce((sum, o) => sum + o.cost, 0);
      },
    }),
    {
      name: 'maintenance-store',
    }
  )
);
