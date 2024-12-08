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
let audio = null;

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
        // Add loading animation (three dots moving in a wave)
        recordButton.innerHTML = `
            <div class="dots-loader">
                <span></span><span></span><span></span>
            </div>`;
        recordButton.classList.add('loading');
    }

    isRecording = !isRecording;
}

function toggleRecallMic() {
    const micButton = document.getElementById("recall-mic-button");
    const micIcon = document.getElementById("recall-mic-icon");

    if (!isRecording) {
        startRecording();
        micButton.classList.add("stop-active");
        micButton.style.backgroundColor = "red"; // Change to red
        micIcon.classList.remove("fa-microphone");
        micIcon.classList.add("fa-stop");
        disableNavigation();
    } else {
        stopRecallRecording();
        micButton.innerHTML = `
            <div class="dots-loader">
                <span></span><span></span><span></span>
            </div>`;
        micButton.style.backgroundColor = "red"; // Keep red during loading
        micButton.classList.add("loading");
    }

    isRecording = !isRecording;
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

// Function to stop recording
function stopRecallRecording() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
        mediaRecorder.stop();

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
            audioChunks = [];

            // Create a file-like object with a unique name
            const audioFile = new File([audioBlob], "query_recording.webm", { type: "audio/webm" });

            // Send the file to the Flask API
            uploadRecallAudio(audioFile);
        };
    }
}

function addStopButton() {
    const micButton = document.getElementById("recall-mic-button");
    const stopButton = document.createElement("button");
    stopButton.id = "stop-audio-button";
    stopButton.innerText = "Stop";

    stopButton.onclick = () => {
        if (audio) {
            audio.pause(); // Pause the audio
            audio.currentTime = 0; // Reset audio playback to the start
            resetRecallButton(); // Reset button and UI elements
        }
    };

    micButton.parentNode.appendChild(stopButton);
}

function resetRecallButton() {
    const micButton = document.getElementById("recall-mic-button");
    const micIcon = document.createElement("i");

    // Restore the microphone icon
    micIcon.id = "recall-mic-icon";
    micIcon.className = "fas fa-microphone";
    micButton.innerHTML = ""; // Clear button content
    micButton.appendChild(micIcon);

    // Reset button background and classes
    micButton.classList.remove("stop-active", "loading", "playing");
    micButton.style.backgroundColor = ""; // Ensure background color resets to default

    // Remove the stop button if it exists
    const stopButton = document.getElementById("stop-audio-button");
    if (stopButton) {
        stopButton.parentNode.removeChild(stopButton);
    }

    // Reset the response container to its default size
    const responseContainer = document.querySelector(".response-container");
    const responseText = document.getElementById("response-text");
    responseContainer.classList.remove("expanded");
    responseText.innerText = ""; // Clear text content
    responseText.removeAttribute("data-placeholder"); // Reset placeholder

    // Re-enable navigation
    enableNavigation();
}

function uploadRecallAudio(audioFile) {
    const micButton = document.getElementById("recall-mic-button");
    const responseContainer = document.querySelector(".response-container");
    const responseText = document.getElementById("response-text");
    const formData = new FormData();
    formData.append("audio", audioFile);

    // Set placeholder text initially
    responseText.setAttribute("data-placeholder", "Your response will appear here...");

    fetch("https://athkau-calix-app-c9fda0bwggb3cxhn.uaenorth-01.azurewebsites.net/speech_recall", {
        method: "POST",
        body: formData,
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch audio response");
            }
            return response.json();
        })
        .then((data) => {
            const responseTextContent = data.response_text; // Full response text
            const audioBase64 = data.audio_base64;

            if (!audioBase64) {
                throw new Error("Audio base64 is missing in the response");
            }

            // Decode Base64 audio and create audio URL
            const binaryString = atob(audioBase64);
            const audioBlob = new Blob([Uint8Array.from(binaryString, (c) => c.charCodeAt(0))], { type: "audio/mpeg" });
            const audioUrl = URL.createObjectURL(audioBlob);
            audio = new Audio(audioUrl); // Assign to global audio instance

            // Expand response container
            responseContainer.classList.add("expanded");
            responseText.classList.add("updated"); // Remove placeholder effect
            typeWriterResponse(responseTextContent);

            // Play audio with visual feedback
            audio.onplay = () => {
                micButton.classList.add("playing");
                addStopButton();
            };

            // Reset state after audio ends
            audio.onended = () => {
                resetRecallButton();
            };

            audio.play();
        })
        .catch((error) => {
            console.error("Error uploading audio or handling response:", error);
            resetRecallButton(); // Reset button on error
        });
}

function typeWriterResponse(text) {
    const responseText = document.getElementById("response-text");
    responseText.innerHTML = ""; // Clear previous content

    const spanElement = document.createElement("span");
    spanElement.classList.add("typing-caret"); // Add caret effect
    responseText.appendChild(spanElement);

    let index = 0;

    function type() {
        if (index < text.length) {
            spanElement.textContent += text.charAt(index); // Add one character at a time
            index++;
            setTimeout(type, 60); // Adjust typing speed
        } else {
            spanElement.classList.remove("typing-caret"); // Remove caret after typing
        }
    }

    type();
}



// Function to upload audio to the Flask API
function uploadAudio(audioFile) {
    const recordButton = document.getElementById('record-button');

    const formData = new FormData();
    formData.append("audio", audioFile);

    fetch("https://athkau-calix-app-c9fda0bwggb3cxhn.uaenorth-01.azurewebsites.net/upload", {
        method: "POST",
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            console.log("Audio uploaded successfully:", data);
            alert('Document Uploaded successfully');

            // Revert to original button content
            resetButtonToOriginalState();
            enableNavigation();
        })
        .catch((error) => {
            console.error("Error uploading audio:", error);

            // Revert to original button content even if upload fails
            resetButtonToOriginalState();
        });
}

// Function to reset the button to its original state
function resetButtonToOriginalState() {
    const recordButton = document.getElementById('record-button');
    const micIcon = document.createElement('i'); // Recreate the microphone icon

    micIcon.id = 'mic-icon';
    micIcon.className = 'fa fa-microphone'; // Add microphone icon classes
    recordButton.innerHTML = ''; // Clear current button content
    recordButton.appendChild(micIcon); // Add the recreated icon
    recordButton.classList.remove('stop-active', 'loading');
}

const menuToggle = document.getElementById("menu-toggle");
const menuOverlay = document.getElementById("menu-overlay");
const documentList = document.getElementById("document-list");

// Toggle menu visibility
menuToggle.addEventListener("click", () => {
    const isActive = menuOverlay.classList.toggle("active");
    document.body.classList.toggle("menu-active", isActive);

    if (isActive) {
        disableNavigation(); // Disable navigation when menu is active
        fetchDocuments(); // Always fetch documents when the menu is opened
    } else {
        enableNavigation(); // Enable navigation when menu is closed
    }
});

// Close menu when clicking outside
document.addEventListener("click", (e) => {
    const isMenuActive = menuOverlay.classList.contains("active");

    // Close menu only if clicking outside menu content
    if (isMenuActive && !menuOverlay.contains(e.target) && e.target !== menuToggle) {
        menuOverlay.classList.remove("active");
        document.body.classList.remove("menu-active");
        enableNavigation(); // Re-enable navigation when menu is closed
    }
});

function fetchDocuments() {
    fetch("https://athkau-calix-app-c9fda0bwggb3cxhn.uaenorth-01.azurewebsites.net/documents")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((documents) => {
            if (documents.length === 0) {
                documentList.innerHTML = `<li>No documents available</li>`;
            } else {
                documentList.innerHTML = documents
                    .map(
                        (doc) =>
                            `<li><a href="${doc.url}" target="_blank">${doc.name}</a></li>`
                    )
                    .join("");
            }
        })
        .catch((error) => {
            console.error("Error fetching documents:", error);
            documentList.innerHTML = `<li>Failed to load documents</li>`;
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

