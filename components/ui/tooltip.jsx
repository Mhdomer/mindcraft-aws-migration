'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({ children, content, position = 'top', className }) {
	const [isVisible, setIsVisible] = useState(false);
	const tooltipRef = useRef(null);
	const triggerRef = useRef(null);

	useEffect(() => {
		if (isVisible && tooltipRef.current && triggerRef.current) {
			const tooltip = tooltipRef.current;
			const trigger = triggerRef.current;
			
			// Position tooltip
			const rect = trigger.getBoundingClientRect();
			const tooltipRect = tooltip.getBoundingClientRect();
			
			let top = 0;
			let left = 0;
			
			switch (position) {
				case 'top':
					top = rect.top - tooltipRect.height - 8;
					left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
					break;
				case 'bottom':
					top = rect.bottom + 8;
					left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
					break;
				case 'left':
					top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
					left = rect.left - tooltipRect.width - 8;
					break;
				case 'right':
					top = rect.top + (rect.height / 2) - (tooltipRect.height / 2);
					left = rect.right + 8;
					break;
			}
			
			// Keep tooltip within viewport
			const padding = 8;
			if (left < padding) left = padding;
			if (left + tooltipRect.width > window.innerWidth - padding) {
				left = window.innerWidth - tooltipRect.width - padding;
			}
			if (top < padding) top = padding;
			if (top + tooltipRect.height > window.innerHeight - padding) {
				top = window.innerHeight - tooltipRect.height - padding;
			}
			
			tooltip.style.top = `${top}px`;
			tooltip.style.left = `${left}px`;
		}
	}, [isVisible, position]);

	return (
		<div
			ref={triggerRef}
			className="relative inline-block"
			onMouseEnter={() => setIsVisible(true)}
			onMouseLeave={() => setIsVisible(false)}
		>
			{children}
			{isVisible && content && (
				<div
					ref={tooltipRef}
					className={cn(
						'fixed z-[100] px-3 py-2 text-sm text-white bg-neutralDark rounded-lg shadow-lg pointer-events-none transition-opacity duration-200 max-w-xs',
						className
					)}
					style={{ opacity: isVisible ? 1 : 0 }}
				>
					{content}
					{/* Arrow */}
					<div
						className={cn(
							'absolute w-2 h-2 bg-neutralDark transform rotate-45',
							position === 'top' && 'bottom-[-4px] left-1/2 -translate-x-1/2',
							position === 'bottom' && 'top-[-4px] left-1/2 -translate-x-1/2',
							position === 'left' && 'right-[-4px] top-1/2 -translate-y-1/2',
							position === 'right' && 'left-[-4px] top-1/2 -translate-y-1/2'
						)}
					/>
				</div>
			)}
		</div>
	);
}
