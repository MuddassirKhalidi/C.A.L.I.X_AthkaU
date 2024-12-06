function activateNav(selectedItem, screenId) {
    // Remove active class from all nav-items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Add active class to the selected nav-item
    selectedItem.classList.add('active');

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    // Show the selected screen
    document.getElementById(screenId).style.display = 'flex';
}

function disableNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.add('disabled'); // Add a CSS class for disabled state
        item.style.pointerEvents = 'none'; // Disable pointer events
    });
}

function enableNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('disabled'); // Remove the disabled class
        item.style.pointerEvents = ''; // Re-enable pointer events
    });
}

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// Function to twebmle recording
function toggleRecording() {
    const recordButton = document.getElementById('record-button');
    const micIcon = document.getElementById('mic-icon');

    if (!isRecording) {
        startRecording();
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-stop');
        recordButton.classList.add('stop-active');
        disableNavigation();
    } else {
        stopRecording();
        micIcon.classList.remove('fa-stop');
        micIcon.classList.add('fa-microphone');
        recordButton.classList.remove('stop-active');
        enableNavigation();
    }

    isRecording = !isRecording;
}

let isRecallRecording = false;

function toggleRecallMic() {
    const recallMicButton = document.getElementById("recall-mic-button");
    const recallMicIcon = document.getElementById("recall-mic-icon");

    if (!isRecallRecording) {
        startRecording();
        recallMicIcon.classList.remove('fa-microphone');
        recallMicIcon.classList.add('fa-stop');
        recallMicButton.classList.add('stop-active'); 
        disableNavigation(); 
    } else {
        stopRecording();
        recallMicIcon.classList.remove("fa-stop");
        recallMicIcon.classList.add("fa-microphone");
        recallMicButton.classList.remove("stop-active");
        enableNavigation();
    }

    isRecallRecording = !isRecallRecording;
}

// Function to start recording
function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorder.start();

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
        })
        .catch((error) => {
            console.error("Error accessing microphone: ", error);
        });
}

// Function to stop recording
function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            audioChunks = [];

            // Create a file-like object with a unique name
            const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

            // Send the file to the Flask API
            uploadAudio(audioFile);
        };
    }
}

// Function to upload audio to the Flask API
function uploadAudio(audioFile) {
    const formData = new FormData();
    formData.append("audio", audioFile);

    fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Audio uploaded successfully:", data);
            alert(data.message); // Notify the user of successful upload
        })
        .catch((error) => {
            console.error("Error uploading audio:", error);
        });
}


// // Handle twebmling recording for the record screen
// async function twebmleRecording() {
//     const recordButton = document.getElementById('record-button');
//     const micIcon = document.getElementById('mic-icon');

//     if (micIcon.classList.contains('fa-microphone')) {
//         // Start recording via the `/start` API endpoint
//         try {
//             const response = await fetch('http://127.0.0.1:5000/start', { method: 'POST' });
//             if (response.ok) {
//                 console.log("Recording started successfully via API.");
//                 micIcon.classList.remove('fa-microphone');
//                 micIcon.classList.add('fa-stop');
//                 recordButton.classList.add('stop-active'); // Change background to red for stop
//                 disableNavigation(); // Disable all navigation when recording starts
//             } else {
//                 console.error("Failed to start recording:", await response.json());
//             }
//         } catch (err) {
//             console.error("Error interacting with /start API:", err);
//         }
//     } else {
//         // Stop recording via the `/stop` API endpoint
//         try {
//             const response = await fetch('http://127.0.0.1:5000/stop', { method: 'POST' });
//             if (response.ok) {
//                 console.log("Recording stopped successfully via API.");
//                 micIcon.classList.remove('fa-stop');
//                 micIcon.classList.add('fa-microphone');
//                 recordButton.classList.remove('stop-active'); // Revert background to purple
//                 enableNavigation(); // Re-enable all navigation when recording stops
//             } else {
//                 console.error("Failed to stop recording:", await response.json());
//             }
//         } catch (err) {
//             console.error("Error interacting with /stop API:", err);
//         }
//     }
// }

// async function twebmleRecallMic() {
//     const recallMicButton = document.getElementById('recall-mic-button');
//     const recallMicIcon = document.getElementById('recall-mic-icon');

//     if (recallMicIcon.classList.contains('fa-microphone')) {
//         // Start recording via the `/start` API endpoint
//         try {
//             const response = await fetch('http://127.0.0.1:5000/start', { method: 'POST' });
//             if (response.ok) {
//                 console.log("Recall recording started successfully via API.");
//                 recallMicIcon.classList.remove('fa-microphone');
//                 recallMicIcon.classList.add('fa-stop');
//                 recallMicButton.classList.add('stop-active'); // Change background to red for stop
//                 disableNavigation(); // Disable all navigation when recording starts
//             } else {
//                 console.error("Failed to start recall recording:", await response.json());
//             }
//         } catch (err) {
//             console.error("Error interacting with /start API:", err);
//         }
//     } else {
//         // Stop recording via the `/stop` API endpoint
//         try {
//             const response = await fetch('http://127.0.0.1:5000/stop', { method: 'POST' });
//             if (response.ok) {
//                 console.log("Recall recording stopped successfully via API.");
//                 recallMicIcon.classList.remove('fa-stop');
//                 recallMicIcon.classList.add('fa-microphone');
//                 recallMicButton.classList.remove('stop-active'); // Revert background to purple
//                 enableNavigation(); // Re-enable all navigation when recording stops
//             } else {
//                 console.error("Failed to stop recall recording:", await response.json());
//             }
//         } catch (err) {
//             console.error("Error interacting with /stop API:", err);
//         }
//     }
// }


function twebmlePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const twebmleIcon = passwordInput.nextElementSibling; // Select the icon next to the input

    if (passwordInput.type === "password" ) {
        passwordInput.type = "text";
        twebmleIcon.classList.remove("fa-eye");
        twebmleIcon.classList.add("fa-eye-slash"); // Switch icon to "eye-slash"
    } else {
        passwordInput.type = "password";
        twebmleIcon.classList.remove("fa-eye-slash");
        twebmleIcon.classList.add("fa-eye"); // Switch icon back to "eye"
    }
}


// Form Validation
function validateForm() {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    // Email Validation
    const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!emailInput.value.match(emailPattern)) {
        alert("Please enter a valid email address.");
        emailInput.focus();
        return false;
    }

    // Password Length Validation
    if (passwordInput.value.length < 8) {
        alert("Password must be at least 8 characters long.");
        passwordInput.focus();
        return false;
    }

    // Confirm Password Match
    if (passwordInput.value !== confirmPasswordInput.value) {
        alert("Passwords do not match. Please re-enter.");
        confirmPasswordInput.focus();
        return false;
    }

    return true; // Submit form if validation passes
}

