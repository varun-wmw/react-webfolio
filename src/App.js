// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import Navbar from './components/Navbar';
import { auth, firestore } from './components/firebase';
import { doc, getDoc } from 'firebase/firestore';

const App = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async (user) => {
      try {
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        } else {
          console.error("User document does not exist");
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserRole(user);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p>Loading...</p>;

    return (
      <Router>
        {userRole && <Navbar userRole={userRole} />}
        <Routes>
          <Route path="/login" element={!userRole ? <Login /> : <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />} />
          <Route path="/register" element={!userRole ? <Register /> : <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />} />
          
          {userRole === 'employee' && <Route path="/dashboard" element={<Dashboard />} />}
          
          {userRole === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
  
          {/* Redirect any other routes to appropriate dashboard based on role */}
          <Route path="*" element={<Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />} />
        </Routes>
      </Router>
    );
};

export default App;