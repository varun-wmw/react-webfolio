// src/components/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Use useNavigate instead of useNavigation
import { auth } from './firebase';

const Navbar = ({ userRole }) => {
  const navigate = useNavigate(); // Use useNavigate instead of useNavigation

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login'); // Use navigate for redirection
  };

  return (
    <nav>
      <h2>Workfolio</h2>
      <Link to="/dashboard">Dashboard</Link>
      {userRole === 'admin' && <Link to="/admin">Admin Dashboard</Link>}
      <button onClick={handleLogout}>Logout</button>
    </nav>
  );
};

export default Navbar;