import React from "react";

const MessageBubble = ({ message }) => {
  const isUser = message.role === "user";

  return (
    <div
      className={`mb-2 flex ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`px-4 py-2 rounded-lg ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-300 text-black"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
};

export default MessageBubble;
