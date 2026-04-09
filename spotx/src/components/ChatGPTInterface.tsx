import { useState, useRef, useEffect } from 'react'

export default function ChatGPTInterface() {
  const [messages, setMessages] = useState<Array<{id: number; text: string; sender: 'user' | 'bot'}>>([
    { id: 1, text: 'Hello! 👋 How can I help you today?', sender: 'bot' },
    { id: 2, text: 'I want to build a ChatGPT-style UI with sidebar and chat screen.', sender: 'user' }
  ])
  
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = () => {
    const input = inputRef.current
    if (!input?.value.trim()) return

    const userText = input.value

    // Add user message immediately
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: userText, sender: 'user' }
    ])

    input.value = ''

    // Show typing indicator
    setIsTyping(true)
    setMessages(prev => [
      ...prev,
      { id: Date.now(), text: 'ChatGPT is thinking...', sender: 'bot' }
    ])

    // Bot thinking and response
    setTimeout(() => {
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== Date.now() + 1), // Remove typing indicator
        { id: Date.now() + 2, text: 'This is a demo response showing the new ChatGPT-style UI with typing animations and improved message handling.', sender: 'bot' }
      ])
      setIsTyping(false)
    }, 1500)
  }

  return (
    <div className="flex h-screen bg-black text-white">
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 p-4 border-r border-gray-700">
        <h2 className="text-white font-semibold mb-4">ChatGPT Interface</h2>
        <div className="space-y-2">
          <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">
            Chat 1
          </div>
          <div className="p-2 rounded hover:bg-gray-800 cursor-pointer">
            Chat 2
          </div>
        </div>
      </div>
      
      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 p-4 rounded-lg h-96 overflow-y-auto" ref={messagesEndRef}>
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' 
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[75%] ${
                    message.sender === 'user' 
                      ? 'bg-gray-800 ml-auto' 
                      : 'bg-gray-700 mr-auto'
                  }`}
                >
                  <span className="text-white text-sm">
                    {message.sender === 'user' ? 'You: ' : 'Bot: '}
                    {message.text}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage()
              }}
            />

            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
