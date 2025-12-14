import { useState, useCallback, useMemo } from 'react';
import { useFileContext } from '../context/FileContext';

/**
 * Hook for managing multi-selection logic
 */
export const useSelection = (items) => {
  const { selectedIds: globalSelectedIds, setSelection } = useFileContext();
  const [lastSelectedId, setLastSelectedId] = useState(null);

  // We rely on the global context to store selection, but we manage logic here
  // Convert array to Set for easy lookup
  const selectedSet = useMemo(() => new Set(globalSelectedIds), [globalSelectedIds]);

  // Clear selection when items context changes significantly (handled by parent effect usually,
  // but here we might want to be careful not to clear if just re-sorting)
  // For now, let's assume parent clears if needed, or we clear on unmount?

  const toggleSelection = useCallback((id, multiSelect = false, rangeSelect = false) => {
    let newSet = new Set(multiSelect ? selectedSet : []);

    if (rangeSelect && lastSelectedId && items.some(i => i._id === lastSelectedId)) {
      // Range selection logic
      const currentIndex = items.findIndex(i => i._id === id);
      const lastIndex = items.findIndex(i => i._id === lastSelectedId);

      const start = Math.min(currentIndex, lastIndex);
      const end = Math.max(currentIndex, lastIndex);

      for (let i = start; i <= end; i++) {
        newSet.add(items[i]._id);
      }
    } else {
      // Normal toggle
      if (multiSelect) {
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
      } else {
        newSet.add(id);
      }
    }

    setLastSelectedId(id);
    setSelection(Array.from(newSet));
  }, [items, lastSelectedId, selectedSet, setSelection]);

  const selectAll = useCallback(() => {
    const allIds = items.map(i => i._id);
    setSelection(allIds);
  }, [items, setSelection]);

  const clearSelection = useCallback(() => {
    setSelection([]);
    setLastSelectedId(null);
  }, [setSelection]);

  const isSelected = useCallback((id) => {
    return selectedSet.has(id);
  }, [selectedSet]);

  return {
    selectedIds: globalSelectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    count: globalSelectedIds.length
  };
};
