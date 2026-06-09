import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, Clock, Plus, Search } from 'lucide-react';
import { useBorrowStore } from '@/store/borrowStore';
import { useAssetStore } from '@/store/assetStore';
import { StatusTag } from '@/components/StatusTag';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { BorrowTypeMap, type BorrowType } from '@/types';
import { mockEmployees } from '@/data/mockData';
import { formatDate } from '@/utils';

const tabs = [
  { key: 'receive', label: '领用管理', icon: ArrowDownToLine },
  { key: 'return', label: '归还管理', icon: ArrowUpFromLine },
  { key: 'borrow', label: '借用登记', icon: Clock },
  { key: 'transfer', label: '转移管理', icon: ArrowLeftRight },
];

export default function BorrowPage() {
  const { activeTab, setActiveTab, getRecordsByType, getUnreturnedRecords, returnAsset, addBorrowRecord, transferAsset } = useBorrowStore();
  const { assets, getAssetById } = useAssetStore();
  const [showModal, setShowModal] = useState(false);
  const [returnModal, setReturnModal] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    assetId: '',
    employeeId: '',
    employeeName: '',
    department: '',
    expectedReturnDate: '',
    remark: '',
  });

  const currentTab = activeTab as BorrowType;
  let records = getRecordsByType(currentTab);

  if (currentTab === 'return') {
    records = getUnreturnedRecords().filter(
      (r) => r.type === 'receive' || r.type === 'borrow'
    );
  }

  const filteredRecords = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.assetName.toLowerCase().includes(q) ||
      r.assetCode.toLowerCase().includes(q) ||
      r.employeeName.toLowerCase().includes(q)
    );
  });

  const idleAssets = assets.filter((a) => a.status === 'idle');
  const inUseAssets = assets.filter((a) => a.status === 'in_use');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const asset = getAssetById(formData.assetId);
    const employee = mockEmployees.find((e) => e.id === formData.employeeId);
    
    if (!asset || !employee) {
      alert('请选择资产和员工');
      return;
    }

    if (currentTab === 'transfer') {
      transferAsset({
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.code,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        borrowDate: formatDate(new Date()),
        expectedReturnDate: formData.expectedReturnDate || formatDate(new Date()),
        remark: formData.remark,
      });
    } else {
      addBorrowRecord({
        assetId: asset.id,
        assetName: asset.name,
        assetCode: asset.code,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department,
        type: currentTab,
        borrowDate: formatDate(new Date()),
        expectedReturnDate: formData.expectedReturnDate,
        remark: formData.remark,
      });
    }

    setShowModal(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      assetId: '',
      employeeId: '',
      employeeName: '',
      department: '',
      expectedReturnDate: '',
      remark: '',
    });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = mockEmployees.find((e) => e.id === employeeId);
    if (employee) {
      setFormData({
        ...formData,
        employeeId,
        employeeName: employee.name,
        department: employee.department,
      });
    }
  };

  const handleReturn = (recordId: string) => {
    setSelectedRecordId(recordId);
    setReturnModal(true);
  };

  const confirmReturn = () => {
    if (selectedRecordId) {
      returnAsset(selectedRecordId);
      setReturnModal(false);
      setSelectedRecordId(null);
    }
  };

  const availableAssets = currentTab === 'transfer' ? inUseAssets : idleAssets;
  const modalTitle = currentTab === 'receive' ? '新增领用' : 
                     currentTab === 'borrow' ? '新增借用' : 
                     currentTab === 'transfer' ? '资产转移' : '归还登记';

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">领用归还</h1>
        <p className="text-sm text-slate-500 mt-1">管理资产的领用、借用、转移和归还</p>
      </div>

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
                  onClick={() => setActiveTab(tab.key as 'receive' | 'return' | 'borrow' | 'transfer')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.key !== 'return' && (
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {getRecordsByType(tab.key as BorrowType).length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 工具栏 */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索资产名称/编号/领用人..."
              className="w-72 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {currentTab !== 'return' && (
            <Button onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {modalTitle}
            </Button>
          )}
        </div>

        {/* 记录列表 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  资产编号
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  资产名称
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  {currentTab === 'transfer' ? '原责任人' : '领用人'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  部门
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  {currentTab === 'return' ? '领用日期' : '日期'}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  预计归还
                </th>
                {currentTab === 'return' && (
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                    状态
                  </th>
                )}
                {currentTab !== 'return' && (
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                    类型
                  </th>
                )}
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-700">{record.assetCode}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {record.assetName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.employeeName}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.department}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.borrowDate}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {record.expectedReturnDate}
                  </td>
                  {currentTab === 'return' && (
                    <td className="px-6 py-4">
                      <StatusTag status={record.status} type="borrow" />
                    </td>
                  )}
                  {currentTab !== 'return' && (
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        record.type === 'receive' ? 'bg-green-100 text-green-700' :
                        record.type === 'borrow' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {BorrowTypeMap[record.type]}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    {currentTab === 'return' && (record.status === 'active' || record.status === 'overdue') ? (
                      <Button size="sm" variant="secondary" onClick={() => handleReturn(record.id)}>
                        办理归还
                      </Button>
                    ) : (
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        查看详情
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              暂无记录
            </div>
          )}
        </div>
      </div>

      {/* 新增弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={modalTitle}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              选择资产 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择资产</option>
              {availableAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.code} - {asset.name}
                </option>
              ))}
            </select>
            {availableAssets.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">暂无可选资产</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {currentTab === 'transfer' ? '接收员工' : '领用人'} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employeeId}
              onChange={(e) => handleEmployeeSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">请选择员工</option>
              {mockEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {currentTab === 'transfer' ? '生效日期' : '预计归还日期'}
            </label>
            <input
              type="date"
              value={formData.expectedReturnDate}
              onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              备注
            </label>
            <textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="请输入备注信息"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              取消
            </Button>
            <Button type="submit">确认提交</Button>
          </div>
        </form>
      </Modal>

      {/* 归还确认弹窗 */}
      <Modal
        isOpen={returnModal}
        onClose={() => setReturnModal(false)}
        title="确认归还"
        size="sm"
      >
        <p className="text-slate-600 mb-6">确认该资产已归还？归还后资产状态将更新为闲置。</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={() => setReturnModal(false)}>
            取消
          </Button>
          <Button onClick={confirmReturn}>确认归还</Button>
        </div>
      </Modal>
    </div>
  );
}
