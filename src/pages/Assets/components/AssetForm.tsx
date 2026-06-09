import { useState, useEffect } from 'react';
import { useAssetStore } from '@/store/assetStore';
import { Button } from '@/components/Button';
import { AssetCategoryMap, type AssetCategory, type AssetStatus, AssetStatusMap } from '@/types';
import { locations, departments, mockEmployees } from '@/data/mockData';
import { formatDate } from '@/utils';

interface AssetFormProps {
  assetId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AssetForm({ assetId, onSuccess, onCancel }: AssetFormProps) {
  const { getAssetById, addAsset, updateAsset } = useAssetStore();
  const [formData, setFormData] = useState({
    name: '',
    category: 'office_equipment' as AssetCategory,
    specification: '',
    brand: '',
    model: '',
    purchasePrice: 0,
    purchaseDate: formatDate(new Date()),
    location: '',
    responsiblePerson: '',
    department: '',
    status: 'idle' as AssetStatus,
    warrantyExpire: '',
    description: '',
    depreciationYears: 5,
  });

  useEffect(() => {
    if (assetId) {
      const asset = getAssetById(assetId);
      if (asset) {
        setFormData({
          name: asset.name,
          category: asset.category,
          specification: asset.specification,
          brand: asset.brand,
          model: asset.model,
          purchasePrice: asset.purchasePrice,
          purchaseDate: asset.purchaseDate,
          location: asset.location,
          responsiblePerson: asset.responsiblePerson,
          department: asset.department,
          status: asset.status,
          warrantyExpire: asset.warrantyExpire,
          description: asset.description,
          depreciationYears: asset.depreciationYears,
        });
      }
    }
  }, [assetId, getAssetById]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('请输入资产名称');
      return;
    }
    
    if (assetId) {
      updateAsset(assetId, formData);
    } else {
      addAsset(formData);
    }
    onSuccess();
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            资产名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入资产名称"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            资产类别
          </label>
          <select
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(AssetCategoryMap).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            品牌
          </label>
          <input
            type="text"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入品牌"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            型号
          </label>
          <input
            type="text"
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入型号"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            规格
          </label>
          <input
            type="text"
            value={formData.specification}
            onChange={(e) => handleChange('specification', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="请输入规格"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            采购价格 (元)
          </label>
          <input
            type="number"
            value={formData.purchasePrice}
            onChange={(e) => handleChange('purchasePrice', Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            step="0.01"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            采购日期
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => handleChange('purchaseDate', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            保修到期
          </label>
          <input
            type="date"
            value={formData.warrantyExpire}
            onChange={(e) => handleChange('warrantyExpire', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            存放地点
          </label>
          <select
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择地点</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            所属部门
          </label>
          <select
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择部门</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            责任人
          </label>
          <select
            value={formData.responsiblePerson}
            onChange={(e) => handleChange('responsiblePerson', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">请选择责任人</option>
            {mockEmployees.map((emp) => (
              <option key={emp.id} value={emp.name}>{emp.name} - {emp.department}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            资产状态
          </label>
          <select
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(AssetStatusMap).map(([key, value]) => (
              <option key={key} value={key}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            折旧年限 (年)
          </label>
          <input
            type="number"
            value={formData.depreciationYears}
            onChange={(e) => handleChange('depreciationYears', Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="20"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          备注描述
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="请输入备注描述"
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">
          {assetId ? '保存修改' : '确认新增'}
        </Button>
      </div>
    </form>
  );
}
