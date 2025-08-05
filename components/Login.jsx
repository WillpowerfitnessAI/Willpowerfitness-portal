import React, { useState } from "react";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");

  const handleLogin = () => {
    if (!email.trim()) return;
    onLogin(email);
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 bg-white shadow-md rounded-xl">
      <h2 className="text-xl font-bold mb-4">Login to WillpowerFitness AI</h2>
      <input
        type="email"
        placeholder="Enter your email"
        className="w-full px-4 py-2 border rounded mb-4"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded"
      >
        Continue
      </button>
    </div>
  );
};

export default Login;
