import React, { useState, useEffect } from 'react';
import { firestore } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, 'users');
        const userSnapshots = await getDocs(usersRef);
        const userData = {};
        userSnapshots.docs.forEach(doc => {
          const data = doc.data();
          userData[doc.id] = `${data.firstName} ${data.lastName}`; // Store full name for each user ID
        });
        setUsers(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    const fetchSessions = async () => {
      setLoading(true);
      try {
        const sessionsRef = collection(firestore, 'work_sessions');
        let sessionsQuery = query(sessionsRef);
  
        // Apply date filter if specified
        if (filterDate) {
          const startDate = new Date(filterDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(filterDate);
          endDate.setHours(23, 59, 59, 999);
  
          sessionsQuery = query(
            sessionsQuery,
            where('clockInTime', '>=', startDate),
            where('clockInTime', '<=', endDate)
          );
        }
  
        // Apply employee ID filter (prefix match for substring matching)
        if (filterEmployee) {
          const endValue = filterEmployee + '\uf8ff';
          sessionsQuery = query(
            sessionsQuery,
            where('userId', '>=', filterEmployee),
            where('userId', '<', endValue)
          );
        }
  
        const sessionSnapshots = await getDocs(sessionsQuery);
        const sessionData = await Promise.all(sessionSnapshots.docs.map(async (sessionDoc) => {
          const session = { id: sessionDoc.id, ...sessionDoc.data() };

          // Fetch screenshots for each session
          const screenshotsRef = collection(sessionDoc.ref, 'screenshots');
          const screenshotsSnapshot = await getDocs(screenshotsRef);
          session.screenshots = screenshotsSnapshot.docs.map(doc => doc.data());

          return session;
        }));

        setSessions(sessionData);
  
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
      setLoading(false);
    };

    fetchUsers();  // Fetch users only once
    fetchSessions();
  }, [filterDate, filterEmployee]);

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'Ongoing';
    const duration = (new Date(end) - new Date(start)) / 1000 / 60;
    return `${duration.toFixed(2)} minutes`;
  };

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      
      <div className="filters">
        <label>Filter by Date:</label>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />

        <label>Filter by Employee ID:</label>
        <input
          type="text"
          placeholder="Enter Employee ID"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
        />
      </div>

      {loading ? (
        <p>Loading data...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Employee ID</th>
              <th>Session Start</th>
              <th>Session End</th>
              <th>Duration</th>
              <th>Total Break Time</th>
              <th>Screenshots</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => {
              const employeeName = users[session.userId] || 'Unknown';
              return (
                <tr key={session.id}>
                  <td>{employeeName}</td>
                  <td>{session.userId}</td>
                  <td>{session.clockInTime ? session.clockInTime.toDate().toLocaleString() : 'N/A'}</td>
                  <td>{session.clockOutTime ? session.clockOutTime.toDate().toLocaleString() : 'Ongoing'}</td>
                  <td>{calculateDuration(session.clockInTime ? session.clockInTime.toDate() : null, session.clockOutTime ? session.clockOutTime.toDate() : null)}</td>
                  <td>{session.breakTime ? `${session.breakTime} minutes` : '0 minutes'}</td>
                  <td>
                    <div className="screenshot-container">
                      {session.screenshots && session.screenshots.length > 0 ? (
                        session.screenshots.map((screenshot, index) => (
                          <img
                            key={index}
                            src={screenshot.url}
                            alt="Screenshot"
                          />
                        ))
                      ) : (
                        <p>No screenshots available</p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;