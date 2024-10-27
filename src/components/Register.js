// src/components/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Use useNavigate instead of useNavigation
import { auth, firestore } from './firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import './Register.css';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Use useNavigate

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = doc(collection(firestore, 'users'), user.uid);
      await setDoc(userRef, {
        firstName,
        lastName,
        email: user.email,
        role: 'employee', // Default role
        createdAt: new Date()
      });

      navigate('/dashboard'); // Use navigate for redirection
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleRegister}>
        <label>First Name:</label>
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Enter your first name"
          required
        />

        <label>Last Name:</label>
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Enter your last name"
          required
        />

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

        <label>Confirm Password:</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
        />

        <button type="submit">Register</button>
      </form>

      <p>
        Already have an account? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;