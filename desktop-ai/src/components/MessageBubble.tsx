import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import type { Message } from '../store/conversations';
import { isTamilScript } from '../utils/tamil';

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const tamil = isTamilScript(message.content);
  return (
    <div className={`bubble-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`bubble ${isUser ? 'user' : 'assistant'} ${tamil ? 'tamil' : ''}`}>
        {isUser ? (
          <div className="bubble-text">{message.content}</div>
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
