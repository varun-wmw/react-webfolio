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

const Dashboard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [captureInterval, setCaptureInterval] = useState(null);

  useEffect(() => {
    fetchSessionHistory();

    // Clean up interval when component unmounts
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
  
  
      console.log("Clocked in successfully with session ID:", docRef.id);
  
      // Start capturing screenshots every minute if Electron is available
      if (window.electron && window.electron.captureScreenshot) {
        console.log("Setting up screenshot capture interval...");
        const interval = setInterval(() => {
          console.log("Attempting to capture screenshot...");
          window.electron.captureScreenshot();
        }, 60000); // 1-minute interval for screenshots
  
        setCaptureInterval(interval);
      } else {
        console.error("Electron API or captureScreenshot function is not available.");
      }
  
      // Ensure the screenshot listener is set up once
      if (window.electron && window.electron.onScreenshotCaptured) {
        console.log("Setting up screenshot capture listener...");
        window.electron.onScreenshotCaptured(async ({ success, path, error }) => {
          if (success) {
            console.log("Screenshot captured:", path);
            const userId = auth.currentUser.uid;
            const screenshotRef = ref(storage, `screenshots/${userId}/${Date.now()}_screenshot.png`);
            
            try {
              // Upload the screenshot to Firebase Storage
              const response = await fetch(`file://${path}`);
              const blob = await response.blob();
              await uploadBytes(screenshotRef, blob);
              const screenshotURL = await getDownloadURL(screenshotRef);
  
              // Save the screenshot URL in Firestore within the current session
              const sessionRef = doc(firestore, 'work_sessions', sessionId);
              const screenshotsCollectionRef = collection(sessionRef, 'screenshots');
              await addDoc(screenshotsCollectionRef, {
                url: screenshotURL,
                timestamp: Timestamp.now(),
              });
  
              console.log("Screenshot uploaded and URL saved to Firestore:", screenshotURL);
            } catch (uploadError) {
              console.error("Error uploading screenshot:", uploadError);
            }
          } else {
            console.error("Screenshot capture failed:", error);
          }
        });
      } else {
        console.error("Electron API or onScreenshotCaptured function is not available.");
      }
    } catch (error) {
      console.error("Error during clock-in:", error);
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
    <div className="dashboard">
      <h2>Dashboard</h2>
      {isClockedIn ? (
        <>
          <button onClick={clockOut} className="clock-out-btn">Clock Out</button>
          {isOnBreak ? (
            <button onClick={endBreak} className="break-btn">End Break</button>
          ) : (
            <button onClick={startBreak} className="break-btn">Start Break</button>
          )}
        </>
      ) : (
        <button onClick={clockIn} className="clock-in-btn">Clock In</button>
      )}

      <div className="session-history">
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
    </div>
  );
};


export default Dashboard;