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

function toggleRecording() {
    const recordButton = document.getElementById('record-button');
    const micIcon = document.getElementById('mic-icon');

    if (micIcon.classList.contains('fa-microphone')) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-stop');
        recordButton.classList.add('stop-active'); // Change background to red for stop
        disableNavigation(); // Disable all navigation when recording starts
    } else {
        micIcon.classList.remove('fa-stop');
        micIcon.classList.add('fa-microphone');
        recordButton.classList.remove('stop-active'); // Revert background to purple
        enableNavigation(); // Re-enable all navigation when recording stops
    }
}

function toggleRecallMic() {
    const recallMicButton = document.getElementById('recall-mic-button');
    const recallMicIcon = document.getElementById('recall-mic-icon');

    if (recallMicIcon.classList.contains('fa-microphone')) {
        recallMicIcon.classList.remove('fa-microphone');
        recallMicIcon.classList.add('fa-stop');
        recallMicButton.classList.add('stop-active'); // Change background to red for stop
        disableNavigation(); // Disable all navigation when recording starts
    } else {
        recallMicIcon.classList.remove('fa-stop');
        recallMicIcon.classList.add('fa-microphone');
        recallMicButton.classList.remove('stop-active'); // Revert background to purple
        enableNavigation(); // Re-enable all navigation when recording stops
    }
}

function togglePasswordVisibility(inputId) {
    const passwordInput = document.getElementById(inputId);
    const toggleIcon = passwordInput.nextElementSibling; // Select the icon next to the input

    if (passwordInput.type === "password" ) {
        passwordInput.type = "text";
        toggleIcon.classList.remove("fa-eye");
        toggleIcon.classList.add("fa-eye-slash"); // Switch icon to "eye-slash"
    } else {
        passwordInput.type = "password";
        toggleIcon.classList.remove("fa-eye-slash");
        toggleIcon.classList.add("fa-eye"); // Switch icon back to "eye"
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

