import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useAssetStore } from '@/store/assetStore';
import { Button } from '@/components/Button';
import { Printer, Download, Loader2 } from 'lucide-react';

interface QRCodeModalProps {
  assetId: string;
}

export default function QRCodeModal({ assetId }: QRCodeModalProps) {
  const { getAssetById } = useAssetStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const asset = getAssetById(assetId);

  useEffect(() => {
    if (asset) {
      setLoading(true);
      const qrData = JSON.stringify({
        id: asset.id,
        code: asset.code,
        name: asset.name,
        category: asset.category,
        location: asset.location,
        responsiblePerson: asset.responsiblePerson,
      });

      QRCode.toDataURL(
        qrData,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        },
        (err, url) => {
          if (!err) {
            setQrDataUrl(url);
          }
          setLoading(false);
        }
      );
    }
  }, [asset]);

  if (!asset) {
    return <div className="text-center py-8 text-slate-500">资产不存在</div>;
  }

  const handleDownload = () => {
    if (!qrDataUrl) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 500;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 72, 40, 256, 256);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(asset.code, 200, 340);

      ctx.font = '18px sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(asset.name, 200, 380);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`地点: ${asset.location}`, 200, 420);
      ctx.fillText(`责任人: ${asset.responsiblePerson}`, 200, 450);

      const downloadUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `资产码_${asset.code}.png`;
      link.click();
    };
    img.src = qrDataUrl;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>资产码 - ${asset.code}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
              padding: 20px;
            }
            .label {
              border: 2px solid #333;
              border-radius: 12px;
              padding: 30px;
              text-align: center;
              width: 320px;
            }
            .qr-code {
              width: 220px;
              height: 220px;
              margin: 0 auto 20px;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .code {
              font-size: 24px;
              font-weight: bold;
              font-family: monospace;
              color: #111;
              margin-bottom: 8px;
              word-break: break-all;
            }
            .name {
              font-size: 18px;
              color: #333;
              margin-bottom: 12px;
            }
            .info {
              font-size: 14px;
              color: #666;
              line-height: 1.6;
              border-top: 1px dashed #ccc;
              padding-top: 12px;
              margin-top: 12px;
            }
            @media print {
              body { padding: 0; }
              .label { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="qr-code">
              <img src="${qrDataUrl}" alt="资产二维码" />
            </div>
            <div class="code">${asset.code}</div>
            <div class="name">${asset.name}</div>
            <div class="info">
              <div>地点：${asset.location}</div>
              <div>责任人：${asset.responsiblePerson}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center">
        <div className="w-52 h-52 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white mb-4 p-2 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
              <span className="text-sm text-slate-500">生成中...</span>
            </div>
          ) : (
            <img
              src={qrDataUrl}
              alt="资产二维码"
              className="w-full h-full object-contain"
            />
          )}
        </div>

        <div className="text-center">
          <p className="font-mono text-lg font-semibold text-slate-800">{asset.code}</p>
          <p className="text-base text-slate-600 mt-1">{asset.name}</p>
          <p className="text-sm text-slate-400 mt-1">{asset.location} · {asset.responsiblePerson}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500 mb-1">扫码可读取：</p>
        <code className="text-xs text-slate-600 break-all">
          资产编号、名称、类别、位置、责任人
        </code>
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button variant="secondary" onClick={handlePrint} disabled={loading}>
          <Printer className="w-4 h-4 mr-2" />
          打印标签
        </Button>
        <Button onClick={handleDownload} disabled={loading}>
          <Download className="w-4 h-4 mr-2" />
          下载二维码
        </Button>
      </div>
    </div>
  );
}
