import React, { useState, useEffect } from 'react';
import { firestore } from './firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import './AdminDashboard.css';
import { saveAs } from 'file-saver'; // install with npm install file-saver
import { format } from 'date-fns';

const AdminDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [selectedScreenshots, setSelectedScreenshots] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedScreenshot, setExpandedScreenshot] = useState(null); // N

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, 'users');
        const userSnapshots = await getDocs(usersRef);
        const userData = {};
        userSnapshots.docs.forEach(doc => {
          const data = doc.data();
          userData[doc.id] = `${data.firstName} ${data.lastName}`;
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
        let sessionsQuery = query(sessionsRef, orderBy('clockInTime', 'desc')); // Order by time descending

        // Apply date filter
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

        // Apply exact employee ID filter
        if (filterEmployee) {
          sessionsQuery = query(sessionsQuery, where('userId', '==', filterEmployee));
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

  const fetchEmployeeLogs = async (userId) => {
    const sessionsQuery = query(
      collection(firestore, 'work_sessions'),
      where('userId', '==', userId),
      orderBy('clockInTime', 'desc')
    );
    
    const sessionsSnapshot = await getDocs(sessionsQuery);
    const sessions = [];
  
    for (const doc of sessionsSnapshot.docs) {
      const data = doc.data();
      const screenshots = await getDocs(collection(doc.ref, 'screenshots'));
      const screenshotUrls = screenshots.docs.map(snap => snap.data().url);
  
      sessions.push({
        sessionId: doc.id,
        clockInTime: format(data.clockInTime.toDate(), 'yyyy-MM-dd HH:mm:ss'),
        clockOutTime: data.clockOutTime ? format(data.clockOutTime.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'Ongoing',
        breakTime: data.breakTime,
        screenshots: screenshotUrls,
      });
    }
  
    return sessions;
  };

  const convertToCSV = (sessions) => {
    const headers = ['Session ID', 'Clock In Time', 'Clock Out Time', 'Break Time (mins)', 'Screenshot URLs'];
    const rows = sessions.map(session => [
      session.sessionId,
      session.clockInTime,
      session.clockOutTime,
      session.breakTime || '0',
      session.screenshots.join(', '), // Join URLs with commas
    ]);
  
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    return csvContent;
  };

  const downloadEmployeeLogs = async (userId, employeeName) => {
    try {
      const logs = await fetchEmployeeLogs(userId);
      const csvData = convertToCSV(logs);
  
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `${employeeName}_activity_logs.csv`);
    } catch (error) {
      console.error("Error downloading logs:", error);
    }
  };


  const calculateDuration = (start, end) => {
    if (!start || !end) return 'Ongoing';
    const duration = (new Date(end) - new Date(start)) / 1000 / 60;
    return `${duration.toFixed(2)} minutes`;
  };

  // Open modal to view screenshots
  const openScreenshotModal = (screenshots) => {
    setSelectedScreenshots(screenshots);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedScreenshots([]);
  };

  const openExpandedView = (screenshot) => {
    setExpandedScreenshot(screenshot);
  };

  const closeExpandedView = () => {
    setExpandedScreenshot(null);
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
          <button onClick={() => openScreenshotModal(session.screenshots)}>
            View Screenshots
          </button>
          <button onClick={() => downloadEmployeeLogs(session.userId, employeeName)}
            className="download-button">
            Download Logs
          </button>
        </td>
      </tr>
    );
  })}
</tbody>
        </table>
      )}

      {/* Screenshot Modal */}
      {isModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-button" onClick={closeModal}>Close</button>
            <div className="screenshot-grid">
              {selectedScreenshots.map((screenshot, index) => (
                <img
                  key={index}
                  src={screenshot.url}
                  alt="Screenshot"
                  className="screenshot-thumbnail"
                  onClick={() => openExpandedView(screenshot)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Screenshot View */}
      {expandedScreenshot && (
        <div className="expanded-view-overlay" onClick={closeExpandedView}>
          <img src={expandedScreenshot.url} alt="Expanded Screenshot" className="expanded-screenshot" />
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;