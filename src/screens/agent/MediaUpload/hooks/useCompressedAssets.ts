import { useEffect, useRef, useState } from 'react';
import { PendingAsset } from '../types/mediaUpload.types';
import { compressAllAssets } from '../services/compression.service';

// ─── useCompressedAssets ──────────────────────────────────────────────────────
// Eagerly compresses assets as soon as they are added to the pending list.
// Returns a ref containing the latest compressed results plus a loading flag.
export function useCompressedAssets(pendingAssets: PendingAsset[]) {
  const [isCompressing, setIsCompressing] = useState(false);
  const compressedAssetsRef = useRef<PendingAsset[]>([]);

  useEffect(() => {
    if (pendingAssets.length === 0) {
      compressedAssetsRef.current = [];
      return;
    }

    let cancelled = false;
    setIsCompressing(true);

    compressAllAssets(pendingAssets, () => cancelled).then((results) => {
      if (!cancelled) {
        compressedAssetsRef.current = results;
        setIsCompressing(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pendingAssets]);

  return { isCompressing, compressedAssetsRef };
}
