import { useState } from 'react';
import { ScanLine, Search, Package, MapPin, User, Clock, Tag, ClipboardList } from 'lucide-react';
import { useAssetStore } from '@/store/assetStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { StatusTag } from '@/components/StatusTag';
import { Button } from '@/components/Button';
import { AssetStatusMap, AssetCategoryMap, InventoryItemStatusMap } from '@/types';
import { formatCurrency, formatDate } from '@/utils';

interface ScanAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ScanAssetModal({ isOpen, onClose }: ScanAssetModalProps) {
  const { assets, getAssetById, getAssetLogs } = useAssetStore();
  const { getAssetInventoryHistory } = useInventoryStore();
  const [scanInput, setScanInput] = useState('');
  const [foundAsset, setFoundAsset] = useState<ReturnType<typeof getAssetById>>(undefined);
  const [notFound, setNotFound] = useState(false);

  const handleScan = () => {
    if (!scanInput.trim()) return;

    const input = scanInput.trim();

    try {
      const data = JSON.parse(input);
      if (data.id) {
        const asset = getAssetById(data.id);
        if (asset) {
          setFoundAsset(asset);
          setNotFound(false);
          return;
        }
      }
      if (data.code) {
        const asset = assets.find((a) => a.code === data.code);
        if (asset) {
          setFoundAsset(asset);
          setNotFound(false);
          return;
        }
      }
    } catch {
      // 不是 JSON，按编号或名称搜索
    }

    const asset = assets.find(
      (a) => a.code.toLowerCase() === input.toLowerCase() || a.name === input
    );

    if (asset) {
      setFoundAsset(asset);
      setNotFound(false);
    } else {
      setFoundAsset(undefined);
      setNotFound(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  const reset = () => {
    setScanInput('');
    setFoundAsset(undefined);
    setNotFound(false);
  };

  const logs = foundAsset ? getAssetLogs(foundAsset.id).slice(0, 5) : [];
  const inventoryHistory = foundAsset ? getAssetInventoryHistory(foundAsset.code) : [];
  const lastInventory = inventoryHistory.length > 0 ? inventoryHistory[0] : null;

  return (
    <div className="space-y-6">
      {!foundAsset ? (
        <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ScanLine className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">扫码查询资产</h3>
            <p className="text-sm text-slate-500 mt-1">
              扫描资产二维码或输入资产编号查询详情
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                扫码内容 / 资产编号
              </label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="扫描二维码或输入资产编号..."
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <Button onClick={handleScan}>查询</Button>
              </div>
            </div>

            {notFound && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <p className="text-amber-700 text-sm">未找到对应的资产信息</p>
                <p className="text-amber-500 text-xs mt-1">
                  请检查资产编号是否正确
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs font-medium text-slate-600 mb-2">快速查找：</p>
              <div className="flex flex-wrap gap-2">
                {assets.slice(0, 6).map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      setScanInput(asset.code);
                      setFoundAsset(asset);
                      setNotFound(false);
                    }}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                  >
                    {asset.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {foundAsset.name}
                </h3>
                <p className="text-sm text-slate-500 font-mono">{foundAsset.code}</p>
              </div>
            </div>
            <StatusTag status={foundAsset.status} type="asset" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Tag className="w-3.5 h-3.5" />
                资产类别
              </div>
              <p className="text-sm font-medium text-slate-900">
                {AssetCategoryMap[foundAsset.category]}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <MapPin className="w-3.5 h-3.5" />
                存放地点
              </div>
              <p className="text-sm font-medium text-slate-900">{foundAsset.location}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <User className="w-3.5 h-3.5" />
                责任人
              </div>
              <p className="text-sm font-medium text-slate-900">
                {foundAsset.responsiblePerson}
              </p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                采购日期
              </div>
              <p className="text-sm font-medium text-slate-900">
                {foundAsset.purchaseDate}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">当前价值</p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(foundAsset.currentValue)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">采购原值</p>
                <p className="text-sm text-slate-600 line-through">
                  {formatCurrency(foundAsset.purchasePrice)}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                品牌型号：{foundAsset.brand} {foundAsset.model}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                所属部门：{foundAsset.department}
              </p>
            </div>
          </div>

          {lastInventory && (
            <div className={`rounded-lg p-4 ${
              lastInventory.status === 'normal' ? 'bg-green-50 border border-green-200' :
              lastInventory.status === 'surplus' ? 'bg-purple-50 border border-purple-200' :
              lastInventory.status === 'deficit' ? 'bg-red-50 border border-red-200' :
              'bg-slate-50 border border-slate-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className={`w-4 h-4 ${
                  lastInventory.status === 'normal' ? 'text-green-600' :
                  lastInventory.status === 'surplus' ? 'text-purple-600' :
                  lastInventory.status === 'deficit' ? 'text-red-600' :
                  'text-slate-500'
                }`} />
                <span className={`text-sm font-medium ${
                  lastInventory.status === 'normal' ? 'text-green-700' :
                  lastInventory.status === 'surplus' ? 'text-purple-700' :
                  lastInventory.status === 'deficit' ? 'text-red-700' :
                  'text-slate-600'
                }`}>
                  最近一次盘点：{InventoryItemStatusMap[lastInventory.status]}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1">
                <p>盘点任务：{lastInventory.taskName}</p>
                <p>盘点日期：{lastInventory.taskDate}</p>
                {lastInventory.checkTime && <p>盘点时间：{lastInventory.checkTime}</p>}
                {lastInventory.remark && <p>备注：{lastInventory.remark}</p>}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-slate-900 mb-3">最近操作记录</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{log.content}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">{log.createTime}</span>
                        <span className="text-xs text-slate-400">操作人：{log.operator}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">暂无操作记录</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={reset}>
              ← 返回查询
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </div>
        </>
      )}
    </div>
  );
}
