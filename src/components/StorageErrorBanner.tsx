/**
 * StorageErrorBanner — 监听 localStorage 写入失败和多标签页数据更新事件，
 * 在顶部显示提示横幅。
 *
 * - bunkdesk:storage-error → 红色横幅 "存储空间不足，数据无法保存"
 * - bunkdesk:state-updated-elsewhere → 蓝色横幅 "数据已在其他标签页更新，点击刷新"
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

export function StorageErrorBanner() {
  const [storageError, setStorageError] = useState(false);
  const [stateUpdatedElsewhere, setStateUpdatedElsewhere] = useState(false);

  useEffect(() => {
    const onStorageError = () => {
      setStorageError(true);
    };
    const onStateUpdated = () => {
      setStateUpdatedElsewhere(true);
    };
    window.addEventListener('bunkdesk:storage-error', onStorageError);
    window.addEventListener('bunkdesk:state-updated-elsewhere', onStateUpdated);
    return () => {
      window.removeEventListener('bunkdesk:storage-error', onStorageError);
      window.removeEventListener('bunkdesk:state-updated-elsewhere', onStateUpdated);
    };
  }, []);

  if (storageError) {
    return (
      <div className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm shadow-lg">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">存储空间不足，数据无法保存。请清理浏览器存储或导出备份后重置数据。</span>
        <button
          onClick={() => setStorageError(false)}
          className="shrink-0 hover:bg-red-700 rounded p-0.5"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (stateUpdatedElsewhere) {
    return (
      <div className="fixed top-0 inset-x-0 z-[100] bg-blue-600 text-white px-4 py-2.5 flex items-center gap-2 text-sm shadow-lg">
        <RefreshCw className="h-4 w-4 shrink-0" />
        <span className="flex-1">数据已在其他标签页更新，建议刷新页面以获取最新数据。</span>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 bg-white/20 hover:bg-white/30 rounded px-3 py-1 text-xs font-medium"
        >
          刷新
        </button>
        <button
          onClick={() => setStateUpdatedElsewhere(false)}
          className="shrink-0 hover:bg-blue-700 rounded p-0.5"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
