import React from 'react';

export function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className={`bg-[#0f1d32] border border-[#1e3557] rounded-xl shadow-lg overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-5 py-4 border-b border-[#1e3557] flex items-center justify-between">
          <div>
            {title && <h3 className="text-base font-semibold text-white tracking-wide">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary';
  className?: string;
}) {
  const styles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-950 text-emerald-300 border-emerald-700',
    warning: 'bg-amber-950 text-amber-300 border-amber-700',
    danger: 'bg-rose-950 text-rose-300 border-rose-700',
    info: 'bg-cyan-950 text-cyan-300 border-cyan-700',
    primary: 'bg-blue-950 text-blue-300 border-blue-700',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className = '',
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: string;
  className?: string;
}) {
  return (
    <div className={`bg-[#0f1d32] border border-[#1e3557] rounded-xl p-4 shadow-sm hover:border-blue-500/50 transition-colors ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {icon && <div className="text-blue-400 p-1.5 rounded-lg bg-blue-950/60 border border-blue-800/40">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {trend && <span className="text-xs font-semibold text-emerald-400">{trend}</span>}
      </div>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
  );
}
