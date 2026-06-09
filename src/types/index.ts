export type AssetStatus = 'idle' | 'in_use' | 'borrowed' | 'maintenance' | 'scrapped' | 'pending_disposal' | 'pending_register';
export type AssetCategory = 'office_equipment' | 'tooling' | 'low_value_consumables';
export type BorrowType = 'receive' | 'borrow' | 'transfer' | 'return';
export type BorrowStatus = 'active' | 'returned' | 'overdue';
export type MaintenanceStatus = 'pending' | 'repairing' | 'completed' | 'cancelled';
export type MaintenanceType = 'repair' | 'maintenance';
export type InventoryStatus = 'pending' | 'ongoing' | 'completed';
export type InventoryItemStatus = 'normal' | 'surplus' | 'deficit' | 'unchecked';

export interface Asset {
  id: string;
  code: string;
  name: string;
  category: AssetCategory;
  specification: string;
  brand: string;
  model: string;
  purchasePrice: number;
  purchaseDate: string;
  location: string;
  responsiblePerson: string;
  department: string;
  status: AssetStatus;
  warrantyExpire: string;
  image?: string;
  description: string;
  depreciationYears: number;
  currentValue: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  phone: string;
}

export interface BorrowRecord {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: BorrowType;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: BorrowStatus;
  remark: string;
  operator: string;
}

export interface MaintenanceOrder {
  id: string;
  assetId: string;
  assetName: string;
  assetCode: string;
  type: MaintenanceType;
  title: string;
  description: string;
  createDate: string;
  finishDate?: string;
  cost: number;
  status: MaintenanceStatus;
  handler: string;
  remark: string;
}

export interface MaintenancePlan {
  id: string;
  assetId: string;
  assetName: string;
  type: MaintenanceType;
  name: string;
  cycleDays: number;
  lastDate: string;
  nextDate: string;
  status: 'active' | 'paused';
}

export interface InventoryTask {
  id: string;
  name: string;
  createDate: string;
  planDate: string;
  range: string;
  status: InventoryStatus;
  totalCount: number;
  checkedCount: number;
  surplusCount: number;
  deficitCount: number;
  creator: string;
}

export interface InventoryItem {
  id: string;
  taskId: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  location: string;
  responsiblePerson: string;
  status: InventoryItemStatus;
  remark: string;
  checkTime?: string;
}

export interface OperationLog {
  id: string;
  assetId: string;
  type: string;
  content: string;
  operator: string;
  createTime: string;
}

export interface StatsOverview {
  totalAssets: number;
  totalValue: number;
  idleAssets: number;
  inUseAssets: number;
  maintenanceAssets: number;
  idleRate: number;
  monthlyMaintenanceCost: number;
  upcomingMaintenance: number;
}

export const AssetStatusMap: Record<AssetStatus, string> = {
  idle: '闲置',
  in_use: '使用中',
  borrowed: '已借出',
  maintenance: '维修中',
  scrapped: '已报废',
  pending_disposal: '待处理',
  pending_register: '待建档',
};

export const AssetCategoryMap: Record<AssetCategory, string> = {
  office_equipment: '办公设备',
  tooling: '工装',
  low_value_consumables: '低值易耗品',
};

export const BorrowTypeMap: Record<BorrowType, string> = {
  receive: '领用',
  borrow: '借用',
  transfer: '转移',
  return: '归还',
};

export const BorrowStatusMap: Record<BorrowStatus, string> = {
  active: '使用中',
  returned: '已归还',
  overdue: '已逾期',
};

export const MaintenanceStatusMap: Record<MaintenanceStatus, string> = {
  pending: '待处理',
  repairing: '维修中',
  completed: '已完成',
  cancelled: '已取消',
};

export const InventoryStatusMap: Record<InventoryStatus, string> = {
  pending: '待开始',
  ongoing: '进行中',
  completed: '已完成',
};

export const InventoryItemStatusMap: Record<InventoryItemStatus, string> = {
  normal: '正常',
  surplus: '盘盈',
  deficit: '盘亏',
  unchecked: '未盘点',
};
