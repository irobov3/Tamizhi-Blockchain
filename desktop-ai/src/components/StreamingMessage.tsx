import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface Props {
  text: string;
}

export default function StreamingMessage({ text }: Props) {
  return (
    <div className="bubble-row assistant">
      <div className="bubble assistant streaming">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {text || ' '}
        </ReactMarkdown>
        <span className="cursor">|</span>
      </div>
    </div>
  );
}
