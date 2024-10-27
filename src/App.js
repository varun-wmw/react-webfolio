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
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Fetch user role only if it has not been set
          if (!userRole) {
            const userDocRef = doc(firestore, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserRole(userDoc.data().role);
            }
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
        }
      } else {
        setUserRole(null); // Reset role on logout
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [userRole]);

  if (loading) return <p>Loading...</p>;

  return (
    <Router>
      {userRole && <Navbar userRole={userRole} />}
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login /> : <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />} 
        />
        <Route 
          path="/register" 
          element={!user ? <Register /> : <Navigate to={userRole === 'admin' ? "/admin" : "/dashboard"} replace />} 
        />
        <Route 
          path="/dashboard" 
          element={user && userRole === 'employee' ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/admin" 
          element={user && userRole === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={user ? (userRole === 'admin' ? "/admin" : "/dashboard") : "/login"} replace />} 
        />
      </Routes>
    </Router>
  );
};

export default App;