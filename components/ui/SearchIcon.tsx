import * as React from 'react';

interface SearchIconProps {
  className?: string;
}

const SearchIcon: React.FC<SearchIconProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      viewBox="0 0 90 90"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="45" cy="45" r="45" fill="rgb(75,174,79)" />
      <path
        d="M 70.414 67.586 L 60.242 57.414 c 7.73 -9.173 7.293 -22.932 -1.342 -31.568 c -9.114 -9.113 -23.942 -9.112 -33.054 0 c -9.113 9.113 -9.113 23.94 0 33.054 c 4.557 4.557 10.542 6.834 16.527 6.834 c 5.358 0 10.708 -1.84 15.041 -5.492 l 10.172 10.172 C 67.977 70.805 68.488 71 69 71 s 1.023 -0.195 1.414 -0.586 C 71.195 69.633 71.195 68.367 70.414 67.586 z M 28.674 56.071 c -7.553 -7.554 -7.553 -19.844 0 -27.397 c 3.777 -3.776 8.738 -5.665 13.699 -5.665 c 4.961 0 9.922 1.888 13.699 5.665 c 7.553 7.554 7.553 19.844 0 27.397 C 48.518 63.623 36.227 63.623 28.674 56.071 z"
        fill="rgb(255,255,255)"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default SearchIcon;
