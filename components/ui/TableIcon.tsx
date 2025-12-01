import * as React from 'react';

interface TableIconProps {
  className?: string;
}

const TableIcon: React.FC<TableIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="currentColor"
      viewBox="0 0 24 24" 
      stroke="none"
      className={className}
    >
      <path d="M20,2H4C2.9,2,2,2.9,2,4v16c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V4C22,2.9,21.1,2,20,2z M8,20H4v-4h4V20z M8,14H4v-4h4V14z M8,8H4V4h4V8z M14,20h-4v-4h4V20z M14,14h-4v-4h4V14z M14,8h-4V4h4V8z M20,20h-4v-4h4V20z M20,14h-4v-4h4V14z M20,8h-4V4h4V8z" />
    </svg>
  );
};

export default TableIcon;