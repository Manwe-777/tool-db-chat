import { Message } from "../types";

interface ChatMessageProps {
  message: Message;
  index: number;
  prevMessage: Message | undefined;
}

export default function ChatMessage(props: ChatMessageProps) {
  const { message, index, prevMessage } = props;
  return (
    <>
      {index === 0 || message.u !== prevMessage?.u ? (
        <div className="chat-username">
          <b>{message.u}</b>
          <i>{new Date(message.t).toDateString()}</i>
        </div>
      ) : (
        <></>
      )}
      <div className="chat-message" key={`message-${message.t}`}>
        {message.m}
      </div>
    </>
  );
}
