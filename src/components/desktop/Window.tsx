// Window Component

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface WindowProps {
  id: string;
  title: string;
  children: React.ReactNode;
  initialPosition?: { x: number; y: number };
  initialSize?: { width: number; height: number };
  onClose: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  zIndex: number;
  onFocus: () => void;
}

export const Window: React.FC<WindowProps> = ({
  id,
  title,
  children,
  initialPosition = { x: 100, y: 100 },
  initialSize = { width: 800, height: 600 },
  onClose,
  onMinimize,
  onMaximize,
  zIndex,
  onFocus,
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
      if (isResizing) {
        setSize({
          width: Math.max(400, e.clientX - position.x),
          height: Math.max(300, e.clientY - position.y),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, position]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
      onFocus();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    onFocus();
  };

  return (
    <div
      ref={windowRef}
      data-window-id={id}
      className="absolute bg-bg-elevated rounded-window shadow-window border border-border-subtle flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
      }}
      onClick={onFocus}
    >
      {/* Window Header */}
      <div
        className="bg-bg-secondary rounded-t-window px-3 py-1.5 flex items-center justify-between cursor-move border-b border-border-subtle"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {onMinimize && (
            <button
              onClick={onMinimize}
              className="w-5 h-5 rounded hover:bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <span className="text-[10px] leading-none">−</span>
            </button>
          )}
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="w-5 h-5 rounded hover:bg-bg-elevated flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <span className="text-[10px] leading-none">□</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 rounded hover:bg-accent/20 hover:text-accent flex items-center justify-center text-text-muted transition-colors"
          >
            <span className="text-[10px] leading-none">×</span>
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div className="flex-1 overflow-auto bg-bg-primary">{children}</div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
        onMouseDown={handleResizeStart}
      >
        <div className="absolute bottom-0 right-0 w-0 h-0 border-l-[6px] border-l-transparent border-b-[6px] border-b-border-subtle opacity-50" />
      </div>
    </div>
  );
};

