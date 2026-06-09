import { useState } from 'react';
import {
  Plus,
  Filter,
  Download,
  QrCode,
  Search,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { StatusTag } from '@/components/StatusTag';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { AssetCategoryMap, AssetStatusMap, type AssetCategory, type AssetStatus } from '@/types';
import { formatCurrency, formatDate, exportToCSV } from '@/utils';
import { locations } from '@/data/mockData';
import AssetForm from './components/AssetForm';
import AssetDetail from './components/AssetDetail';
import QRCodeModal from './components/QRCodeModal';

export default function AssetsPage() {
  const { assets, getFilteredAssets, setFilters, filters, deleteAsset } = useAssetStore();
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredAssets = getFilteredAssets();
  const totalPages = Math.ceil(filteredAssets.length / pageSize);
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleAdd = () => {
    setSelectedAsset(null);
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    setSelectedAsset(id);
    setShowForm(true);
  };

  const handleView = (id: string) => {
    setSelectedAsset(id);
    setShowDetail(true);
  };

  const handleQRCode = (id: string) => {
    setSelectedAsset(id);
    setShowQRCode(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该资产吗？')) {
      deleteAsset(id);
    }
  };

  const handleExport = () => {
    const data = filteredAssets.map((asset) => ({
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
    }));
    exportToCSV(data, `资产台账_${formatDate(new Date())}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">资产台账</h1>
          <p className="text-sm text-slate-500 mt-1">
            共 {assets.length} 件资产，当前筛选 {filteredAssets.length} 件
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            导出
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            新增资产
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">筛选：</span>
          </div>

          <select
            value={filters.category || ''}
            onChange={(e) => {
              setFilters({ category: (e.target.value as AssetCategory) || undefined });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部类别</option>
            {Object.entries(AssetCategoryMap).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={filters.status || ''}
            onChange={(e) => {
              setFilters({ status: (e.target.value as AssetStatus) || undefined });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            {Object.entries(AssetStatusMap).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>

          <select
            value={filters.location || ''}
            onChange={(e) => {
              setFilters({ location: e.target.value || undefined });
              setCurrentPage(1);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部地点</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.keyword || ''}
              onChange={(e) => {
                setFilters({ keyword: e.target.value });
                setCurrentPage(1);
              }}
              placeholder="搜索资产编号/名称..."
              className="w-56 pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* 资产列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  资产编号
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  资产名称
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  类别
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  品牌/型号
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  价值
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  责任人
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  地点
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  状态
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm text-slate-700">{asset.code}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{asset.name}</div>
                    <div className="text-xs text-slate-500">{asset.specification}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {AssetCategoryMap[asset.category]}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {asset.brand} / {asset.model}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">
                      {formatCurrency(asset.currentValue)}
                    </div>
                    <div className="text-xs text-slate-400">
                      原值 {formatCurrency(asset.purchasePrice)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {asset.responsiblePerson}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{asset.location}</td>
                  <td className="px-6 py-4">
                    <StatusTag status={asset.status} type="asset" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleView(asset.id)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleQRCode(asset.id)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="资产码"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(asset.id)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
          <span className="text-sm text-slate-600">
            第 {currentPage} / {totalPages || 1} 页，共 {filteredAssets.length} 条记录
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page = i + 1;
              if (totalPages > 5) {
                if (currentPage > 3) {
                  page = currentPage - 2 + i;
                }
                if (currentPage > totalPages - 2) {
                  page = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-white border border-slate-200'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={selectedAsset ? '编辑资产' : '新增资产'}
        size="xl"
      >
        <AssetForm
          assetId={selectedAsset}
          onSuccess={() => {
            setShowForm(false);
            setSelectedAsset(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedAsset(null);
          }}
        />
      </Modal>

      {/* 详情弹窗 */}
      <Modal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title="资产详情"
        size="xl"
      >
        {selectedAsset && <AssetDetail assetId={selectedAsset} />}
      </Modal>

      {/* 二维码弹窗 */}
      <Modal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        title="资产二维码"
        size="sm"
      >
        {selectedAsset && <QRCodeModal assetId={selectedAsset} />}
      </Modal>
    </div>
  );
}
