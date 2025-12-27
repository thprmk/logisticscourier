'use client';

import { CheckCircle2, Truck, XCircle, Package, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: React.ReactNode;
  pill?: string;
}

const notificationConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; accentColor: string; darkBgColor: string; darkColor: string; darkAccentColor: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    accentColor: 'text-green-600',
    darkBgColor: 'dark:bg-green-900/20',
    darkColor: 'dark:text-green-400',
    darkAccentColor: 'dark:text-green-400',
  },
  warning: {
    icon: <Truck className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    accentColor: 'text-amber-600',
    darkBgColor: 'dark:bg-amber-900/20',
    darkColor: 'dark:text-amber-400',
    darkAccentColor: 'dark:text-amber-400',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'text-red-600',
    darkBgColor: 'dark:bg-red-900/20',
    darkColor: 'dark:text-red-400',
    darkAccentColor: 'dark:text-red-400',
  },
  info: {
    icon: <Package className="w-5 h-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    accentColor: 'text-slate-600',
    darkBgColor: 'dark:bg-slate-800/30',
    darkColor: 'dark:text-slate-400',
    darkAccentColor: 'dark:text-slate-400',
  },
};

export default function NotificationItem({
  id,
  type,
  title,
  message,
  timestamp,
  read,
  icon,
  pill,
}: NotificationItemProps) {
  const [isHovering, setIsHovering] = useState(false);
  const config = notificationConfig[type];

  return (
    <div
      className={`relative p-3 rounded-lg transition-all hover:bg-gray-50 dark:hover:bg-[#2A2A2A] ${!read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Content wrapper */}
      <div className="flex gap-3">
        {/* Icon circle */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.bgColor} ${config.darkBgColor} flex items-center justify-center ${config.color} ${config.darkColor}`}>
          {icon || config.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title with pill */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold text-gray-900 dark:text-white`}>
              {title}
            </h4>
            {pill && (
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${config.bgColor} ${config.darkBgColor} ${config.accentColor} ${config.darkAccentColor}`}>
                {pill}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 dark:text-[#A3A3A3] line-clamp-2 mb-1">
            {message}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-gray-400 dark:text-[#A3A3A3]">
            {timestamp}
          </p>
        </div>
      </div>
    </div>
  );
}
