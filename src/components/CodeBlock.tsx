import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Copy, CheckCircle2 } from 'lucide-react';
import { Button } from "@/components/button";

interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({ code, language, showLineNumbers = true, className = '' }: CodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className={`relative ${className}`}>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
        }}
        codeTagProps={{
          style: {
            fontSize: 'inherit',
            lineHeight: 'inherit',
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        title="Copy to clipboard"
        className="absolute top-2 right-2 bg-slate-700/50 hover:bg-slate-600/50"
      >
        {isCopied ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-slate-100" />
        )}
      </Button>
    </div>
  );
} 