import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
  current?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  homeHref = '/',
  homeLabel = 'Trang chủ',
  className = '',
}) => {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`inline-flex items-center text-xs text-zinc-500 dark:text-zinc-400 animate-in fade-in slide-in-from-top-1 duration-200 transition-all ${className}`}
    >
      <ol className="inline-flex items-center gap-1.5 flex-wrap list-none p-1 sm:p-1.5 m-0 rounded-xl bg-white/60 dark:bg-[#16171b]/60 backdrop-blur-md border border-zinc-200/60 dark:border-[#272832]/60 shadow-2xs">
        <li className="flex items-center">
          <Link
            to={homeHref}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all duration-150"
          >
            <Home className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <span className="font-medium">{homeLabel}</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.current;
          const Icon = item.icon;

          return (
            <React.Fragment key={`${item.label}-${index}`}>
              <li aria-hidden="true" className="flex items-center text-zinc-300 dark:text-zinc-700">
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </li>
              <li className="flex items-center">
                {isLast || !item.href ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg font-semibold text-zinc-900 dark:text-white bg-zinc-200/60 dark:bg-zinc-800/60 transition-colors truncate max-w-[240px] sm:max-w-none"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
                    <span>{item.label}</span>
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80 transition-all duration-150"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
