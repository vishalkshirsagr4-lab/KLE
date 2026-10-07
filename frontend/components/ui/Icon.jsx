'use client';

const PATHS = {
  arrowRight: 'M4 12h15m-6-6 6 6-6 6',
  arrowUpRight: 'M5 19 19 5m0 0H9m10 0v10',
  check: 'm5 12 4 4L19 6',
  chevronDown: 'm6 9 6 6 6-6',
  clock: 'M12 7v5l3 2m7-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  grid: 'M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z',
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  spark: 'm12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m6-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5.5-5.7a2.5 2.5 0 0 1 0 4.8M19.5 20v-1.2a3.1 3.1 0 0 0-2.2-3',
  x: 'M5 5l14 14M19 5 5 19'
};

export default function Icon({ name = 'spark', size = 18, strokeWidth = 1.7, className = '' }) {
  const path = PATHS[name] || PATHS.spark;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {path.split(' M').map((segment, index) => (
        <path key={index} d={`${index ? 'M' : ''}${segment}`} />
      ))}
    </svg>
  );
}
