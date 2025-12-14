import { useState, useMemo } from 'react';

export const useFileManager = (initialFiles = [], initialSortBy = 'date', initialSortOrder = 'desc') => {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState('list'); // 'list' | 'grid'

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc'); // Default to asc for new column
    }
  };

  const processedFiles = useMemo(() => {
    let files = [...initialFiles];

    // 1. Filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      files = files.filter(f =>
        f.filename.toLowerCase().includes(query)
      );
    }

    // 2. Sort
    files.sort((a, b) => {
      let valA, valB;

      switch (sortBy) {
        case 'name':
          valA = a.filename.toLowerCase();
          valB = b.filename.toLowerCase();
          break;
        case 'size':
          valA = a.length;
          valB = b.length;
          break;
        case 'type':
          valA = a.contentType || '';
          valB = b.contentType || '';
          break;
        case 'date':
        default:
          valA = new Date(a.uploadDate).getTime();
          valB = new Date(b.uploadDate).getTime();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return files;
  }, [initialFiles, sortBy, sortOrder, searchQuery]);

  // 3. Pagination
  const totalPages = Math.ceil(processedFiles.length / itemsPerPage);
  const paginatedFiles = processedFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return {
    files: paginatedFiles,
    totalFiles: processedFiles.length,
    sortBy,
    sortOrder,
    toggleSort,
    searchQuery,
    setSearchQuery,
    viewType,
    setViewType,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages
  };
};
