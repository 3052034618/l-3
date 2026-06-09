export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const dateStr = formatDate(d);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateStr} ${hours}:${minutes}`;
};

export const formatCurrency = (value: number): string => {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generateId = (prefix = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
};

export const generateAssetCode = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AST-${year}-${random}`;
};

export const isOverdue = (expectedReturnDate: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expected = new Date(expectedReturnDate);
  expected.setHours(0, 0, 0, 0);
  return expected < today;
};

export const daysUntil = (date: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const calculateDepreciation = (
  purchasePrice: number,
  purchaseDate: string,
  years: number
): { currentValue: number; depreciationRate: number } => {
  const purchase = new Date(purchaseDate);
  const now = new Date();
  const monthsUsed = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
  const totalMonths = years * 12;
  
  if (monthsUsed >= totalMonths) {
    return { currentValue: 0, depreciationRate: 100 };
  }
  
  const monthlyRate = 100 / totalMonths;
  const depreciationRate = Math.min(monthsUsed * monthlyRate, 100);
  const currentValue = Math.round(purchasePrice * (1 - depreciationRate / 100));
  
  return { currentValue, depreciationRate: Math.round(depreciationRate * 100) / 100 };
};

export const downloadFile = (content: string, filename: string, type: string): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header] ?? '');
          return value.includes(',') ? `"${value}"` : value;
        })
        .join(',')
    ),
  ].join('\n');
  
  downloadFile('\uFEFF' + csvContent, filename, 'text/csv;charset=utf-8');
};
