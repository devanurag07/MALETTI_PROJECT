"use client"

import React from "react"

// TypeScript interfaces
export interface RadarDataPoint {
    name: string
    score: number
}

export interface RadarChartProps {
    data: RadarDataPoint[]
    size?: number
    padding?: number
    maxValue?: number
    colors?: {
        excellent: string
        good: string
        poor: string
    }
    thresholds?: {
        excellent: number
        good: number
    }
    showGrid?: boolean
    gridLevels?: number
    showLabels?: boolean
    className?: string
    strokeWidth?: number
    dotRadius?: number
    rotationDegrees?: number
    dataOrder?: string[] // Custom order for data points
    bgColor?: string // Fill color for the hexagonal chart background
}

const defaultProps: Required<Omit<RadarChartProps, 'data' | 'dataOrder' | 'bgColor'>> = {
    size: 600,
    padding: 200, // Increased padding for more space for labels
    maxValue: 100,
    colors: {
        excellent: "#22c55e",
        good: "#eab308",
        poor: "#ef4444"
    },
    thresholds: {
        excellent: 80,
        good: 60
    },
    showGrid: true,
    gridLevels: 5,
    showLabels: true,
    className: "",
    strokeWidth: 2,
    dotRadius: 6,
    rotationDegrees: -30
}

export default function RadarChart(props: RadarChartProps) {
    const config = { ...defaultProps, ...props }
    const {
        data, size, maxValue, colors, thresholds,
        showGrid, gridLevels, showLabels, className, strokeWidth, dotRadius, rotationDegrees, dataOrder
    } = config
    const bgColor = props.bgColor

    // Reorder data based on dataOrder prop, or use provided order as-is
    const reorderedData = dataOrder
        ? dataOrder
            .map(name =>
                data.find(d => d.name.toLowerCase().replace(/[-\s_]+/g, "_") === name.toLowerCase().replace(/[-\s_]+/g, "_"))
            )
            .filter(Boolean) as RadarDataPoint[]
        : data

    // Adjust padding based on whether labels are shown
    const effectivePadding = showLabels ? (props.padding ?? defaultProps.padding) : 40

    // Constants
    const CENTER = size / 2
    const MAX_RADIUS = CENTER - effectivePadding
    const AXES = reorderedData.length
    const SLICE_RAD = (2 * Math.PI) / AXES
    const ROTATION_OFFSET = (rotationDegrees * Math.PI) / 180 // Convert degrees to radians

    // Helper functions
    const normalize = (value: number) => (value / maxValue) * MAX_RADIUS

    const getColor = (score: number) => {
        if (score >= thresholds.excellent) return colors.excellent
        if (score >= thresholds.good) return colors.good
        return colors.poor
    }

    const getCategory = (score: number) => {
        if (score >= thresholds.excellent) return "excellent"
        if (score >= thresholds.good) return "good"
        return "poor"
    }

    // Determine majority color based on category counts
    const categories = reorderedData.map(item => getCategory(item.score))
    const categoryCounts = {
        excellent: categories.filter(c => c === "excellent").length,
        good: categories.filter(c => c === "good").length,
        poor: categories.filter(c => c === "poor").length
    }
    const majorityCategory = Object.entries(categoryCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] as "excellent" | "good" | "poor"
    const majorityColor = colors[majorityCategory]

    // Build point objects
    const points = reorderedData.map((item, i) => {
        const angle = i * SLICE_RAD - Math.PI / 2 + ROTATION_OFFSET
        const radius = normalize(item.score)
        // Anchor labels close to the data points
        const labelDistance = 30; // px from the data point
        const labelX = CENTER + (radius + labelDistance) * Math.cos(angle);
        const labelY = CENTER + (radius + labelDistance) * Math.sin(angle);
        return {
            ...item,
            angle,
            radius,
            x: CENTER + radius * Math.cos(angle),
            y: CENTER + radius * Math.sin(angle),
            labelX,
            labelY,
            color: getColor(item.score),
            category: getCategory(item.score),
            index: i
        }
    })

    // Create a single path for the entire chart using majority color
    const createChartPath = () => {
        if (points.length === 0) return ""

        // Start from first point, connect all points, then close back to first point
        return `M${points[0].x},${points[0].y} ` +
            points.slice(1).map(p => `L${p.x},${p.y} `).join("") +
            "Z"
    }

    return (
        <div className={`flex justify-center ${className} z-[100]`}>
            <svg width={size} height={size}>
                <defs>
                    {/* Radial gradient for majority color */}
                    <radialGradient id="fill-majority" cx="50%" cy="50%" r="70%">
                        <stop offset="0%" stopColor={majorityColor} stopOpacity="0.45" />
                        <stop offset="100%" stopColor={majorityColor} stopOpacity="0.95" />
                    </radialGradient>
                </defs>

                {/* Hexagonal background fill */}
                {bgColor && points.length > 0 && (
                    <polygon
                        points={points.map((_, i) => {
                            const angle = i * SLICE_RAD - Math.PI / 2 + ROTATION_OFFSET
                            return `${CENTER + MAX_RADIUS * Math.cos(angle)},${CENTER + MAX_RADIUS * Math.sin(angle)}`
                        }).join(" ")}
                        fill={bgColor}
                    />
                )}

                {/* Grid */}
                {showGrid && (
                    <>
                        {/* Concentric polygons */}
                        {Array.from({ length: gridLevels }, (_, level) => (
                            <polygon
                                key={`grid-${level}`}
                                points={points.map((_, i) => {
                                    const angle = i * SLICE_RAD - Math.PI / 2 + ROTATION_OFFSET
                                    const radius = ((level + 1) / gridLevels) * MAX_RADIUS
                                    return `${CENTER + radius * Math.cos(angle)},${CENTER + radius * Math.sin(angle)}`
                                }).join(" ")}
                                fill="none"
                                stroke="#1e293b" // much darker
                                strokeOpacity="0.7" // more visible
                                strokeWidth="1.5"
                            />
                        ))}

                        {/* Radial axes */}
                        {points.map((_, i) => {
                            const angle = i * SLICE_RAD - Math.PI / 2 + ROTATION_OFFSET
                            return (
                                <line
                                    key={`axis-${i}`}
                                    x1={CENTER} y1={CENTER}
                                    x2={CENTER + MAX_RADIUS * Math.cos(angle)}
                                    y2={CENTER + MAX_RADIUS * Math.sin(angle)}
                                    stroke="#334155" // darker
                                    strokeOpacity="0.7" // more visible
                                    strokeWidth="1.2"
                                />
                            )
                        })}

                        {/* Level labels — placed at the vertical-axis intersection with each ring boundary */}
                        {Array.from({ length: gridLevels }, (_, level) => {
                            const radius = ((level + 1) / gridLevels) * MAX_RADIUS
                            const labelValue = Math.round(((level + 1) / gridLevels) * maxValue)
                            // cos(π/AXES) = distance ratio from center to the polygon edge along the straight-up direction
                            // ensures labels land at the polygon boundary (not floating above it for flat-top polygons)
                            const yScale = Math.cos(Math.PI / AXES)
                            return (
                                <text
                                    key={`level-${level}`}
                                    x={CENTER}
                                    y={CENTER - radius * yScale - 4}
                                    fill="#64748b"
                                    fontSize={Math.max(8, size * 0.022)}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {labelValue}
                                </text>
                            )
                        })}
                    </>
                )}

                {/* Single chart area with majority color */}
                <path
                    d={createChartPath()}
                    fill="url(#fill-majority)"
                    stroke={majorityColor}
                    strokeWidth={strokeWidth + 1}
                    strokeOpacity="1"
                    strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map(point => (
                    <circle
                        key={`dot-${point.index}`}
                        cx={point.x}
                        cy={point.y}
                        r={dotRadius}
                        fill={point.color}
                        stroke="#fff"
                        strokeWidth="2"
                    />
                ))}

                {/* Labels */}
                {showLabels && points.map((point, index) => {
                    // Improved anchor logic: center for top/bottom, start/end for sides
                    let textAnchor: 'start' | 'end' | 'middle' = 'middle';
                    if (Math.abs(point.labelX - CENTER) > Math.abs(point.labelY - CENTER)) {
                        textAnchor = point.labelX > CENTER ? 'start' : 'end';
                    }
                    return (
                        <g key={`label-${point.index}`}>
                            <text
                                x={point.labelX}
                                y={point.labelY}
                                fill="#fff"
                                fontSize="35" // Reduced font size
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                style={{ pointerEvents: 'none' }}
                            >
                                {point.name}
                            </text>
                            <text
                                x={point.labelX + (textAnchor == "start" ? 60 : -60)}
                                y={point.labelY + (textAnchor == "start" ? 40 : 60) + (index == 0 ? -120 : 0)}
                                fill={point.color}
                                fontSize="45" // Reduced font size
                                fontWeight="bold"
                                textAnchor={textAnchor}
                                dominantBaseline="central"
                                style={{ pointerEvents: 'none' }}
                            >
                                {point.score}
                            </text>
                        </g>
                    )
                })}

                {/* Center dot */}
                <circle cx={CENTER} cy={CENTER} r="3.5" fill="#94a3b8" />
            </svg>
        </div>
    )
}
