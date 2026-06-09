import { useAssetStore } from '@/store/assetStore';
import { StatusTag } from '@/components/StatusTag';
import { AssetCategoryMap } from '@/types';
import { formatCurrency, formatDate } from '@/utils';
import { History, FileText, QrCode, Wrench, ArrowRight } from 'lucide-react';

interface AssetDetailProps {
  assetId: string;
}

export default function AssetDetail({ assetId }: AssetDetailProps) {
  const { getAssetById, getAssetLogs } = useAssetStore();
  const asset = getAssetById(assetId);
  const logs = getAssetLogs(assetId);

  if (!asset) {
    return <div className="text-center py-8 text-slate-500">资产不存在</div>;
  }

  const logTypeIcons: Record<string, React.ReactNode> = {
    create: <FileText className="w-4 h-4" />,
    update: <QrCode className="w-4 h-4" />,
    receive: <ArrowRight className="w-4 h-4" />,
    borrow: <ArrowRight className="w-4 h-4" />,
    return: <ArrowRight className="w-4 h-4" />,
    transfer: <ArrowRight className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
  };

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{asset.name}</h3>
            <p className="text-sm text-slate-500 font-mono">{asset.code}</p>
          </div>
          <StatusTag status={asset.status} type="asset" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">资产类别：</span>
              <span className="text-sm text-slate-700">{AssetCategoryMap[asset.category]}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">品牌型号：</span>
              <span className="text-sm text-slate-700">{asset.brand} / {asset.model}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">规格：</span>
              <span className="text-sm text-slate-700">{asset.specification || '-'}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">存放地点：</span>
              <span className="text-sm text-slate-700">{asset.location || '-'}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">采购价格：</span>
              <span className="text-sm text-slate-700">{formatCurrency(asset.purchasePrice)}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">当前价值：</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(asset.currentValue)}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">采购日期：</span>
              <span className="text-sm text-slate-700">{asset.purchaseDate}</span>
            </div>
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">保修到期：</span>
              <span className="text-sm text-slate-700">{asset.warrantyExpire || '-'}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex">
            <span className="text-sm text-slate-500 w-20 flex-shrink-0">责任人：</span>
            <span className="text-sm text-slate-700">{asset.responsiblePerson} ({asset.department})</span>
          </div>
        </div>

        {asset.description && (
          <div className="mt-3">
            <div className="flex">
              <span className="text-sm text-slate-500 w-20 flex-shrink-0">备注：</span>
              <span className="text-sm text-slate-700">{asset.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* 操作记录 */}
      <div className="pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <History className="w-4 h-4 text-slate-500" />
          <h4 className="font-medium text-slate-900">操作记录</h4>
        </div>

        <div className="relative">
          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={log.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      log.type === 'create' ? 'bg-green-100 text-green-600' :
                      log.type === 'maintenance' ? 'bg-amber-100 text-amber-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {logTypeIcons[log.type] || <FileText className="w-3 h-3" />}
                    </div>
                    {index < logs.length - 1 && (
                      <div className="w-px flex-1 bg-slate-200 my-1"></div>
                    )}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{log.content}</span>
                      <span className="text-xs text-slate-400">{log.createTime}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">操作人：{log.operator}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              暂无操作记录
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
