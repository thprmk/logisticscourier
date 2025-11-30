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

const notificationConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; accentColor: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    accentColor: 'text-green-600',
  },
  warning: {
    icon: <Truck className="w-5 h-5" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    accentColor: 'text-amber-600',
  },
  error: {
    icon: <XCircle className="w-5 h-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'text-red-600',
  },
  info: {
    icon: <Package className="w-5 h-5" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    accentColor: 'text-slate-600',
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
      className={`relative p-3 rounded-lg transition-all`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Content wrapper */}
      <div className="flex gap-3">
        {/* Icon circle */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${config.bgColor} flex items-center justify-center ${config.color}`}>
          {icon || config.icon}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Title with pill */}
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold text-gray-900`}>
              {title}
            </h4>
            {pill && (
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${config.bgColor} ${config.accentColor}`}>
                {pill}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 line-clamp-2 mb-1">
            {message}
          </p>

          {/* Timestamp */}
          <p className="text-xs text-gray-400">
            {timestamp}
          </p>
        </div>
      </div>
    </div>
  );
}
