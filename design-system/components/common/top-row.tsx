import React from 'react'
import { ArrowLeft, HomeIcon } from 'lucide-react'
import { title } from 'process'
import { useRouter } from 'next/navigation'
import { IoMdClose } from 'react-icons/io'
interface TopRowProps {
    onBack: () => void
    onHome?: () => void
    title?: string
    resultPage?: boolean
}
const TopRow = ({ onBack, onHome, title, resultPage }: TopRowProps) => {
    const router = useRouter()
    return (
        <div className='flex flex-row justify-between items-center mt-10'>
            {resultPage ? (
                <div className="cursor-pointer" onClick={onBack}>
                    <IoMdClose className='size-16 text-white' />
                </div>
            ) : (
                <div className="back-btn cursor-pointer" onClick={onBack}>
                    <ArrowLeft className='size-16' />
                </div>
            )}
            <div className="text-title text-5xl font-semibold">{title}</div>
            <div className="right-btn cursor-pointer" onClick={onHome ? onHome : () => {
                router.push('/')
            }}>
                <HomeIcon className='size-16' />
            </div>
        </div>
    )
}

export default TopRow