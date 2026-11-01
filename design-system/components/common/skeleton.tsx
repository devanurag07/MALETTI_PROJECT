import React from 'react'

interface SkeletonProps {
    className?: string
    width?: string | number
    height?: string | number
    variant?: 'text' | 'rectangular' | 'circular'
}

export const Skeleton = ({
    className = '',
    width,
    height,
    variant = 'text'
}: SkeletonProps) => {
    const baseClass = 'animate-pulse bg-gray-600/50'

    const variantClass = {
        text: 'rounded',
        rectangular: 'rounded-lg',
        circular: 'rounded-full'
    }[variant]

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? '1em' : '100%')
    }

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={style}
        />
    )
}
