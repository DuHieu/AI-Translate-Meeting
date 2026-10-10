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
      className={`flex items-center text-xs text-zinc-500 dark:text-zinc-400 ${className}`}
    >
      <ol className="flex items-center gap-1.5 flex-wrap list-none p-0 m-0">
        <li className="flex items-center">
          <Link
            to={homeHref}
            className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 py-1"
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
              <li aria-hidden="true" className="flex items-center">
                <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700 shrink-0" />
              </li>
              <li className="flex items-center">
                {isLast || !item.href ? (
                  <span
                    aria-current="page"
                    className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100 py-1 truncate max-w-[240px] sm:max-w-none"
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />}
                    <span>{item.label}</span>
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors duration-150 py-1"
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
