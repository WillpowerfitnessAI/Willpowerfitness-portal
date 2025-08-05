import React, { useState } from "react";
import MessageBubble from "./MessageBubble";

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages([...messages, userMessage]);

    // Simulate bot response
    setTimeout(() => {
      const botMessage = {
        role: "bot",
        text: `CoachBot: Got your message — "${input}"`,
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 600);

    setInput("");
  };

  return (
    <div className="p-4 bg-white rounded-xl shadow-md max-w-xl mx-auto mt-6">
      <div className="h-80 overflow-y-auto border rounded-md p-3 bg-gray-50">
        {messages.map((msg, index) => (
          <MessageBubble key={index} message={msg} />
        ))}
      </div>
      <div className="flex mt-4">
        <input
          type="text"
          className="flex-grow border rounded-l-md px-4 py-2"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-4 py-2 rounded-r-md"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
