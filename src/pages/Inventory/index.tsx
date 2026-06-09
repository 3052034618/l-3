import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle,
  Upload,
  Download,
  FileUp,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Target,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { useAssetStore } from '@/store/assetStore';
import { StatusTag } from '@/components/StatusTag';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import {
  InventoryItemStatusMap,
  type InventoryItemStatus,
} from '@/types';
import { departments } from '@/data/mockData';
import { formatDate, exportToCSV } from '@/utils';

interface ImportItem {
  code: string;
  name: string;
}

export default function InventoryPage() {
  const {
    tasks,
    activeTaskId,
    setActiveTaskId,
    getTaskItems,
    createTask,
    startTask,
    completeTask,
    updateItemStatus,
    importInventory,
  } = useInventoryStore();
  const { handleInventoryDeficit, handleInventorySurplus, getAssetByCode } = useAssetStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [itemFilter, setItemFilter] = useState<InventoryItemStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'summary' | 'report'>('list');
  const [summarySearch, setSummarySearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    normal: true,
    surplus: true,
    deficit: true,
    unchecked: true,
  });
  const [importPreview, setImportPreview] = useState<ImportItem[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importStep, setImportStep] = useState<'upload' | 'confirm'>('upload');
  const [importValidation, setImportValidation] = useState<{
    valid: ImportItem[];
    duplicateInFile: ImportItem[];
    emptyCode: ImportItem[];
    alreadyExists: ImportItem[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [taskForm, setTaskForm] = useState({
    name: '',
    planDate: formatDate(new Date()),
    range: '全公司',
    creator: '管理员',
  });

  const activeTask = tasks.find((t) => t.id === activeTaskId);
  const taskItems = activeTaskId ? getTaskItems(activeTaskId) : [];

  const filteredItems = taskItems.filter((item) => {
    if (itemFilter !== 'all' && item.status !== itemFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.assetName.toLowerCase().includes(q) ||
        item.assetCode.toLowerCase().includes(q) ||
        item.responsiblePerson.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getCardProgress = (task: typeof tasks[0]) => {
    if (task.totalCount === 0) return { count: 0, total: 0, percent: 0 };
    return {
      count: task.checkedCount,
      total: task.totalCount,
      percent: Math.round((task.checkedCount / task.totalCount) * 100),
    };
  };

  const getDetailProgress = () => {
    if (taskItems.length === 0) return { count: 0, total: 0, percent: 0 };
    const checked = taskItems.filter((i) => i.status !== 'unchecked').length;
    return {
      count: checked,
      total: taskItems.length,
      percent: Math.round((checked / taskItems.length) * 100),
    };
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTask(taskForm);
    setShowCreateModal(false);
    setTaskForm({
      name: '',
      planDate: formatDate(new Date()),
      range: '全公司',
      creator: '管理员',
    });
  };

  const handleStartTask = (taskId: string) => {
    if (confirm('确认开始盘点？系统将自动生成盘点清单。')) {
      startTask(taskId);
    }
  };

  const handleCompleteTask = (taskId: string) => {
    if (confirm('确认完成盘点？盘点结果将被记录。')) {
      completeTask(taskId);
    }
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    const fileName = file.name.toLowerCase();

    reader.onload = (e) => {
      try {
        let data: ImportItem[] = [];

        if (fileName.endsWith('.csv')) {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter((line) => line.trim());
          
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
          const codeIdx = headers.findIndex((h) => h.includes('编号') || h.includes('code') || h.includes('资产编码'));
          const nameIdx = headers.findIndex((h) => h.includes('名称') || h.includes('name') || h.includes('资产名称'));

          const startIdx = Math.max(codeIdx, nameIdx) >= 0 ? 1 : 0;
          const actualCodeIdx = codeIdx >= 0 ? codeIdx : 0;
          const actualNameIdx = nameIdx >= 0 ? nameIdx : 1;

          for (let i = startIdx; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
            if (cols[actualCodeIdx] || cols[actualNameIdx]) {
              data.push({
                code: cols[actualCodeIdx] || '',
                name: cols[actualNameIdx] || '',
              });
            }
          }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          const workbook = XLSX.read(e.target?.result, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as string[][];

          if (jsonData.length > 0) {
            const headers = jsonData[0].map((h) => String(h || '').toLowerCase());
            const codeIdx = headers.findIndex((h) => h.includes('编号') || h.includes('code') || h.includes('资产编码'));
            const nameIdx = headers.findIndex((h) => h.includes('名称') || h.includes('name') || h.includes('资产名称'));

            const startIdx = Math.max(codeIdx, nameIdx) >= 0 ? 1 : 0;
            const actualCodeIdx = codeIdx >= 0 ? codeIdx : 0;
            const actualNameIdx = nameIdx >= 0 ? nameIdx : 1;

            for (let i = startIdx; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (row && (row[actualCodeIdx] || row[actualNameIdx])) {
                data.push({
                  code: String(row[actualCodeIdx] || ''),
                  name: String(row[actualNameIdx] || ''),
                });
              }
            }
          }
        }

        setImportPreview(data);
        setImportFileName(file.name);
      } catch (err) {
        console.error('解析文件失败:', err);
        alert('文件解析失败，请检查文件格式');
      }
    };

    if (fileName.endsWith('.csv')) {
      reader.readAsText(file, 'UTF-8');
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const name = file.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
        parseFile(file);
      } else {
        alert('请上传 CSV 或 Excel 文件');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const validateImport = () => {
    if (!activeTaskId || importPreview.length === 0) return;

    const currentItems = getTaskItems(activeTaskId);
    const existingCodes = new Set(currentItems.map((i) => i.assetCode));

    const valid: ImportItem[] = [];
    const duplicateInFile: ImportItem[] = [];
    const emptyCode: ImportItem[] = [];
    const alreadyExists: ImportItem[] = [];
    const seenCodes = new Set<string>();

    importPreview.forEach((item) => {
      if (!item.code.trim()) {
        emptyCode.push(item);
        return;
      }

      if (existingCodes.has(item.code)) {
        alreadyExists.push(item);
        return;
      }

      if (seenCodes.has(item.code)) {
        duplicateInFile.push(item);
        return;
      }

      seenCodes.add(item.code);
      valid.push(item);
    });

    setImportValidation({ valid, duplicateInFile, emptyCode, alreadyExists });
    setImportStep('confirm');
  };

  const handleConfirmImport = () => {
    if (!importValidation || importValidation.valid.length === 0) {
      alert('没有可导入的有效数据');
      return;
    }
    if (activeTaskId) {
      importInventory(activeTaskId, importValidation.valid);
      setShowImport(false);
      setImportPreview([]);
      setImportFileName('');
      setImportStep('upload');
      setImportValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusCount = (status: InventoryItemStatus) => {
    return taskItems.filter((i) => i.status === status).length;
  };

  const handleExportInventory = () => {
    if (!activeTask || taskItems.length === 0) {
      alert('没有可导出的盘点数据');
      return;
    }

    const data = taskItems.map((item) => ({
      资产编号: item.assetCode,
      资产名称: item.assetName,
      存放地点: item.location || '-',
      责任人: item.responsiblePerson || '-',
      盘点状态: InventoryItemStatusMap[item.status],
      盘点时间: item.checkTime || '-',
      备注: item.remark || '-',
    }));

    exportToCSV(data, `盘点结果_${activeTask.name}_${formatDate(new Date())}.csv`);
  };

  const handleSyncDeficit = () => {
    if (!activeTask) return;
    const deficitItems = taskItems.filter((i) => i.status === 'deficit');
    if (deficitItems.length === 0) {
      alert('没有盘亏资产需要同步');
      return;
    }

    if (!confirm(`确认将 ${deficitItems.length} 件盘亏资产转入待处理状态？`)) {
      return;
    }

    let successCount = 0;
    let skipCount = 0;

    deficitItems.forEach((item) => {
      const asset = getAssetByCode(item.assetCode);
      if (asset && asset.status !== 'pending_disposal') {
        handleInventoryDeficit(item.assetCode, activeTask.name);
        successCount++;
      } else {
        skipCount++;
      }
    });

    alert(`同步完成：成功 ${successCount} 件，跳过 ${skipCount} 件（已在待处理状态或不存在）`);
  };

  const handleSyncSurplus = () => {
    if (!activeTask) return;
    const surplusItems = taskItems.filter((i) => i.status === 'surplus');
    if (surplusItems.length === 0) {
      alert('没有盘盈资产需要同步');
      return;
    }

    if (!confirm(`确认将 ${surplusItems.length} 件盘盈资产转为待建档记录？`)) {
      return;
    }

    let successCount = 0;
    let skipCount = 0;

    surplusItems.forEach((item) => {
      const existing = getAssetByCode(item.assetCode);
      if (!existing) {
        handleInventorySurplus(
          {
            code: item.assetCode,
            name: item.assetName,
            location: item.location,
            responsiblePerson: item.responsiblePerson,
          },
          activeTask.name
        );
        successCount++;
      } else {
        skipCount++;
      }
    });

    alert(`同步完成：成功 ${successCount} 件，跳过 ${skipCount} 件（资产编号已存在）`);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">盘点任务</h1>
          <p className="text-sm text-slate-500 mt-1">创建和管理资产盘点任务</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          新建盘点
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 盘点任务列表 */}
        <div className="col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="font-medium text-slate-900">盘点任务</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {tasks.map((task) => {
              const progress = getCardProgress(task);
              return (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    activeTaskId === task.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 truncate">{task.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        {task.createDate} · {task.range}
                      </p>
                    </div>
                    <StatusTag status={task.status} type="inventory" size="sm" />
                  </div>
                  {task.status !== 'pending' && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>
                          进度 {progress.count}/{progress.total}
                        </span>
                        <span>{progress.percent}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {tasks.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                暂无盘点任务
              </div>
            )}
          </div>
        </div>

        {/* 盘点详情 */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {activeTask ? (
            <>
              {/* 任务信息头 */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{activeTask.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      创建人：{activeTask.creator} · 计划日期：{activeTask.planDate}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusTag status={activeTask.status} type="inventory" />
                    {activeTask.status === 'pending' && (
                      <Button size="sm" onClick={() => handleStartTask(activeTask.id)}>
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        开始盘点
                      </Button>
                    )}
                    {activeTask.status === 'ongoing' && (
                      <Button size="sm" onClick={() => handleCompleteTask(activeTask.id)}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                        完成盘点
                      </Button>
                    )}
                  </div>
                </div>

                {/* 统计卡片 */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-2xl font-bold text-slate-900">{taskItems.length}</div>
                    <div className="text-xs text-slate-500 mt-1">资产总数</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-2xl font-bold text-green-600">
                      {getStatusCount('normal')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">账实相符</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-2xl font-bold text-purple-600">
                      {getStatusCount('surplus')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">盘盈</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-slate-200">
                    <div className="text-2xl font-bold text-red-600">
                      {getStatusCount('deficit')}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">盘亏</div>
                  </div>
                </div>
              </div>

              {/* 筛选和操作 */}
              {activeTask.status !== 'pending' && (
                <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'list'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        列表视图
                      </button>
                      <button
                        onClick={() => setViewMode('summary')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'summary'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        差异汇总
                      </button>
                      <button
                        onClick={() => setViewMode('report')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                          viewMode === 'report'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        任务报告
                      </button>
                    </div>

                    {viewMode === 'list' && (
                      <div className="flex items-center gap-2">
                        {(['all', 'unchecked', 'normal', 'surplus', 'deficit'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => setItemFilter(status)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              itemFilter === status
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {status === 'all' ? '全部' : InventoryItemStatusMap[status]}
                            {status !== 'all' && (
                              <span className="ml-1 text-xs">
                                ({getStatusCount(status)})
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {viewMode === 'list' && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="搜索资产..."
                          className="w-48 pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                    {activeTask.status === 'ongoing' && viewMode === 'list' && (
                      <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        批量导入
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={handleExportInventory}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      导出盘点表
                    </Button>
                  </div>
                </div>
              )}

              {/* 盘点清单 */}
              {activeTask.status !== 'pending' ? (
                viewMode === 'list' ? (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-50">
                        <tr className="border-b border-slate-200">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                            资产编号
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                            资产名称
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                            存放地点
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                            责任人
                          </th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                            盘点状态
                          </th>
                          {activeTask.status === 'ongoing' && (
                            <th className="text-right px-6 py-3 text-xs font-semibold text-slate-600 uppercase">
                              操作
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3">
                              <span className="font-mono text-sm text-slate-700">
                                {item.assetCode}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-medium text-slate-900">
                              {item.assetName}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-600">
                              {item.location || '-'}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-600">
                              {item.responsiblePerson || '-'}
                            </td>
                            <td className="px-6 py-3">
                              <StatusTag status={item.status} type="inventoryItem" size="sm" />
                            </td>
                            {activeTask.status === 'ongoing' && (
                              <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'normal')}
                                    className={`p-1.5 rounded transition-colors ${
                                      item.status === 'normal'
                                        ? 'bg-green-100 text-green-600'
                                        : 'text-slate-400 hover:bg-green-50 hover:text-green-600'
                                    }`}
                                    title="正常"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'surplus')}
                                    className={`p-1.5 rounded transition-colors ${
                                      item.status === 'surplus'
                                        ? 'bg-purple-100 text-purple-600'
                                        : 'text-slate-400 hover:bg-purple-50 hover:text-purple-600'
                                    }`}
                                    title="盘盈"
                                  >
                                    <TrendingUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => updateItemStatus(item.id, 'deficit')}
                                    className={`p-1.5 rounded transition-colors ${
                                      item.status === 'deficit'
                                        ? 'bg-red-100 text-red-600'
                                        : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                                    }`}
                                    title="盘亏"
                                  >
                                    <TrendingDown className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {filteredItems.length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        暂无盘点数据
                      </div>
                    )}
                  </div>
                ) : viewMode === 'summary' ? (
                  <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
                    {/* 搜索筛选 */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={summarySearch}
                          onChange={(e) => setSummarySearch(e.target.value)}
                          placeholder="按资产编号或责任人筛选..."
                          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSyncSurplus}
                        disabled={getStatusCount('surplus') === 0}
                      >
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                        盘盈转待建档
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={handleSyncDeficit}
                        disabled={getStatusCount('deficit') === 0}
                      >
                        <TrendingDown className="w-3.5 h-3.5 mr-1.5" />
                        盘亏转待处理
                      </Button>
                    </div>

                    {/* 账实相符 */}
                    <div className="border border-green-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedGroups({ ...expandedGroups, normal: !expandedGroups.normal })
                        }
                        className="w-full px-4 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between hover:bg-green-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="font-medium text-green-800">账实相符</span>
                          <span className="text-sm text-green-700 font-medium">
                            {getStatusCount('normal')} 件
                          </span>
                        </div>
                        {expandedGroups.normal ? (
                          <ChevronUp className="w-4 h-4 text-green-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-green-600" />
                        )}
                      </button>
                      {expandedGroups.normal && (
                        <div className="max-h-60 overflow-y-auto">
                          {taskItems
                            .filter(
                              (i) =>
                                i.status === 'normal' &&
                                (summarySearch
                                  ? i.assetCode
                                      .toLowerCase()
                                      .includes(summarySearch.toLowerCase()) ||
                                    i.responsiblePerson
                                      ?.toLowerCase()
                                      .includes(summarySearch.toLowerCase())
                                  : true)
                            )
                            .length > 0 ? (
                            <div className="divide-y divide-green-100">
                              {taskItems
                                .filter(
                                  (i) =>
                                    i.status === 'normal' &&
                                    (summarySearch
                                      ? i.assetCode
                                          .toLowerCase()
                                          .includes(summarySearch.toLowerCase()) ||
                                        i.responsiblePerson
                                          ?.toLowerCase()
                                          .includes(summarySearch.toLowerCase())
                                      : true)
                                )
                                .map((item) => (
                                  <div
                                    key={item.id}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-green-50/50"
                                  >
                                    <div>
                                      <span className="font-mono text-sm text-slate-700">
                                        {item.assetCode}
                                      </span>
                                      <span className="text-sm text-slate-900 ml-3">
                                        {item.assetName}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.responsiblePerson || '-'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-green-600/60">
                              {summarySearch ? '没有匹配的资产' : '暂无账实相符资产'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 盘盈 */}
                    <div className="border border-purple-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedGroups({
                            ...expandedGroups,
                            surplus: !expandedGroups.surplus,
                          })
                        }
                        className="w-full px-4 py-3 bg-purple-50 border-b border-purple-200 flex items-center justify-between hover:bg-purple-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500" />
                          <span className="font-medium text-purple-800">盘盈资产</span>
                          <span className="text-sm text-purple-700 font-medium">
                            {getStatusCount('surplus')} 件
                          </span>
                        </div>
                        {expandedGroups.surplus ? (
                          <ChevronUp className="w-4 h-4 text-purple-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-purple-600" />
                        )}
                      </button>
                      {expandedGroups.surplus && (
                        <div className="max-h-60 overflow-y-auto">
                          {taskItems
                            .filter(
                              (i) =>
                                i.status === 'surplus' &&
                                (summarySearch
                                  ? i.assetCode
                                      .toLowerCase()
                                      .includes(summarySearch.toLowerCase()) ||
                                    i.responsiblePerson
                                      ?.toLowerCase()
                                      .includes(summarySearch.toLowerCase())
                                  : true)
                            )
                            .length > 0 ? (
                            <div className="divide-y divide-purple-100">
                              {taskItems
                                .filter(
                                  (i) =>
                                    i.status === 'surplus' &&
                                    (summarySearch
                                      ? i.assetCode
                                          .toLowerCase()
                                          .includes(summarySearch.toLowerCase()) ||
                                        i.responsiblePerson
                                          ?.toLowerCase()
                                          .includes(summarySearch.toLowerCase())
                                      : true)
                                )
                                .map((item) => (
                                  <div
                                    key={item.id}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-purple-50/50"
                                  >
                                    <div>
                                      <span className="font-mono text-sm text-slate-700">
                                        {item.assetCode}
                                      </span>
                                      <span className="text-sm text-slate-900 ml-3">
                                        {item.assetName}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.location || '-'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-purple-600/60">
                              {summarySearch ? '没有匹配的资产' : '暂无盘盈资产'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 盘亏 */}
                    <div className="border border-red-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() =>
                          setExpandedGroups({
                            ...expandedGroups,
                            deficit: !expandedGroups.deficit,
                          })
                        }
                        className="w-full px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between hover:bg-red-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="font-medium text-red-800">盘亏资产</span>
                          <span className="text-sm text-red-700 font-medium">
                            {getStatusCount('deficit')} 件
                          </span>
                        </div>
                        {expandedGroups.deficit ? (
                          <ChevronUp className="w-4 h-4 text-red-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-red-600" />
                        )}
                      </button>
                      {expandedGroups.deficit && (
                        <div className="max-h-60 overflow-y-auto">
                          {taskItems
                            .filter(
                              (i) =>
                                i.status === 'deficit' &&
                                (summarySearch
                                  ? i.assetCode
                                      .toLowerCase()
                                      .includes(summarySearch.toLowerCase()) ||
                                    i.responsiblePerson
                                      ?.toLowerCase()
                                      .includes(summarySearch.toLowerCase())
                                  : true)
                            )
                            .length > 0 ? (
                            <div className="divide-y divide-red-100">
                              {taskItems
                                .filter(
                                  (i) =>
                                    i.status === 'deficit' &&
                                    (summarySearch
                                      ? i.assetCode
                                          .toLowerCase()
                                          .includes(summarySearch.toLowerCase()) ||
                                        i.responsiblePerson
                                          ?.toLowerCase()
                                          .includes(summarySearch.toLowerCase())
                                      : true)
                                )
                                .map((item) => (
                                  <div
                                    key={item.id}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-red-50/50"
                                  >
                                    <div>
                                      <span className="font-mono text-sm text-slate-700">
                                        {item.assetCode}
                                      </span>
                                      <span className="text-sm text-slate-900 ml-3">
                                        {item.assetName}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.responsiblePerson || '-'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="px-4 py-6 text-center text-sm text-red-600/60">
                              {summarySearch ? '没有匹配的资产' : '暂无盘亏资产'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 未盘点 */}
                    {getStatusCount('unchecked') > 0 && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() =>
                            setExpandedGroups({
                              ...expandedGroups,
                              unchecked: !expandedGroups.unchecked,
                            })
                          }
                          className="w-full px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-400" />
                            <span className="font-medium text-slate-700">未盘点</span>
                            <span className="text-sm text-slate-600 font-medium">
                              {getStatusCount('unchecked')} 件
                            </span>
                          </div>
                          {expandedGroups.unchecked ? (
                            <ChevronUp className="w-4 h-4 text-slate-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                        {expandedGroups.unchecked && (
                          <div className="max-h-60 overflow-y-auto">
                            <div className="divide-y divide-slate-100">
                              {taskItems
                                .filter(
                                  (i) =>
                                    i.status === 'unchecked' &&
                                    (summarySearch
                                      ? i.assetCode
                                          .toLowerCase()
                                          .includes(summarySearch.toLowerCase()) ||
                                        i.responsiblePerson
                                          ?.toLowerCase()
                                          .includes(summarySearch.toLowerCase())
                                      : true)
                                )
                                .map((item) => (
                                  <div
                                    key={item.id}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50"
                                  >
                                    <div>
                                      <span className="font-mono text-sm text-slate-700">
                                        {item.assetCode}
                                      </span>
                                      <span className="text-sm text-slate-900 ml-3">
                                        {item.assetName}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.responsiblePerson || '-'}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 max-h-[400px] overflow-y-auto">
                    {/* 任务报告 */}
                    <div className="space-y-6">
                      {/* 任务基本信息 */}
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold">{activeTask.name}</h3>
                            <p className="text-blue-100 text-sm mt-1">
                              盘点任务报告
                            </p>
                          </div>
                          <FileText className="w-12 h-12 text-blue-200" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-blue-400/30">
                          <div>
                            <p className="text-blue-200 text-xs">盘点范围</p>
                            <p className="font-medium mt-0.5">{activeTask.range}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-xs">创建人</p>
                            <p className="font-medium mt-0.5">{activeTask.creator}</p>
                          </div>
                          <div>
                            <p className="text-blue-200 text-xs">计划日期</p>
                            <p className="font-medium mt-0.5">{activeTask.planDate}</p>
                          </div>
                        </div>
                      </div>

                      {/* 关键指标 */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                          <Target className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-slate-900">
                            {taskItems.length}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">应盘点数</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-green-600">
                            {taskItems.length - getStatusCount('unchecked')}
                          </div>
                          <div className="text-xs text-green-600 mt-1">已盘点</div>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                          <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-blue-600">
                            {taskItems.length > 0
                              ? Math.round(
                                  ((taskItems.length - getStatusCount('unchecked')) /
                                    taskItems.length) *
                                    100
                                )
                              : 0}
                            %
                          </div>
                          <div className="text-xs text-blue-600 mt-1">完成率</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-200">
                          <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                          <div className="text-2xl font-bold text-amber-600">
                            {getStatusCount('surplus') + getStatusCount('deficit')}
                          </div>
                          <div className="text-xs text-amber-600 mt-1">差异数</div>
                        </div>
                      </div>

                      {/* 差异详情 */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="font-medium text-slate-700">差异汇总</span>
                          <Button size="sm" variant="secondary" onClick={handleExportInventory}>
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            导出明细
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-200">
                          <div className="p-4 text-center">
                            <div className="text-3xl font-bold text-green-600">
                              {getStatusCount('normal')}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">账实相符</div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {taskItems.length > 0
                                ? Math.round(
                                    (getStatusCount('normal') / taskItems.length) * 100
                                  )
                                : 0}
                              %
                            </div>
                          </div>
                          <div className="p-4 text-center">
                            <div className="text-3xl font-bold text-purple-600">
                              {getStatusCount('surplus')}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">盘盈</div>
                            <div className="text-xs text-purple-500 mt-0.5">
                              需待建档
                            </div>
                          </div>
                          <div className="p-4 text-center">
                            <div className="text-3xl font-bold text-red-600">
                              {getStatusCount('deficit')}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">盘亏</div>
                            <div className="text-xs text-red-500 mt-0.5">
                              需待处理
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 未盘点明细 */}
                      {getStatusCount('unchecked') > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <span className="font-medium text-slate-700">
                              未盘点明细（{getStatusCount('unchecked')} 件）
                            </span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            <div className="divide-y divide-slate-100">
                              {taskItems
                                .filter((i) => i.status === 'unchecked')
                                .slice(0, 10)
                                .map((item) => (
                                  <div
                                    key={item.id}
                                    className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50"
                                  >
                                    <div>
                                      <span className="font-mono text-sm text-slate-700">
                                        {item.assetCode}
                                      </span>
                                      <span className="text-sm text-slate-900 ml-3">
                                        {item.assetName}
                                      </span>
                                    </div>
                                    <span className="text-xs text-slate-500">
                                      {item.responsiblePerson || '-'}
                                    </span>
                                  </div>
                                ))}
                              {getStatusCount('unchecked') > 10 && (
                                <div className="px-4 py-2 text-center text-xs text-slate-400">
                                  还有 {getStatusCount('unchecked') - 10} 件未盘点...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 执行人信息 */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-slate-500" />
                          <div>
                            <p className="text-sm font-medium text-slate-700">
                              盘点负责人：{activeTask.creator}
                            </p>
                            <p className="text-xs text-slate-500">
                              创建时间：{activeTask.createDate}
                            </p>
                          </div>
                        </div>
                        <StatusTag status={activeTask.status} type="inventory" />
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center py-16">
                  <ClipboardList className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">盘点任务尚未开始</p>
                  <Button onClick={() => handleStartTask(activeTask.id)}>
                    <Play className="w-4 h-4 mr-2" />
                    开始盘点
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-24">
              <ClipboardList className="w-20 h-20 text-slate-300 mb-4" />
              <p className="text-slate-500">请选择盘点任务查看详情</p>
            </div>
          )}
        </div>
      </div>

      {/* 新建盘点弹窗 */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="新建盘点任务"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taskForm.name}
              onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="请输入任务名称"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              盘点范围
            </label>
            <select
              value={taskForm.range}
              onChange={(e) => setTaskForm({ ...taskForm, range: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="全公司">全公司</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              计划日期
            </label>
            <input
              type="date"
              value={taskForm.planDate}
              onChange={(e) => setTaskForm({ ...taskForm, planDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              取消
            </Button>
            <Button type="submit">创建任务</Button>
          </div>
        </form>
      </Modal>

      {/* 批量导入弹窗 */}
      <Modal
        isOpen={showImport}
        onClose={() => {
          setShowImport(false);
          setImportPreview([]);
          setImportFileName('');
          setImportStep('upload');
          setImportValidation(null);
        }}
        title={importStep === 'upload' ? '批量导入盘点清单' : '导入结果确认'}
        size="lg"
      >
        {importStep === 'upload' ? (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              <FileUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">
                点击上传或拖拽文件到此处
              </p>
              <p className="text-xs text-slate-500 mt-1">
                支持 Excel (.xlsx, .xls) 和 CSV 格式
              </p>
              {importFileName && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                  {importFileName}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImportPreview([]);
                      setImportFileName('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {importPreview.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    数据预览（共 {importPreview.length} 条）
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 w-1/2">
                          资产编号
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600">
                          资产名称
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.slice(0, 20).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-mono text-slate-700">
                            {item.code || '-'}
                          </td>
                          <td className="px-4 py-2 text-slate-700">
                            {item.name || '-'}
                          </td>
                        </tr>
                      ))}
                      {importPreview.length > 20 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-2 text-center text-slate-400 text-xs"
                          >
                            ...还有 {importPreview.length - 20} 条
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600 mb-2">导入说明：</p>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li>文件需包含「资产编号」和「资产名称」两列（支持中文/英文表头）</li>
                <li>导入的资产将作为盘盈资产添加到当前盘点任务</li>
                <li>系统将自动校验重复编号、空编号和已存在的资产</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowImport(false);
                  setImportPreview([]);
                  setImportFileName('');
                }}
              >
                取消
              </Button>
              <Button
                onClick={validateImport}
                disabled={importPreview.length === 0}
              >
                下一步：校验数据
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 校验结果摘要 */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importValidation?.valid.length || 0}
                </div>
                <div className="text-xs text-green-600 mt-1">可导入</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-amber-600">
                  {importValidation?.duplicateInFile.length || 0}
                </div>
                <div className="text-xs text-amber-600 mt-1">文件内重复</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {importValidation?.emptyCode.length || 0}
                </div>
                <div className="text-xs text-red-600 mt-1">空编号</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-slate-600">
                  {importValidation?.alreadyExists.length || 0}
                </div>
                <div className="text-xs text-slate-600 mt-1">已存在</div>
              </div>
            </div>

            {/* 可导入数据列表 */}
            {importValidation && importValidation.valid.length > 0 && (
              <div className="border border-green-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-green-50 border-b border-green-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700">
                    可导入数据（{importValidation.valid.length} 条）
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-green-50/80">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-green-700 w-1/2">
                          资产编号
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-semibold text-green-700">
                          资产名称
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-green-100">
                      {importValidation.valid.slice(0, 10).map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-mono text-green-700">
                            {item.code}
                          </td>
                          <td className="px-4 py-2 text-green-700">{item.name}</td>
                        </tr>
                      ))}
                      {importValidation.valid.length > 10 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-4 py-2 text-center text-green-500 text-xs"
                          >
                            ...还有 {importValidation.valid.length - 10} 条
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 跳过的明细 */}
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {importValidation && importValidation.duplicateInFile.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-700 mb-1">
                    文件内重复（跳过 {importValidation.duplicateInFile.length} 条）
                  </p>
                  <p className="text-xs text-amber-600">
                    重复编号：
                    {[...new Set(importValidation.duplicateInFile.map((i) => i.code))]
                      .slice(0, 5)
                      .join('、')}
                    {importValidation.duplicateInFile.length > 5 && '...'}
                  </p>
                </div>
              )}

              {importValidation && importValidation.emptyCode.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-red-700 mb-1">
                    空编号（跳过 {importValidation.emptyCode.length} 条）
                  </p>
                  <p className="text-xs text-red-600">
                    这些记录没有资产编号，无法导入
                  </p>
                </div>
              )}

              {importValidation && importValidation.alreadyExists.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    已存在于当前任务（跳过 {importValidation.alreadyExists.length} 条）
                  </p>
                  <p className="text-xs text-slate-600">
                    已存在编号：
                    {importValidation.alreadyExists
                      .slice(0, 5)
                      .map((i) => i.code)
                      .join('、')}
                    {importValidation.alreadyExists.length > 5 && '...'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={() => setImportStep('upload')}
                size="sm"
              >
                ← 返回上传
              </Button>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowImport(false);
                    setImportPreview([]);
                    setImportFileName('');
                    setImportStep('upload');
                    setImportValidation(null);
                  }}
                >
                  取消
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={!importValidation || importValidation.valid.length === 0}
                >
                  确认导入 ({importValidation?.valid.length || 0}条)
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
