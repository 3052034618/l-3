import { useAssetStore } from '@/store/assetStore';
import { Button } from '@/components/Button';
import { QrCode, Printer } from 'lucide-react';

interface QRCodeModalProps {
  assetId: string;
}

export default function QRCodeModal({ assetId }: QRCodeModalProps) {
  const { getAssetById } = useAssetStore();
  const asset = getAssetById(assetId);

  if (!asset) {
    return <div className="text-center py-8 text-slate-500">资产不存在</div>;
  }

  const generateQRCodeData = () => {
    return JSON.stringify({
      code: asset.code,
      name: asset.name,
      id: asset.id,
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>资产码 - ${asset.code}</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
              }
              .label {
                border: 1px solid #ccc;
                padding: 20px;
                display: inline-block;
              }
              .code {
                font-size: 24px;
                font-weight: bold;
                margin: 10px 0;
              }
              .name {
                font-size: 16px;
                color: #666;
              }
              .qr-placeholder {
                width: 150px;
                height: 150px;
                border: 2px dashed #ccc;
                margin: 10px auto;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
              }
            </style>
          </head>
          <body>
            <div class="label">
              <div class="qr-placeholder">二维码</div>
              <div class="code">${asset.code}</div>
              <div class="name">${asset.name}</div>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-48 h-48 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center bg-slate-50 mb-4">
          <div className="text-center">
            <QrCode className="w-16 h-16 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">扫描查看资产信息</p>
          </div>
        </div>

        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-slate-800">{asset.code}</p>
          <p className="text-sm text-slate-500 mt-1">{asset.name}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500 mb-1">数据内容：</p>
        <code className="text-xs text-slate-600 break-all">
          {generateQRCodeData()}
        </code>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          打印标签
        </Button>
        <Button variant="secondary">
          下载二维码
        </Button>
      </div>
    </div>
  );
}
