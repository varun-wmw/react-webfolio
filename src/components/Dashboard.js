import React, { useState, useEffect } from 'react';
import { auth, firestore, storage } from './firebase';
import { 
  collection, 
  addDoc, 
  Timestamp, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  updateDoc, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './Dashboard.css';
import { onAuthStateChanged } from 'firebase/auth'; // Add this import
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [captureInterval, setCaptureInterval] = useState(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [currentBreakDuration, setCurrentBreakDuration] = useState(0);
  const [user, setUser] = useState(null);
  const [electronAvailable, setElectronAvailable] = useState(false);
  const navigate = useNavigate();

  // In Dashboard.js at the top
const isElectron = () => {
  return window.electron !== undefined;
};


  // useEffect(() => {
  //   fetchSessionHistory();
  //   return () => {
  //     if (isClockedIn) clearInterval(captureInterval);
  //   };
  // }, []);



  useEffect(() => {
    if (isElectron()) {
      setElectronAvailable(true);
      console.log("Electron detected, setting up screenshot listener.");
      
      // Add screenshot listener once on mount
      window.electron.onScreenshotCaptured(async ({ success, path, buffer, error }) => {
        if (success && buffer && sessionId) {
          handleScreenshotUpload(buffer);
        } else {
          console.error("Screenshot capture failed:", error);
        }
      });
    }
  }, [sessionId]);

  useEffect(() => {
    let timer;
    if (isClockedIn && !isOnBreak) {
      timer = setInterval(() => setCurrentDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isClockedIn, isOnBreak]);

  useEffect(() => {
    let breakTimer;
    if (isOnBreak) {
      breakTimer = setInterval(() => setCurrentBreakDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(breakTimer);
  }, [isOnBreak]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchSessionHistory();
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchSessionHistory = async () => {
    if (!auth.currentUser) return;
    try {
      const sessionsRef = collection(firestore, 'work_sessions');
      const q = query(
        sessionsRef, 
        where('userId', '==', auth.currentUser.uid),
        orderBy('clockInTime', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessionHistory(sessions);
    } catch (error) {
      console.error("Error fetching session history:", error);
    }
  };

  const clockIn = async () => {
    if (!auth.currentUser) return;
    try {
      const docRef = await addDoc(collection(firestore, 'work_sessions'), {
        userId: auth.currentUser.uid,
        clockInTime: Timestamp.now(),
        clockOutTime: null,
        breakTime: 0,
        isClockedIn: true,
      });

      setIsClockedIn(true);
      setSessionId(docRef.id);
      console.log('Clocked in with session ID:', docRef.id);

      if (electronAvailable) {
        console.log("Setting up screenshot capture interval...");
        const interval = setInterval(() => {
          console.log("Attempting to capture screenshot...");
          window.electron.captureScreenshot();
        }, 60000); // 1-minute interval for screenshots

        setCaptureInterval(interval);
      }
    } catch (error) {
      console.error('Error during clock-in:', error);
    }
  };


  // Add this debugging useEffect
useEffect(() => {
  console.log("Electron availability:", electronAvailable);
  if (electronAvailable) {
    console.log("Setting up screenshot listener");
    window.electron.onScreenshotCaptured((data) => {
      console.log("Screenshot callback received data:", data);
      if (data.success && data.buffer && sessionId) {
        console.log("Processing successful screenshot");
        handleScreenshotUpload(data.buffer);
      } else {
        console.error("Screenshot data invalid:", data);
      }
    });
  }
}, [electronAvailable, sessionId]);



const handleScreenshotUpload = async (buffer) => {
  try {
    const blob = new Blob([buffer], { type: 'image/png' });
    const screenshotRef = ref(storage, `screenshots/${auth.currentUser.uid}/${Date.now()}_screenshot.png`);
    
    await uploadBytes(screenshotRef, blob);
    const screenshotURL = await getDownloadURL(screenshotRef);

    await addDoc(collection(doc(firestore, 'work_sessions', sessionId), 'screenshots'), {
      url: screenshotURL,
      timestamp: Timestamp.now(),
    });
    console.log("Screenshot uploaded and URL saved to Firestore:", screenshotURL);
  } catch (error) {
    console.error("Error handling screenshot upload:", error);
  }
};





const clockOut = async () => {
  if (!sessionId) return;
  try {
    await updateDoc(doc(firestore, 'work_sessions', sessionId), {
      clockOutTime: Timestamp.now(),
      isClockedIn: false,
      totalDuration: currentDuration,
    });
    setIsClockedIn(false);
    setSessionId(null);
    setCurrentDuration(0);
    setCurrentBreakDuration(0);
    fetchSessionHistory();

    if (captureInterval) {
      clearInterval(captureInterval);
      setCaptureInterval(null);
    }
  } catch (error) {
    console.error("Error clocking out:", error);
  }
};


  const startBreak = async () => {
    if (!sessionId || isOnBreak) return;
    try {
      await updateDoc(doc(firestore, 'work_sessions', sessionId), { breakStartTime: Timestamp.now() });
      setIsOnBreak(true);
      setCurrentBreakDuration(0);
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  const endBreak = async () => {
    if (!sessionId || !isOnBreak) return;
    try {
      const sessionRef = doc(firestore, 'work_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      const currentBreakTime = sessionDoc.data().breakTime || 0;

      await updateDoc(sessionRef, {
        breakTime: currentBreakTime + currentBreakDuration,
        breakStartTime: null,
      });
      setIsOnBreak(false);
    } catch (error) {
      console.error("Error ending break:", error);
    }
  };
  return (
    <div className="container">
      {user ? (
        <>
          <h1 className="title">Dashboard</h1>
          
          {/* Current Session Stats */}
          {isClockedIn && (
            <div className="current-session">
              <div className="stats-grid">
                <div className="stat-box">
                  <h3 className="stat-title">Session Duration</h3>
                  <p className="stat-value">{formatTime(currentDuration)}</p>
                </div>
                <div className="stat-box">
                  <h3 className="stat-title">Current Break</h3>
                  <p className="stat-value">{formatTime(currentBreakDuration)}</p>
                </div>
                <div className="stat-box">
                  <h3 className="stat-title">Status</h3>
                  <p className={`stat-value ${isOnBreak ? 'status-break' : 'status-working'}`}>
                    {isOnBreak ? 'On Break' : 'Working'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="button-container">
            {!isClockedIn ? (
              <button onClick={clockIn} className="button clock-in-button">
                Clock In
              </button>
            ) : (
              <>
                <button onClick={clockOut} className="button clock-out-button">
                  Clock Out
                </button>
                <button 
                  onClick={isOnBreak ? endBreak : startBreak}
                  className={`button ${isOnBreak ? 'end-break-button' : 'break-button'}`}
                >
                  {isOnBreak ? 'End Break' : 'Start Break'}
                </button>
              </>
            )}
          </div>

          {/* Session History */}
          <div className="history-container">
            <h2 className="history-title">Session History</h2>
            <div className="history-list">
              {sessionHistory.map((session) => (
                <div key={session.id} className="history-item">
                  <div className="history-grid">
                    <div>
                      <p className="history-label">Clock In</p>
                      <p className="history-value">
                        {new Date(session.clockInTime.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="history-label">Clock Out</p>
                      <p className="history-value">
                        {session.clockOutTime 
                          ? new Date(session.clockOutTime.seconds * 1000).toLocaleString()
                          : 'Ongoing'}
                      </p>
                    </div>
                    <div>
                      <p className="history-label">Break Time</p>
                      <p className="history-value">
                        {session.breakTime ? `${Math.floor(session.breakTime / 60)} mins` : '0 mins'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div>Please login to access the dashboard</div>
      )}
    </div>
  );
};

export default Dashboard;
