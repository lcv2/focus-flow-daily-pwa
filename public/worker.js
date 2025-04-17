
// Web worker for task rollover

// Function to check and perform task rollover
async function checkAndRolloverTasks() {
  try {
    // Post message to main thread to perform rollover
    self.postMessage({ type: 'ROLLOVER_TASKS' });
  } catch (error) {
    console.error('Error in worker rollover:', error);
  }
}

// Set up interval to check at 00:05 every day (5 minutes after midnight)
function setupDailyRollover() {
  // Initial check for time close to midnight
  checkTime();
  
  // Then check every minute to see if we're at the target time
  setInterval(checkTime, 60000); // Check every minute
}

function checkTime() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // If it's 00:05 (5 minutes after midnight), perform rollover
  if (hours === 0 && minutes === 5) {
    checkAndRolloverTasks();
  }
}

// Respond to messages from main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'INIT') {
    setupDailyRollover();
  }
});

// Start the daily check
setupDailyRollover();
