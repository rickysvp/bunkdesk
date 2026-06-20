/**
 * EmptyState — 可复用的空状态组件
 *
 * 旅行/住宿行业风格：
 * - 大图标 + 温暖配色（品牌青绿）
 * - 标题 + 描述文案
 * - 可选 CTA 按钮
 * - 微动画（淡入 + 图标轻微浮动）
 */

import React from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  /** lucide 图标组件 */
  icon?: React.ComponentType<{ className?: string }>;
  /** emoji 或文字图标（与 icon 二选一） */
  emoji?: string;
  /** 主标题 */
  title: string;
  /** 描述文案 */
  description?: string;
  /** CTA 按钮文案 */
  actionLabel?: string;
  /** CTA 按钮点击回调 */
  onAction?: () => void;
  /** 紧凑模式（用于小空间，如表格内） */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-6 px-4' : 'py-12 px-6',
        className,
      )}
    >
      {/* 图标 / emoji */}
      {Icon ? (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={cn(
            'rounded-2xl bg-brand-soft text-brand flex items-center justify-center mb-3',
            compact ? 'w-12 h-12' : 'w-16 h-16',
          )}
        >
          <Icon className={compact ? 'h-6 w-6' : 'h-8 w-8'} />
        </motion.div>
      ) : emoji ? (
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className={cn('mb-3', compact ? 'text-3xl' : 'text-5xl')}
        >
          {emoji}
        </motion.div>
      ) : null}

      {/* 标题 */}
      <h3 className={cn(
        'font-bold text-foreground',
        compact ? 'text-sm' : 'text-base',
      )}>
        {title}
      </h3>

      {/* 描述 */}
      {description && (
        <p className={cn(
          'text-muted-foreground mt-1 max-w-xs',
          compact ? 'text-xs' : 'text-sm',
        )}>
          {description}
        </p>
      )}

      {/* CTA 按钮 */}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          className="mt-4 bg-brand hover:bg-brand/90 text-brand-foreground"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
