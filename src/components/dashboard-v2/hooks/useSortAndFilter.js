import { useMemo } from 'react';

/**
 * Hook for Sorting and Filtering Files/Folders
 */
export const useSortAndFilter = (files, folders, sortConfig, filterQuery) => {
  const processedData = useMemo(() => {
    let resultFiles = [...files];
    let resultFolders = [...folders];

    // 1. Filtering
    if (filterQuery) {
      const lowerQuery = filterQuery.toLowerCase();
      resultFiles = resultFiles.filter(f =>
        f.filename.toLowerCase().includes(lowerQuery)
      );
      resultFolders = resultFolders.filter(f =>
        f.name.toLowerCase().includes(lowerQuery)
      );
    }

    // 2. Sorting
    const { field, direction } = sortConfig;
    const modifier = direction === 'asc' ? 1 : -1;

    const sortFn = (a, b) => {
      let valA, valB;

      switch (field) {
        case 'name':
          valA = a.filename || a.name; // Handle file vs folder
          valB = b.filename || b.name;
          return valA.localeCompare(valB) * modifier;

        case 'size':
          valA = a.size || 0; // Folders might not have size immediately
          valB = b.size || 0;
          return (valA - valB) * modifier;

        case 'date':
          valA = new Date(a.uploadDate || a.createdAt).getTime();
          valB = new Date(b.uploadDate || b.createdAt).getTime();
          return (valA - valB) * modifier;

        case 'type':
          valA = a.contentType || 'folder';
          valB = b.contentType || 'folder';
          return valA.localeCompare(valB) * modifier;

        default:
          return 0;
      }
    };

    resultFiles.sort(sortFn);
    resultFolders.sort(sortFn);

    return {
      sortedFiles: resultFiles,
      sortedFolders: resultFolders,
      allItems: [...resultFolders, ...resultFiles] // Folders usually first
    };
  }, [files, folders, sortConfig, filterQuery]);

  return processedData;
};
