import React from 'react'

const GradientCircle = () => {
    return (
        <div className="pointer-events-none w-full h-full absolute inset-0">
            <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-500/80 to-teal-900/40 blur-2xl opacity-80 z-10 -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-blue-500/80 to-blue-900/40 blur-2xl opacity-80 z-10 translate-x-1/2 translate-y-1/2"></div>
        </div>
    )
}

export default GradientCircle;
