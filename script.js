// Global state
let projects = [];
let filteredProjects = [];
let isAuthenticated = false;

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const uploadBtn = document.getElementById('uploadBtn');
const loginModal = document.getElementById('loginModal');
const uploadModal = document.getElementById('uploadModal');
const closeModal = document.getElementById('closeModal');
const closeLoginModal = document.getElementById('closeLoginModal');
const cancelBtn = document.getElementById('cancelBtn');
const cancelLoginBtn = document.getElementById('cancelLoginBtn');
const uploadForm = document.getElementById('uploadForm');
const loginForm = document.getElementById('loginForm');
const projectsGrid = document.getElementById('projectsGrid');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const projectCount = document.getElementById('projectCount');
const profileImage = document.getElementById('profileImage');
const profileImageInput = document.getElementById('profileImageInput');
const imagePlaceholder = document.getElementById('imagePlaceholder');
const profileImageContainer = document.getElementById('profileImageContainer');

// Check authentication status on load
function checkAuthStatus() {
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
        isAuthenticated = true;
    }
    updateAuthUI();
}

// Update UI based on authentication status
function updateAuthUI() {
    if (isAuthenticated) {
        loginBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        uploadBtn.style.display = 'inline-block';
        // Show delete buttons on all projects
        renderProjects();
    } else {
        loginBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        uploadBtn.style.display = 'none';
        // Hide delete buttons on all projects
        renderProjects();
    }
}

// Logout function
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('isAuthenticated');
    updateAuthUI();
    showMessage('Logged out successfully', 'success');
}

// Event Listeners
loginBtn.addEventListener('click', () => {
    loginModal.style.display = 'block';
});

closeLoginModal.addEventListener('click', () => {
    loginModal.style.display = 'none';
    loginForm.reset();
});

cancelLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'none';
    loginForm.reset();
});

loginForm.addEventListener('submit', handleLogin);

logoutBtn.addEventListener('click', logout);

uploadBtn.addEventListener('click', () => {
    if (isAuthenticated) {
        uploadModal.style.display = 'block';
    }
});

closeModal.addEventListener('click', () => {
    uploadModal.style.display = 'none';
    uploadForm.reset();
});

cancelBtn.addEventListener('click', () => {
    uploadModal.style.display = 'none';
    uploadForm.reset();
});

window.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
        uploadModal.style.display = 'none';
        uploadForm.reset();
    }
    if (e.target === loginModal) {
        loginModal.style.display = 'none';
        loginForm.reset();
    }
});

uploadForm.addEventListener('submit', handleUpload);

searchInput.addEventListener('input', filterProjects);
categoryFilter.addEventListener('change', filterProjects);

// Profile picture event listeners
if (imagePlaceholder) {
    imagePlaceholder.addEventListener('click', () => {
        profileImageInput.click();
    });
}

if (profileImageInput) {
    profileImageInput.addEventListener('change', handleProfileImageUpload);
}

// Functions
async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        projects = await response.json();
        filteredProjects = [...projects];
        updateProjectCount();
        renderProjects();
    } catch (error) {
        console.error('Error loading projects:', error);
        showMessage('Error loading projects', 'error');
    }
}

function renderProjects() {
    updateProjectCount();

    if (filteredProjects.length === 0) {
        projectsGrid.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    projectsGrid.style.display = 'grid';
    emptyState.style.display = 'none';

    projectsGrid.innerHTML = filteredProjects.map(project => `
        <div class="project-card">
            <div class="project-header">
                <div>
                    <h3 class="project-title">${escapeHtml(project.title)}</h3>
                    <span class="project-category">${escapeHtml(project.category)}</span>
                </div>
                ${isAuthenticated ? `<button class="delete-btn" onclick="deleteProject('${project.id}')" title="Delete project">×</button>` : ''}
            </div>
            
            ${project.description ? `<p class="project-description">${escapeHtml(project.description)}</p>` : ''}
            
            ${project.tags && project.tags.length > 0 ? `
                <div class="project-tags">
                    ${project.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                </div>
            ` : ''}
            
            <a href="/uploads/${project.fileName}" class="project-file" target="_blank" download="${project.originalName}">
                📎 ${escapeHtml(project.originalName)}
            </a>
            
            <div class="project-footer">
                <span class="project-date">${formatDate(project.uploadDate)}</span>
                ${project.link ? `<a href="${escapeHtml(project.link)}" class="project-link" target="_blank">View Project →</a>` : ''}
            </div>
        </div>
    `).join('');
}

function filterProjects() {
    const searchTerm = searchInput.value.toLowerCase();
    const category = categoryFilter.value;

    filteredProjects = projects.filter(project => {
        const matchesSearch = !searchTerm || 
            project.title.toLowerCase().includes(searchTerm) ||
            project.description.toLowerCase().includes(searchTerm) ||
            project.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        const matchesCategory = !category || project.category === category;

        return matchesSearch && matchesCategory;
    });

    renderProjects();
}

function updateProjectCount() {
    if (!projectCount) return;

    const total = projects.length;

    if (total === 0) {
        projectCount.textContent = 'No projects uploaded yet';
        return;
    }

    projectCount.textContent = total === 1
        ? '1 project uploaded'
        : `${total} projects uploaded`;
}

async function handleUpload(e) {
    e.preventDefault();

    if (!isAuthenticated) {
        showMessage('Please login to upload projects', 'error');
        uploadModal.style.display = 'none';
        loginModal.style.display = 'block';
        return;
    }

    // Get password from localStorage or prompt
    const password = prompt('Please enter your password to confirm upload:');
    if (!password) {
        return;
    }

    const formData = new FormData(uploadForm);
    formData.append('password', password);
    
    const submitBtn = uploadForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';

        const response = await fetch('/api/projects', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('Project uploaded successfully!', 'success');
            uploadModal.style.display = 'none';
            uploadForm.reset();
            await loadProjects();
        } else {
            showMessage(result.error || 'Failed to upload project', 'error');
        }
    } catch (error) {
        console.error('Error uploading project:', error);
        showMessage('Error uploading project. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        if (response.ok) {
            isAuthenticated = true;
            localStorage.setItem('isAuthenticated', 'true');
            updateAuthUI();
            loginModal.style.display = 'none';
            loginForm.reset();
            showMessage('Login successful! You can now edit projects.', 'success');
        } else {
            showMessage(result.error || 'Incorrect password', 'error');
            loginForm.reset();
        }
    } catch (error) {
        console.error('Error logging in:', error);
        showMessage('Error logging in. Please try again.', 'error');
    }
}

async function deleteProject(id) {
    if (!isAuthenticated) {
        showMessage('Please login to delete projects', 'error');
        loginModal.style.display = 'block';
        return;
    }

    if (!confirm('Are you sure you want to delete this project?')) {
        return;
    }

    // Get password from localStorage or prompt
    const password = prompt('Please enter your password to confirm deletion:');
    if (!password) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            showMessage('Project deleted successfully', 'success');
            await loadProjects();
        } else {
            const result = await response.json();
            showMessage(result.error || 'Failed to delete project', 'error');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showMessage('Error deleting project. Please try again.', 'error');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type} show`;
    messageDiv.textContent = message;

    // Insert at the top of main
    const main = document.querySelector('main');
    main.insertBefore(messageDiv, main.firstChild);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

// Make deleteProject available globally
window.deleteProject = deleteProject;

// Profile picture functions
async function loadProfileImage() {
    try {
        const response = await fetch('/api/profile');
        const profile = await response.json();
        
        if (profile.profileImage) {
            profileImage.src = `/uploads/${profile.profileImage}`;
            profileImage.style.display = 'block';
            if (imagePlaceholder) {
                imagePlaceholder.style.opacity = '0';
                imagePlaceholder.style.pointerEvents = 'none';
            }
        } else {
            profileImage.style.display = 'none';
            if (imagePlaceholder) {
                imagePlaceholder.style.opacity = '1';
                imagePlaceholder.style.pointerEvents = 'auto';
            }
        }
    } catch (error) {
        console.error('Error loading profile image:', error);
    }
}

async function handleProfileImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showMessage('Please select an image file (JPG, PNG, or GIF)', 'error');
        e.target.value = ''; // Reset file input
        return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('Image file is too large. Please select an image under 5MB.', 'error');
        e.target.value = ''; // Reset file input
        return;
    }

    const formData = new FormData();
    formData.append('image', file);

    // Show loading state
    if (imagePlaceholder) {
        imagePlaceholder.innerHTML = '<span>⏳</span><p>Uploading...</p>';
    }

    try {
        const response = await fetch('/api/profile/image', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            profileImage.src = `/uploads/${result.profileImage}`;
            profileImage.style.display = 'block';
            if (imagePlaceholder) {
                imagePlaceholder.style.opacity = '0';
                imagePlaceholder.style.pointerEvents = 'none';
                imagePlaceholder.innerHTML = '<span>📷</span><p>Click to add your photo</p>';
            }
            showMessage('Profile picture updated successfully!', 'success');
        } else {
            showMessage(result.error || 'Failed to upload profile picture', 'error');
            if (imagePlaceholder) {
                imagePlaceholder.style.opacity = '1';
                imagePlaceholder.style.pointerEvents = 'auto';
                imagePlaceholder.innerHTML = '<span>📷</span><p>Click to add your photo</p>';
            }
        }
    } catch (error) {
        console.error('Error uploading profile image:', error);
        showMessage('Error uploading profile picture. Please check your connection and try again.', 'error');
        if (imagePlaceholder) {
            imagePlaceholder.style.opacity = '1';
            imagePlaceholder.style.pointerEvents = 'auto';
            imagePlaceholder.innerHTML = '<span>📷</span><p>Click to add your photo</p>';
        }
    } finally {
        // Reset file input
        e.target.value = '';
    }
}

// Load projects and profile image on page load
checkAuthStatus();
loadProjects();
loadProfileImage();

