// src/components/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login successful:", userCredential.user);
  
      // Navigate to dashboard immediately after successful login
      navigate('/dashboard');
    } catch (error) {
      console.error("Login failed:", error);
      setError(error.message);
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don’t have an account? <Link to="/register">Register here</Link>
      </p>
    </div>
  );
};

export default Login;