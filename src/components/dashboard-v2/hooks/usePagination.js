import { useState, useMemo } from 'react';

/**
 * Hook for client-side pagination
 */
export const usePagination = (items, itemsPerPage = 20) => {
  const [currentPage, setCurrentPage] = useState(1);

  const maxPage = Math.ceil(items.length / itemsPerPage) || 1;

  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const goToPage = (page) => {
    const pageNumber = Math.max(1, Math.min(page, maxPage));
    setCurrentPage(pageNumber);
  };

  const nextPage = () => {
    goToPage(currentPage + 1);
  };

  const prevPage = () => {
    goToPage(currentPage - 1);
  };

  return {
    currentPage,
    maxPage,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    itemsPerPage
  };
};
