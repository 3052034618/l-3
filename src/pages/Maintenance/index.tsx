import { useState } from 'react';
import { Wrench, Calendar, AlertTriangle, Plus, Clock, CheckCircle, XCircle, Play, Pause } from 'lucide-react';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useAssetStore } from '@/store/assetStore';
import { StatusTag } from '@/components/StatusTag';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { MaintenanceStatusMap, type MaintenanceStatus, type MaintenanceType } from '@/types';
import { formatDate, formatCurrency, daysUntil } from '@/utils';

const tabs = [
  { key: 'orders', label: '维修工单', icon: Wrench },
  { key: 'plans', label: '保养计划', icon: Calendar },
];

const statusTabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'repairing', label: '维修中' },
  { key: 'completed', label: '已完成' },
];

export default function MaintenancePage() {
  const {
    activeTab,
    setActiveTab,
    orders,
    plans,
    getOrdersByStatus,
    getUpcomingMaintenance,
    addOrder,
    updateOrderStatus,
    addPlan,
    togglePlanStatus,
    executePlan,
  } = useMaintenanceStore();
  const { assets } = useAssetStore();
  const [statusFilter, setStatusFilter] = useState('all');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const [orderForm, setOrderForm] = useState({
    assetId: '',
    type: 'repair' as MaintenanceType,
    title: '',
    description: '',
    cost: 0,
    handler: '',
    remark: '',
  });

  const [planForm, setPlanForm] = useState({
    assetId: '',
    type: 'maintenance' as MaintenanceType,
    name: '',
    cycleDays: 30,
    lastDate: formatDate(new Date()),
    nextDate: '',
  });

  const upcoming = getUpcomingMaintenance(7);

  const filteredOrders = statusFilter === 'all' 
    ? [...orders].sort((a, b) => new Date(b.createDate).getTime() - new Date(a.createDate).getTime())
    : getOrdersByStatus(statusFilter as MaintenanceStatus);

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === orderForm.assetId);
    if (!asset) {
      alert('请选择资产');
      return;
    }
    
    addOrder({
      ...orderForm,
      assetName: asset.name,
      assetCode: asset.code,
    });
    
    setShowOrderModal(false);
    setOrderForm({
      assetId: '',
      type: 'repair',
      title: '',
      description: '',
      cost: 0,
      handler: '',
      remark: '',
    });
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find((a) => a.id === planForm.assetId);
    if (!asset) {
      alert('请选择资产');
      return;
    }

    const nextDate = new Date(planForm.lastDate);
    nextDate.setDate(nextDate.getDate() + planForm.cycleDays);

    addPlan({
      ...planForm,
      assetName: asset.name,
      nextDate: formatDate(nextDate),
    });
    
    setShowPlanModal(false);
    setPlanForm({
      assetId: '',
      type: 'maintenance',
      name: '',
      cycleDays: 30,
      lastDate: formatDate(new Date()),
      nextDate: '',
    });
  };

  const handleStatusChange = (orderId: string, newStatus: MaintenanceStatus) => {
    const order = orders.find((o) => o.id === orderId);
    if (order && newStatus === 'completed' && order.cost === 0) {
      const cost = prompt('请输入维修费用（元）：', '0');
      if (cost !== null) {
        updateOrderStatus(orderId, newStatus, parseFloat(cost) || 0);
      }
    } else {
      updateOrderStatus(orderId, newStatus);
    }
    setSelectedOrderId(null);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">维修保养</h1>
          <p className="text-sm text-slate-500 mt-1">管理维修工单和保养计划</p>
        </div>
      </div>

      {/* 提醒卡片 */}
      {upcoming.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">到期保养提醒</p>
              <p className="text-sm text-amber-700">
                您有 {upcoming.length} 个保养计划将在 7 天内到期，请及时安排
              </p>
            </div>
            <Button size="sm" variant="secondary">
              查看详情
            </Button>
          </div>
        </div>
      )}

      {/* 标签页 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as 'orders' | 'plans')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
            <div className="ml-auto flex items-center pr-4">
              {activeTab === 'orders' ? (
                <Button onClick={() => setShowOrderModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增工单
                </Button>
              ) : (
                <Button onClick={() => setShowPlanModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  新增计划
                </Button>
              )}
            </div>
          </nav>
        </div>

        {/* 维修工单列表 */}
        {activeTab === 'orders' && (
          <div>
            {/* 状态筛选 */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2">
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1 text-xs">
                      ({getOrdersByStatus(tab.key as MaintenanceStatus).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 工单列表 */}
            <div className="divide-y divide-slate-200">
              {filteredOrders.map((order) => {
                const daysLeft = daysUntil(order.createDate);
                return (
                  <div key={order.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          order.status === 'completed' ? 'bg-green-100' :
                          order.status === 'repairing' ? 'bg-blue-100' :
                          order.status === 'cancelled' ? 'bg-slate-100' :
                          'bg-amber-100'
                        }`}>
                          <Wrench className={`w-5 h-5 ${
                            order.status === 'completed' ? 'text-green-600' :
                            order.status === 'repairing' ? 'text-blue-600' :
                            order.status === 'cancelled' ? 'text-slate-500' :
                            'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900">{order.title}</h4>
                            <StatusTag status={order.status} type="maintenance" size="sm" />
                          </div>
                          <p className="text-sm text-slate-500 mt-1">
                            {order.assetName} ({order.assetCode})
                          </p>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {order.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-slate-600">
                          创建时间：{order.createDate}
                        </p>
                        {order.cost > 0 && (
                          <p className="text-sm font-medium text-blue-600 mt-1">
                            费用：{formatCurrency(order.cost)}
                          </p>
                        )}
                        {order.handler && (
                          <p className="text-xs text-slate-400 mt-1">
                            处理人：{order.handler}
                          </p>
                        )}
                      </div>
                    </div>

                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                        {order.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'repairing')}
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            开始维修
                          </Button>
                        )}
                        {order.status === 'repairing' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(order.id, 'completed')}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                            完成维修
                          </Button>
                        )}
                        {(order.status === 'pending' || order.status === 'repairing') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleStatusChange(order.id, 'cancelled')}
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1.5" />
                            取消
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  暂无维修工单
                </div>
              )}
            </div>
          </div>
        )}

        {/* 保养计划列表 */}
        {activeTab === 'plans' && (
          <div className="divide-y divide-slate-200">
            {plans.map((plan) => {
              const daysLeft = daysUntil(plan.nextDate);
              const isUrgent = daysLeft <= 7 && daysLeft >= 0;
              
              return (
                <div key={plan.id} className="p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        plan.status === 'active' ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        <Calendar className={`w-5 h-5 ${
                          plan.status === 'active' ? 'text-blue-600' : 'text-slate-400'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-slate-900">{plan.name}</h4>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            plan.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {plan.status === 'active' ? '运行中' : '已暂停'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {plan.assetName} · 每 {plan.cycleDays} 天
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm text-slate-600">上次保养</p>
                        <p className="text-sm font-medium text-slate-900">{plan.lastDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-600">下次保养</p>
                        <p className={`text-sm font-medium ${
                          isUrgent && plan.status === 'active' ? 'text-amber-600' : 'text-slate-900'
                        }`}>
                          {plan.nextDate}
                          {isUrgent && plan.status === 'active' && (
                            <span className="ml-2 text-xs">({daysLeft}天后)</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => togglePlanStatus(plan.id)}
                          >
                            <Pause className="w-3.5 h-3.5 mr-1.5" />
                            暂停
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => togglePlanStatus(plan.id)}
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" />
                            启用
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => executePlan(plan.id)}
                          disabled={plan.status !== 'active'}
                        >
                          <Wrench className="w-3.5 h-3.5 mr-1.5" />
                          执行保养
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {plans.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                暂无保养计划
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新增工单弹窗 */}
      <Modal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        title="新增维修工单"
      >
        <form onSubmit={handleAddOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              选择资产 <span className="text-red-500">*</span>
            </label>
            <select
              value={orderForm.assetId}
              onChange={(e) => setOrderForm({ ...orderForm, assetId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择资产</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              类型
            </label>
            <select
              value={orderForm.type}
              onChange={(e) => setOrderForm({ ...orderForm, type: e.target.value as MaintenanceType })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="repair">故障维修</option>
              <option value="maintenance">日常保养</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              工单标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orderForm.title}
              onChange={(e) => setOrderForm({ ...orderForm, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入工单标题"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              问题描述
            </label>
            <textarea
              value={orderForm.description}
              onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="请描述故障或保养内容"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                处理人员
              </label>
              <input
                type="text"
                value={orderForm.handler}
                onChange={(e) => setOrderForm({ ...orderForm, handler: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="处理人/单位"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                预计费用 (元)
              </label>
              <input
                type="number"
                value={orderForm.cost}
                onChange={(e) => setOrderForm({ ...orderForm, cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setShowOrderModal(false)}>
              取消
            </Button>
            <Button type="submit">创建工单</Button>
          </div>
        </form>
      </Modal>

      {/* 新增计划弹窗 */}
      <Modal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title="新增保养计划"
      >
        <form onSubmit={handleAddPlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              选择资产 <span className="text-red-500">*</span>
            </label>
            <select
              value={planForm.assetId}
              onChange={(e) => setPlanForm({ ...planForm, assetId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择资产</option>
              {assets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              计划名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={planForm.name}
              onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入计划名称"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                保养周期 (天)
              </label>
              <input
                type="number"
                value={planForm.cycleDays}
                onChange={(e) => setPlanForm({ ...planForm, cycleDays: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                上次保养日期
              </label>
              <input
                type="date"
                value={planForm.lastDate}
                onChange={(e) => setPlanForm({ ...planForm, lastDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              类型
            </label>
            <select
              value={planForm.type}
              onChange={(e) => setPlanForm({ ...planForm, type: e.target.value as MaintenanceType })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="maintenance">定期保养</option>
              <option value="repair">定期检修</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setShowPlanModal(false)}>
              取消
            </Button>
            <Button type="submit">创建计划</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
