import { useState } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingDown,
  TrendingUp,
  Package,
  DollarSign,
  Wrench,
  Download,
  FileText,
} from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { useMaintenanceStore } from '@/store/maintenanceStore';
import { useBorrowStore } from '@/store/borrowStore';
import { Button } from '@/components/Button';
import { AssetCategoryMap, AssetStatusMap } from '@/types';
import { formatCurrency, exportToCSV, formatDate } from '@/utils';

const reportTabs = [
  { key: 'overview', label: '资产概览', icon: BarChart3 },
  { key: 'idle', label: '闲置率分析', icon: Package },
  { key: 'depreciation', label: '折旧概览', icon: TrendingDown },
];

export default function ReportsPage() {
  const {
    assets,
    getStatsOverview,
    getAssetsByCategory,
    getAssetsByDepartment,
    getDepreciationStats,
    getIdleRate,
  } = useAssetStore();
  const { getMonthlyCost } = useMaintenanceStore();
  const { getOverdueRecords, getActiveBorrows } = useBorrowStore();
  const [activeTab, setActiveTab] = useState('overview');

  const stats = getStatsOverview();
  const categoryStats = getAssetsByCategory();
  const departmentStats = getAssetsByDepartment();
  const depreciationStats = getDepreciationStats();
  const idleRate = getIdleRate();
  const monthlyCost = getMonthlyCost();
  const overdueCount = getOverdueRecords().length;
  const activeBorrowCount = getActiveBorrows().length;

  const handleExportAssets = () => {
    const data = assets.map((asset) => ({
      资产编号: asset.code,
      资产名称: asset.name,
      类别: AssetCategoryMap[asset.category],
      品牌: asset.brand,
      型号: asset.model,
      规格: asset.specification,
      采购价格: asset.purchasePrice,
      采购日期: asset.purchaseDate,
      当前价值: asset.currentValue,
      存放地点: asset.location,
      责任人: asset.responsiblePerson,
      所属部门: asset.department,
      状态: AssetStatusMap[asset.status],
      保修到期: asset.warrantyExpire,
      备注: asset.description,
    }));
    exportToCSV(data, `资产明细表_${formatDate(new Date())}.csv`);
  };

  // 计算各状态资产数量
  const statusCounts = {
    idle: assets.filter((a) => a.status === 'idle').length,
    in_use: assets.filter((a) => a.status === 'in_use').length,
    borrowed: assets.filter((a) => a.status === 'borrowed').length,
    maintenance: assets.filter((a) => a.status === 'maintenance').length,
    scrapped: assets.filter((a) => a.status === 'scrapped').length,
  };

  // 计算闲置资产按类别
  const idleByCategory = Object.entries(categoryStats).map(([category, data]) => {
    const idleCount = assets.filter(
      (a) => a.category === category && a.status === 'idle'
    ).length;
    const rate = data.count > 0 ? Math.round((idleCount / data.count) * 10000) / 100 : 0;
    return { category, count: data.count, idleCount, rate };
  });

  // 计算闲置资产按部门
  const idleByDepartment = Object.entries(departmentStats).map(([dept, data]) => {
    const idleCount = assets.filter(
      (a) => a.department === dept && a.status === 'idle'
    ).length;
    const rate = data.count > 0 ? Math.round((idleCount / data.count) * 10000) / 100 : 0;
    return { department: dept, count: data.count, idleCount, rate };
  });

  const maxCategoryValue = Math.max(...Object.values(categoryStats).map((d) => d.value), 1);
  const maxDepartmentValue = Math.max(...Object.values(departmentStats).map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">统计报表</h1>
          <p className="text-sm text-slate-500 mt-1">查看资产统计数据和分析报表</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExportAssets}>
            <Download className="w-4 h-4 mr-2" />
            导出明细表
          </Button>
        </div>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">资产总数</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalAssets}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">总价值 {formatCurrency(stats.totalValue)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">闲置率</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.idleRate}%</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">闲置资产 {stats.idleAssets} 件</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">月维修费</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(monthlyCost)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Wrench className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">维修中资产 {stats.maintenanceAssets} 件</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">在用资产</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{stats.inUseAssets}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">借出中 {activeBorrowCount} 件</p>
        </div>
      </div>

      {/* 报表标签页 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="border-b border-slate-200">
          <nav className="flex">
            {reportTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
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
          </nav>
        </div>

        {/* 资产概览 */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-8">
            {/* 资产分类统计 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">按类别统计</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(categoryStats).map(([category, data]) => (
                  <div
                    key={category}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-700">
                        {AssetCategoryMap[category as keyof typeof AssetCategoryMap]}
                      </span>
                      <span className="text-2xl font-bold text-slate-900">{data.count}</span>
                    </div>
                    <p className="text-sm text-blue-600 font-medium">
                      {formatCurrency(data.value)}
                    </p>
                    <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(data.value / maxCategoryValue) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 部门资产统计 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">按部门统计</h3>
              <div className="space-y-3">
                {Object.entries(departmentStats)
                  .sort((a, b) => b[1].value - a[1].value)
                  .map(([dept, data]) => (
                    <div key={dept} className="flex items-center gap-4">
                      <div className="w-24 text-sm text-slate-600 flex-shrink-0">
                        {dept}
                      </div>
                      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg transition-all"
                          style={{ width: `${(data.value / maxDepartmentValue) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="text-sm font-medium text-white">
                            {data.count} 件
                          </span>
                        </div>
                      </div>
                      <div className="w-32 text-right">
                        <span className="text-sm font-medium text-slate-700">
                          {formatCurrency(data.value)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 资产状态分布 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">资产状态分布</h3>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(statusCounts).map(([status, count]) => {
                  const percentage = stats.totalAssets > 0
                    ? Math.round((count / stats.totalAssets) * 10000) / 100
                    : 0;
                  const colors: Record<string, string> = {
                    idle: 'bg-slate-500',
                    in_use: 'bg-green-500',
                    borrowed: 'bg-blue-500',
                    maintenance: 'bg-amber-500',
                    scrapped: 'bg-red-500',
                  };
                  return (
                    <div key={status} className="text-center">
                      <div className={`w-16 h-16 mx-auto rounded-full ${colors[status]} flex items-center justify-center text-white text-xl font-bold mb-2`}>
                        {count}
                      </div>
                      <p className="text-sm font-medium text-slate-700">
                        {AssetStatusMap[status as keyof typeof AssetStatusMap]}
                      </p>
                      <p className="text-xs text-slate-400">{percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 闲置率分析 */}
        {activeTab === 'idle' && (
          <div className="p-6 space-y-8">
            {/* 总闲置率 */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">总体闲置率</p>
                  <p className="text-4xl font-bold text-amber-600 mt-2">{idleRate}%</p>
                  <p className="text-sm text-amber-600 mt-1">
                    共 {stats.idleAssets} 件闲置资产，建议优化配置
                  </p>
                </div>
                <div className="w-24 h-24">
                  <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#fef3c7"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                      strokeDasharray={`${idleRate}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* 按类别闲置率 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">按类别闲置率</h3>
              <div className="space-y-4">
                {idleByCategory.map((item) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">
                        {AssetCategoryMap[item.category as keyof typeof AssetCategoryMap]}
                      </span>
                      <span className="text-sm text-slate-500">
                        闲置 {item.idleCount}/{item.count} 件 ({item.rate}%)
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          item.rate > 30 ? 'bg-red-500' : item.rate > 15 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${item.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 按部门闲置率 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">按部门闲置率</h3>
              <div className="space-y-4">
                {idleByDepartment
                  .sort((a, b) => b.rate - a.rate)
                  .map((item) => (
                    <div key={item.department}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {item.department}
                        </span>
                        <span className="text-sm text-slate-500">
                          闲置 {item.idleCount}/{item.count} 件 ({item.rate}%)
                        </span>
                      </div>
                      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.rate > 30 ? 'bg-red-500' : item.rate > 15 ? 'bg-amber-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${item.rate}%` }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* 折旧概览 */}
        {activeTab === 'depreciation' && (
          <div className="p-6 space-y-8">
            {/* 折旧总览 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <p className="text-sm text-slate-500">资产原值</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">
                  {formatCurrency(depreciationStats.totalOriginal)}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-5 border border-red-100">
                <p className="text-sm text-red-600">累计折旧</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  {formatCurrency(depreciationStats.totalDepreciation)}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                <p className="text-sm text-green-600">资产净值</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {formatCurrency(depreciationStats.totalCurrent)}
                </p>
              </div>
            </div>

            {/* 折旧进度条 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">总体折旧进度</span>
                <span className="text-sm text-slate-500">
                  {depreciationStats.totalOriginal > 0
                    ? Math.round(
                        (depreciationStats.totalDepreciation / depreciationStats.totalOriginal) * 10000
                      ) / 100
                    : 0}
                  %
                </span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-400 to-red-500 rounded-full transition-all"
                  style={{
                    width: `${depreciationStats.totalOriginal > 0
                      ? (depreciationStats.totalDepreciation / depreciationStats.totalOriginal) * 100
                      : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* 按类别折旧 */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">按类别折旧明细</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        资产类别
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        数量
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        资产原值
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        累计折旧
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        资产净值
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">
                        折旧率
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(categoryStats).map(([category, data]) => {
                      const categoryAssets = assets.filter((a) => a.category === category);
                      const originalValue = categoryAssets.reduce((sum, a) => sum + a.purchasePrice, 0);
                      const currentValue = data.value;
                      const depreciation = originalValue - currentValue;
                      const rate = originalValue > 0
                        ? Math.round((depreciation / originalValue) * 10000) / 100
                        : 0;
                      return (
                        <tr key={category} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {AssetCategoryMap[category as keyof typeof AssetCategoryMap]}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {data.count} 件
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatCurrency(originalValue)}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600">
                            -{formatCurrency(depreciation)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">
                            {formatCurrency(currentValue)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              rate > 50 ? 'bg-red-100 text-red-700' :
                              rate > 30 ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
