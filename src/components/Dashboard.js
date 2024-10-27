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

const Dashboard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [captureInterval, setCaptureInterval] = useState(null);

  useEffect(() => {
    fetchSessionHistory();

    return () => {
      if (captureInterval) clearInterval(captureInterval);
    };
  }, [captureInterval]);

  const fetchSessionHistory = async () => {
    try {
      const sessionsRef = collection(firestore, 'work_sessions');
      const q = query(
        sessionsRef, 
        where('userId', '==', auth.currentUser.uid),
        orderBy('clockInTime', 'desc'),
        limit(10)
      );
  
      const querySnapshot = await getDocs(q);
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setSessionHistory(sessions);
    } catch (error) {
      console.error("Error fetching session history:", error);
    }
  };

  const clockIn = async () => {
    try {
      const workSessionsRef = collection(firestore, 'work_sessions');
      const docRef = await addDoc(workSessionsRef, {
        userId: auth.currentUser.uid,
        clockInTime: Timestamp.now(),
        clockOutTime: null,
        breakTime: 0,
        isClockedIn: true,
      });

      setIsClockedIn(true);
      setSessionId(docRef.id);

      // Open clock-in window if Electron is available
      if (window.electron && window.electron.openClockInWindow) {
        window.electron.openClockInWindow();
      }

      console.log("Clocked in successfully with session ID:", docRef.id);

      // Start capturing screenshots every minute
      const interval = setInterval(() => {
        if (window.electron && window.electron.captureScreenshot) {
          console.log("Screenshot taken")
          window.electron.captureScreenshot(); // Trigger screenshot capture

          window.electron.onScreenshotCaptured(async ({ success, path, error }) => {
            if (success) {
              const userId = auth.currentUser.uid;
              const screenshotRef = ref(storage, `screenshots/${userId}/${Date.now()}_screenshot.png`);
              
              // Upload the screenshot to Firebase Storage
              const response = await fetch(`file://${path}`);
              const blob = await response.blob();
              await uploadBytes(screenshotRef, blob);
              const screenshotURL = await getDownloadURL(screenshotRef); // Get URL of uploaded screenshot

              // Save the screenshot URL in Firestore within the current session
              const sessionRef = doc(firestore, 'work_sessions', sessionId);
              const screenshotsCollectionRef = collection(sessionRef, 'screenshots');
              await addDoc(screenshotsCollectionRef, {
                url: screenshotURL,
                timestamp: Timestamp.now(),
              });

              console.log("Screenshot uploaded and URL saved to Firestore:", screenshotURL);
            } else {
              console.error("Screenshot capture failed:", error);
            }
          });
        }
      }, 60000); // 1-minute interval for screenshots

      setCaptureInterval(interval);
    } catch (error) {
      console.error("Error clocking in:", error);
    }
  };

  const clockOut = async () => {
    if (!sessionId) return console.error("No active session found.");

    try {
      const sessionRef = doc(firestore, 'work_sessions', sessionId);
      await updateDoc(sessionRef, {
        clockOutTime: Timestamp.now(),
        isClockedIn: false,
      });

      setIsClockedIn(false);
      setSessionId(null);
      fetchSessionHistory(); // Refresh session history after clock-out
      console.log("Clocked out successfully from session ID:", sessionId);

      // Stop capturing screenshots
      if (captureInterval) {
        clearInterval(captureInterval);
        setCaptureInterval(null);
      }
    } catch (error) {
      console.error("Error clocking out:", error);
    }
  };

  const startBreak = async () => {
    if (!sessionId) return console.error("No active session found.");
    if (isOnBreak) return console.error("Already on break.");

    try {
      const sessionRef = doc(firestore, 'work_sessions', sessionId);
      await updateDoc(sessionRef, {
        breakStartTime: Timestamp.now(),
      });

      setIsOnBreak(true);
      console.log("Break started successfully.");
    } catch (error) {
      console.error("Error starting break:", error);
    }
  };

  const endBreak = async () => {
    if (!sessionId) return console.error("No active session found.");
    if (!isOnBreak) return console.error("Not currently on break.");

    try {
      const sessionRef = doc(firestore, 'work_sessions', sessionId);
      const sessionDoc = await getDoc(sessionRef);
      const breakStartTime = sessionDoc.data().breakStartTime;
      const breakDuration = Timestamp.now().seconds - breakStartTime.seconds;

      await updateDoc(sessionRef, {
        breakTime: sessionDoc.data().breakTime + breakDuration,
        breakStartTime: null,
      });

      setIsOnBreak(false);
      console.log("Break ended successfully.");
    } catch (error) {
      console.error("Error ending break:", error);
    }
  };

  return (
    <div>
      <h2>Dashboard</h2>
      {isClockedIn ? (
        <>
          <button onClick={clockOut}>Clock Out</button>
          {isOnBreak ? (
            <button onClick={endBreak}>End Break</button>
          ) : (
            <button onClick={startBreak}>Start Break</button>
          )}
        </>
      ) : (
        <button onClick={clockIn}>Clock In</button>
      )}

      <h3>Session History</h3>
      <ul>
        {sessionHistory.map((session) => (
          <li key={session.id}>
            <p>Clock In: {new Date(session.clockInTime.seconds * 1000).toLocaleString()}</p>
            <p>Clock Out: {session.clockOutTime ? new Date(session.clockOutTime.seconds * 1000).toLocaleString() : 'Ongoing'}</p>
            <p>Total Break Time: {session.breakTime ? `${Math.floor(session.breakTime / 60)} mins` : '0 mins'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;