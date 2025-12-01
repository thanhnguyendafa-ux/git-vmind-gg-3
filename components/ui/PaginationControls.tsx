import * as React from 'react';
import Icon from './Icon';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  rowsPerPage: number;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalRows,
  rowsPerPage,
}) => {
  if (totalPages <= 1) {
    return null;
  }

  const startIndex = (currentPage - 1) * rowsPerPage + 1;
  const endIndex = Math.min(startIndex + rowsPerPage - 1, totalRows);

  return (
    <div className="flex items-center justify-between mt-4 text-sm text-text-subtle">
      <div>
        <span>
          Showing {startIndex}-{endIndex} of {totalRows} rows
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <Icon name="arrowLeft" className="w-5 h-5" />
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md hover:bg-secondary-200 dark:hover:bg-secondary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <Icon name="arrowRight" className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
