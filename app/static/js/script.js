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

    fetch("https://athkau-calix-app-c9fda0bwggb3cxhn.uaenorth-01.azurewebsites.net/upload", {
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

function togglelePasswordVisibility(inputId) {
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

