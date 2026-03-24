import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { NestedMarkdown } from './NestedMarkdown';

interface PdfTextRendererProps {
  url: string;
  rightAlign?: boolean;
}

export const PdfTextRenderer: React.FC<PdfTextRendererProps> = ({ url, rightAlign = false }) => {
  const [markdown, setMarkdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractText = async () => {
      setLoading(true);
      setError(null);
      try {
        // Check cache first
        const cacheKey = `pdf-markdown-${url}`;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setMarkdown(cached);
          setLoading(false);
          return;
        }

        // Fetch PDF as blob
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch PDF');
        }
        const blob = await response.blob();
        
        // Convert blob to base64
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const prompt = `Extract the text from this PDF and format it as Markdown. 
Preserve the structure including sections, subsections, math (using LaTeX syntax like $...$ for inline and $$...$$ for block), text colors (using HTML <span style="color: ...">), links, and any highlighted boxes or colorboxes (using HTML <div> with background colors). 
Output ONLY the Markdown content without any surrounding markdown code blocks like \`\`\`markdown.`;

        const result = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                }
              },
              {
                text: prompt
              }
            ]
          }
        });

        let generatedMarkdown = result.text || '';
        // Remove markdown code block if present
        if (generatedMarkdown.startsWith('```markdown')) {
          generatedMarkdown = generatedMarkdown.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        } else if (generatedMarkdown.startsWith('```')) {
          generatedMarkdown = generatedMarkdown.replace(/^```\n/, '').replace(/\n```$/, '');
        }

        setMarkdown(generatedMarkdown);
        try {
          sessionStorage.setItem(cacheKey, generatedMarkdown);
        } catch (e) {
          // Ignore quota exceeded errors
        }
      } catch (err) {
        console.error('Error extracting text:', err);
        setError('Failed to extract text from PDF.');
      } finally {
        setLoading(false);
      }
    };

    extractText();
  }, [url]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <span className="text-lg font-medium">מנתח את המסמך בעזרת AI...</span>
        <span className="text-sm mt-2 opacity-70">זה עשוי לקחת מספר שניות</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div dir="auto">
      <NestedMarkdown content={markdown} rightAlign={rightAlign} />
    </div>
  );
};
