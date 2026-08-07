import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Admin-authored markdown (product descriptions, content pages, text sections).
 * react-markdown renders to React elements rather than raw HTML, so there is no
 * dangerouslySetInnerHTML and no XSS surface even if an account is compromised.
 */
export function Markdown({ content }: { content: string }) {
  if (!content?.trim()) return null;

  return (
    <div className="prose-store">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
