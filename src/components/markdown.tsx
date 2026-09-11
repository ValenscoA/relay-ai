"use client";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export function Markdown({ content }: { content: string }) { return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize, rehypeHighlight]} components={{ a: ({...props}) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}>{content}</ReactMarkdown></div>; }
