import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Asset,
  OperationLog,
  StatsOverview,
  AssetCategory,
  AssetStatus,
} from '@/types';
import { mockAssets, mockOperationLogs } from '@/data/mockData';
import { generateId, generateAssetCode, calculateDepreciation, formatDateTime } from '@/utils';

interface AssetState {
  assets: Asset[];
  operationLogs: OperationLog[];
  filters: {
    category?: AssetCategory;
    status?: AssetStatus;
    location?: string;
    responsiblePerson?: string;
    keyword?: string;
  };
  setFilters: (filters: Partial<AssetState['filters']>) => void;
  getFilteredAssets: () => Asset[];
  addAsset: (asset: Omit<Asset, 'id' | 'code' | 'currentValue'>) => void;
  updateAsset: (id: string, data: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  getAssetById: (id: string) => Asset | undefined;
  addOperationLog: (assetId: string, type: string, content: string, operator: string) => void;
  getAssetLogs: (assetId: string) => OperationLog[];
  getStatsOverview: () => StatsOverview;
  getAssetsByCategory: () => Record<string, { count: number; value: number }>;
  getAssetsByDepartment: () => Record<string, { count: number; value: number }>;
  getDepreciationStats: () => { totalOriginal: number; totalCurrent: number; totalDepreciation: number };
  getIdleRate: () => number;
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: mockAssets,
      operationLogs: mockOperationLogs,
      filters: {},
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      getFilteredAssets: () => {
        const { assets, filters } = get();
        return assets.filter((asset) => {
          if (filters.category && asset.category !== filters.category) return false;
          if (filters.status && asset.status !== filters.status) return false;
          if (filters.location && !asset.location.includes(filters.location)) return false;
          if (filters.responsiblePerson && !asset.responsiblePerson.includes(filters.responsiblePerson)) return false;
          if (filters.keyword) {
            const keyword = filters.keyword.toLowerCase();
            return (
              asset.name.toLowerCase().includes(keyword) ||
              asset.code.toLowerCase().includes(keyword) ||
              asset.brand.toLowerCase().includes(keyword) ||
              asset.model.toLowerCase().includes(keyword)
            );
          }
          return true;
        });
      },
      addAsset: (assetData) => {
        const { currentValue } = calculateDepreciation(
          assetData.purchasePrice,
          assetData.purchaseDate,
          assetData.depreciationYears
        );
        const newAsset: Asset = {
          ...assetData,
          id: generateId('A'),
          code: generateAssetCode(),
          currentValue,
        };
        set((state) => ({ assets: [newAsset, ...state.assets] }));
        get().addOperationLog(newAsset.id, 'create', '新增资产卡片', '管理员');
      },
      updateAsset: (id, data) => {
        set((state) => ({
          assets: state.assets.map((asset) => {
            if (asset.id === id) {
              let newCurrentValue = asset.currentValue;
              if (data.purchasePrice || data.purchaseDate || data.depreciationYears) {
                const price = data.purchasePrice ?? asset.purchasePrice;
                const date = data.purchaseDate ?? asset.purchaseDate;
                const years = data.depreciationYears ?? asset.depreciationYears;
                newCurrentValue = calculateDepreciation(price, date, years).currentValue;
              }
              return { ...asset, ...data, currentValue: newCurrentValue };
            }
            return asset;
          }),
        }));
        get().addOperationLog(id, 'update', '更新资产信息', '管理员');
      },
      deleteAsset: (id) => {
        set((state) => ({
          assets: state.assets.filter((asset) => asset.id !== id),
        }));
      },
      getAssetById: (id) => {
        return get().assets.find((asset) => asset.id === id);
      },
      addOperationLog: (assetId, type, content, operator) => {
        const log: OperationLog = {
          id: generateId('L'),
          assetId,
          type,
          content,
          operator,
          createTime: formatDateTime(new Date()),
        };
        set((state) => ({
          operationLogs: [log, ...state.operationLogs],
        }));
      },
      getAssetLogs: (assetId) => {
        return get().operationLogs.filter((log) => log.assetId === assetId);
      },
      getStatsOverview: () => {
        const { assets } = get();
        const totalAssets = assets.length;
        const totalValue = assets.reduce((sum, a) => sum + a.currentValue, 0);
        const idleAssets = assets.filter((a) => a.status === 'idle').length;
        const inUseAssets = assets.filter((a) => a.status === 'in_use').length;
        const maintenanceAssets = assets.filter((a) => a.status === 'maintenance').length;
        const idleRate = totalAssets > 0 ? Math.round((idleAssets / totalAssets) * 10000) / 100 : 0;
        return {
          totalAssets,
          totalValue,
          idleAssets,
          inUseAssets,
          maintenanceAssets,
          idleRate,
          monthlyMaintenanceCost: 1250,
          upcomingMaintenance: 2,
        };
      },
      getAssetsByCategory: () => {
        const { assets } = get();
        const result: Record<string, { count: number; value: number }> = {};
        assets.forEach((asset) => {
          if (!result[asset.category]) {
            result[asset.category] = { count: 0, value: 0 };
          }
          result[asset.category].count++;
          result[asset.category].value += asset.currentValue;
        });
        return result;
      },
      getAssetsByDepartment: () => {
        const { assets } = get();
        const result: Record<string, { count: number; value: number }> = {};
        assets.forEach((asset) => {
          if (!result[asset.department]) {
            result[asset.department] = { count: 0, value: 0 };
          }
          result[asset.department].count++;
          result[asset.department].value += asset.currentValue;
        });
        return result;
      },
      getDepreciationStats: () => {
        const { assets } = get();
        const totalOriginal = assets.reduce((sum, a) => sum + a.purchasePrice, 0);
        const totalCurrent = assets.reduce((sum, a) => sum + a.currentValue, 0);
        const totalDepreciation = totalOriginal - totalCurrent;
        return { totalOriginal, totalCurrent, totalDepreciation };
      },
      getIdleRate: () => {
        const { assets } = get();
        if (assets.length === 0) return 0;
        const idleCount = assets.filter((a) => a.status === 'idle').length;
        return Math.round((idleCount / assets.length) * 10000) / 100;
      },
    }),
    {
      name: 'asset-store',
    }
  )
);
