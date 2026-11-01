import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface RenderMarkdownProps {
    text: string
}

const RenderMarkdown = ({ text }: RenderMarkdownProps) => {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {text}
        </ReactMarkdown>
    )
}

export default RenderMarkdown