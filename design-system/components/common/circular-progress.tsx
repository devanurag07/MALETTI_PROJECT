import Image, { StaticImageData } from "next/image";

interface CircleProgressProps {
    // Circle Progress Component
    percentage: number;
    radius: number;
    color: string;
    strokeWidth: number;
    backgroundColor: string;
    showPercentage: boolean;
    className: string;
    animationDuration: number;
    colorStops: { percentage: number; color: string }[] | null;
    useGradient: boolean;
    bigCircle: boolean;
    iconBgColor?: string,
    icon: StaticImageData | null;
    show100?: boolean;
    textSize?: number;
}

export default function CircleProgress({
    percentage = 50,
    radius = 50,
    color = '#3b82f6',
    strokeWidth = 4,
    backgroundColor = '#d1d5db',
    iconBgColor = "#000000",
    showPercentage = true,
    className = '',
    animationDuration = 1000,
    colorStops = null, // Array of {percentage, color} objects
    useGradient = false,
    bigCircle = false,
    show100 = true,
    icon = null,
    textSize,
}: CircleProgressProps) {
    // Clamp percentage between 0 and 100
    const clampedPercentage = percentage;

    // Default color stops if none provided
    const defaultColorStops = [
        { percentage: 25, color: '#ef4444' }, // Red
        { percentage: 60, color: '#eab308' }, // Yellow
        { percentage: 80, color: '#10b981' } // Green
    ];

    const stops = colorStops || defaultColorStops;

    // Get color based on current percentage
    const getCurrentColor = () => {
        if (bigCircle) {
            console.log(percentage);
            console.log(clampedPercentage);
        }
        if (clampedPercentage >= 80) {
            return '#10b981';
        } else if (clampedPercentage >= 60) {
            return '#eab308';
        } else {
            return '#ef4444';
        }
    };

    const currentColor = useGradient ? color : getCurrentColor();

    // Calculate SVG dimensions
    const svgSize = (radius + strokeWidth) * 2;
    const center = svgSize / 2;

    // Calculate path
    const createArcPath = (percent: number, isRemainder: boolean = false) => {
        if (percent === 0) return '';

        // For a complete circle
        if (percent >= 100) {
            const startX = center;
            const startY = center - radius;
            const midX = center;
            const midY = center + radius;
            return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${midX} ${midY} A ${radius} ${radius} 0 0 1 ${startX} ${startY}`;
        }

        // Calculate angles in radians
        const startAngle = -90 * (Math.PI / 180); // Start at top
        let endAngle;

        if (isRemainder) {
            // For remainder, start where the progress ends and go to the top
            const progressEndAngle = ((clampedPercentage / 100) * 360 - 90) * (Math.PI / 180);
            endAngle = startAngle + (2 * Math.PI); // Full circle

            const startX = center + radius * Math.cos(progressEndAngle);
            const startY = center + radius * Math.sin(progressEndAngle);
            const endX = center;
            const endY = center - radius;

            const largeArc = (100 - clampedPercentage) > 50 ? 1 : 0;

            return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
        } else {
            // For progress arc
            endAngle = ((percent / 100) * 360 - 90) * (Math.PI / 180);

            const startX = center;
            const startY = center - radius;
            const endX = center + radius * Math.cos(endAngle);
            const endY = center + radius * Math.sin(endAngle);

            const largeArc = percent > 50 ? 1 : 0;

            return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
        }
    };

    const pathData = createArcPath(clampedPercentage);
    const remainderPathData = clampedPercentage < 100 ? createArcPath(100 - clampedPercentage, true) : '';

    return (
        <div className={`inline-flex flex-col items-center ${className}`}>
            <div className="relative">
                <svg
                    width={svgSize}
                    height={svgSize}
                    className="transform -rotate-90"
                >
                    {/* Gradient definition for smooth color transitions */}
                    {useGradient && (
                        <defs>
                            <linearGradient id={`gradient-${Math.random().toString(36).substr(2, 9)}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                {stops.map((stop, index) => (
                                    <stop
                                        key={index}
                                        offset={`${(stop.percentage / 100) * 100}%`}
                                        stopColor={stop.color}
                                    />
                                ))}
                            </linearGradient>
                        </defs>
                    )}

                    {/* Gray remainder arc */}
                    {remainderPathData && (
                        <path
                            d={remainderPathData}
                            stroke={backgroundColor}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            style={{
                                transition: `stroke ${animationDuration}ms ease-in-out`
                            }}
                        />
                    )}

                    {/* Colored progress arc */}
                    {pathData && (
                        <path
                            d={pathData}
                            stroke={useGradient ? `url(#gradient-${Math.random().toString(36).substr(2, 9)})` : currentColor}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeLinecap="round"
                            style={{
                                transition: `stroke ${animationDuration}ms ease-in-out`
                            }}
                        />
                    )}
                </svg>

                {icon && (
                    <div className="icon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Image src={icon} alt="icon" width={50} height={50} />
                    </div>
                )}

                {/* Percentage text overlay */}
                {showPercentage && (
                    <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ fontSize: `${radius * 0.3}px` }}
                    >
                        <div>
                            <span className="font-semibold text-white" style={{ fontSize: textSize ? `${textSize}px` : `${radius * 0.3}px` }}>
                                {Math.round(clampedPercentage)}
                            </span>
                            <span className="text-white text-3xl">
                                {show100 ? "/100" : "%"}
                            </span>
                            {/* 
                            <div className="mt-8">

                            </div> */}

                            {/* good moderate poor */}
                            {bigCircle && (
                                <div style={{ color: getCurrentColor() }} className=" text-3xl mt-2">
                                    {/* good moderate poor */}
                                    <div className="px-4 py-2"
                                    >
                                        {clampedPercentage > 80 ? "Good" : clampedPercentage > 60 ? "Protect" : "Treat"}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

