import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  ClipboardList,
  Plus,
  Play,
  CheckCircle,
  Upload,
  FileUp,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
} from 'lucide-react';
import { useInventoryStore } from '@/store/inventoryStore';
import { StatusTag } from '@/components/StatusTag';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import {
  InventoryItemStatusMap,
  type InventoryItemStatus,
} from '@/types';
import { departments } from '@/data/mockData';
import { formatDate } from '@/utils';

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

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [itemFilter, setItemFilter] = useState<InventoryItemStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [importPreview, setImportPreview] = useState<ImportItem[]>([]);
  const [importFileName, setImportFileName] = useState('');
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

  const getTaskProgress = (taskId: string) => {
    const items = getTaskItems(taskId);
    if (items.length === 0) return { count: 0, total: 0, percent: 0 };
    const checked = items.filter((i) => i.status !== 'unchecked').length;
    return {
      count: checked,
      total: items.length,
      percent: Math.round((checked / items.length) * 100),
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

  const handleConfirmImport = () => {
    if (importPreview.length === 0) {
      alert('没有可导入的数据');
      return;
    }
    if (activeTaskId) {
      importInventory(activeTaskId, importPreview);
      setShowImport(false);
      setImportPreview([]);
      setImportFileName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getStatusCount = (status: InventoryItemStatus) => {
    return taskItems.filter((i) => i.status === status).length;
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
              const progress = getTaskProgress(task.id);
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

                  <div className="flex items-center gap-2">
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
                    {activeTask.status === 'ongoing' && (
                      <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        批量导入
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 盘点清单 */}
              {activeTask.status !== 'pending' ? (
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
        }}
        title="批量导入盘点清单"
        size="lg"
      >
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
                  预览（共 {importPreview.length} 条）
                </span>
                <span className="text-xs text-slate-500">
                  导入后将作为盘盈资产记录
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
              <li>请确保数据格式正确后再导入</li>
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
              onClick={handleConfirmImport}
              disabled={importPreview.length === 0}
            >
              确认导入 ({importPreview.length}条)
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
