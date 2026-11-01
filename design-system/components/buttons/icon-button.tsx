import React from 'react'

interface IconButtonProps {
    icon: React.ReactNode
    text: string
    onClick: () => void
}
const IconButton = ({ icon, text, onClick }: IconButtonProps) => {
    return (
        <div className='w-full h-full bg-white flex flex-col items-center justify-center rounded-lg' onClick={onClick}>
            {icon}

            <div className='text-black text-4xl font-medium uppercase mt-4'>{text}</div>
        </div>
    )
}

export default IconButton