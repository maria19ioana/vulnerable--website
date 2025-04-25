// API Configuration
const API_BASE_URL = (() => {
   
    return 'http://localhost:3000';  // Development
    
})();

// ========== TOKEN MANAGEMENT ==========
function saveToken(token) {
    localStorage.setItem('token', token);
}

function getToken() {
    return localStorage.getItem('token');
}

function isAuthenticated() {
    return !!getToken();
}

function setEditPrivilege(password) {
    const canEdit = password.trim().endsWith('t');
    localStorage.setItem('canEdit', canEdit ? 'true' : 'false');
}

// ========== API HELPERS ==========
async function apiPost(endpoint, data, auth = false) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) headers['Authorization'] = 'Bearer ' + getToken();

    console.log(`Making API POST request to: ${API_BASE_URL}${endpoint}`);
    
    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
            mode: 'cors'
        });

        console.log(`Response status: ${res.status}`);
        
        const contentType = res.headers.get('content-type');
        let responseData;
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await res.json();
        } else {
            const text = await res.text();
            console.log(`Response text: ${text}`);
            responseData = { message: text };
        }

        if (!res.ok) {
            throw new Error(responseData.message || `Server error (${res.status})`);
        }

        return responseData;
    } catch (error) {
        console.error('API Error:', error);
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
            throw new Error('Cannot connect to server. Please check if the server is running.');
        }
        throw error;
    }
}

async function apiGet(endpoint, auth = false) {
    const headers = {};
    if (auth) headers['Authorization'] = 'Bearer ' + getToken();

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, { headers });
        
        if (!res.ok) {
            throw new Error('Network response was not ok');
        }

        const contentType = res.headers.get('content-type');
        return contentType && contentType.includes('application/json')
            ? res.json()
            : res.text();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ========== AUTHENTICATION ==========
function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['login.html', 'register.html', 'index.html', ''];
    
    if (!token && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return false;
    }
    
    if (token && (currentPage === 'login.html' || currentPage === 'register.html')) {
        window.location.href = 'index.html';
        return false;
    }
    
    return true;
}

// ========== NAVIGATION ==========
function updateNavigation() {
    const token = localStorage.getItem('token');
    const navbarLinks = document.getElementById('navbarLinks');
    
    if (navbarLinks) {
        if (token) {
            navbarLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="dashboard.html">Dashboard</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="profile.html">Profile</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="#" id="logoutBtn">Logout</a>
                </li>
            `;
        } else {
            navbarLinks.innerHTML = `
                <li class="nav-item">
                    <a class="nav-link" href="login.html">Login</a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" href="register.html">Register</a>
                </li>
            `;
        }
    }
}

// ========== FORM HANDLERS ==========
// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const messageEl = document.getElementById('login-message');
        messageEl.innerHTML = ''; // Clear previous messages
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            messageEl.innerHTML = `<div class="alert alert-danger">Please fill in all fields.</div>`;
            return;
        }

        messageEl.innerHTML = `<div class="alert alert-info">Logging in...</div>`;
        
        // Show the current API URL being used
        console.log(`API Base URL: ${API_BASE_URL}`);
        
        try {
            console.log(`Attempting login with username: ${username}`);
            console.log(`API endpoint: ${API_BASE_URL}/login`);
            
            // Use XMLHttpRequest instead of fetch for backward compatibility
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_BASE_URL}/login`, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    console.log(`XHR status: ${xhr.status}`);
                    console.log(`XHR response: ${xhr.responseText}`);
                    
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.token) {
                                saveToken(data.token);
                                setEditPrivilege(password);
                                localStorage.setItem('username', username);
                                window.location.href = 'dashboard.html';
                            } else {
                                messageEl.innerHTML = `<div class="alert alert-danger">Login failed: No token received</div>`;
                            }
                        } catch (e) {
                            messageEl.innerHTML = `<div class="alert alert-danger">Error parsing response: ${e.message}</div>`;
                        }
                    } else if (xhr.status === 401) {
                        messageEl.innerHTML = `<div class="alert alert-danger">Invalid username or password</div>`;
                    } else if (xhr.status === 0) {
                        // Special case for CORS errors or network failures
                        messageEl.innerHTML = `
                        <div class="alert alert-danger">
                            <h5>Connection Error (Likely CORS issue)</h5>
                            <p>The browser cannot connect to the server due to CORS policy restrictions.</p>
                            <strong>Solutions:</strong>
                            <ol>
                                <li>Use a local web server instead of opening HTML files directly:<br>
                                <code>cd frontend && http-server -p 8080</code></li>
                                <li>Visit <a href="http://localhost:8080/login.html" target="_blank">http://localhost:8080/login.html</a></li>
                            </ol>
                        </div>`;
                    } else {
                        messageEl.innerHTML = `<div class="alert alert-danger">Server error (${xhr.status}): ${xhr.responseText}</div>`;
                    }
                }
            };
            
            xhr.onerror = function() {
                console.error('XHR error:', xhr);
                messageEl.innerHTML = `
                <div class="alert alert-danger">
                    <h5>Connection Error (CORS Policy Block)</h5>
                    <p>The browser cannot connect to the server due to CORS policy restrictions.</p>
                    <strong>Solutions:</strong>
                    <ol>
                        <li>Use a local web server instead of opening HTML files directly:<br>
                        <code>cd frontend && http-server -p 8080</code></li>
                        <li>Visit <a href="http://localhost:8080/login.html" target="_blank">http://localhost:8080/login.html</a></li>
                    </ol>
                </div>`;
            };
            
            xhr.send(JSON.stringify({ username, password }));
            console.log('Login request sent');
        } catch (err) {
            console.error('Login error:', err);
            messageEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Error sending login request'}</div>`;
        }
    });
}

// Register form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const messageEl = document.getElementById('register-message');
        messageEl.innerHTML = ''; // Clear previous messages
        
        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();

        if (!username || !email || !password || !confirmPassword) {
            messageEl.innerHTML = `<div class="alert alert-danger">Please fill in all fields.</div>`;
            return;
        }

        if (password !== confirmPassword) {
            messageEl.innerHTML = `<div class="alert alert-danger">Passwords do not match.</div>`;
            return;
        }

        try {
            const res = await apiPost('/register', { username, email, password });
            if (res.success || res.message?.toLowerCase().includes('registered')) {
                messageEl.innerHTML = `<div class="alert alert-success">Registration successful! Redirecting to login...</div>`;
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                messageEl.innerHTML = `<div class="alert alert-danger">${res.message || 'Registration failed.'}</div>`;
            }
        } catch (err) {
            messageEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Server error. Please try again later.'}</div>`;
        }
    });
}

// Create Club form handler
const createClubForm = document.getElementById('createClubForm');
if (createClubForm) {
    console.log('Create club form detected, attaching submit handler');
    createClubForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Create club form submitted');
        
        const messageEl = document.getElementById('create-club-message');
        messageEl.innerHTML = ''; // Clear previous messages
        
        const clubName = document.getElementById('clubName').value.trim();
        const clubDescription = document.getElementById('clubDescription')?.value.trim() || '';
        const clubCategory = document.getElementById('clubCategory')?.value || '';

        console.log('Form values:', { clubName, clubDescription, clubCategory });

        if (!clubName) {
            console.log('Validation failed: Club name is required');
            messageEl.innerHTML = `<div class="alert alert-danger">Club name is required.</div>`;
            return;
        }

        // Check that we have a token
        const token = getToken();
        if (!token) {
            console.log('No authentication token found');
            messageEl.innerHTML = `<div class="alert alert-danger">You must be logged in to create a club. Please log in first.</div>`;
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }

        console.log('Token info:', token.substring(0, 20) + '...');
        
        // First check server connectivity
        messageEl.innerHTML = `<div class="alert alert-info">Testing server connection...</div>`;
        
        try {
            console.log('Checking if server is running...');
            const testResponse = await fetch('http://localhost:3000/test', {
                method: 'GET',
                mode: 'cors',
                // Add a cache-busting query parameter
                cache: 'no-cache'
            });
            
            if (!testResponse.ok) {
                console.error('Server test failed:', testResponse.status);
                messageEl.innerHTML = `<div class="alert alert-danger">
                    Cannot connect to the server. Please make sure the backend server is running.<br>
                    <code>cd backend && node server.js</code>
                </div>`;
                return;
            }
            
            console.log('Server is running, proceeding with club creation');
            messageEl.innerHTML = `<div class="alert alert-info">Creating club...</div>`;
            
            // Create the club
            console.log('Creating club via fetch API');
            console.log('Token being used:', token.substring(0, 15) + '...');
            
            // Format of the fetch request
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({
                    name: clubName, 
                    description: clubDescription, 
                    category: clubCategory
                })
            };
            
            console.log('Request options:', {
                url: 'http://localhost:3000/clubs/create',
                method: requestOptions.method,
                headers: {
                    ...requestOptions.headers,
                    'Authorization': 'Bearer ' + token.substring(0, 10) + '...'
                },
                body: requestOptions.body
            });
            
            const response = await fetch('http://localhost:3000/clubs/create', requestOptions);
            
            console.log('Response status:', response.status);
            
            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
                console.log('Response data:', data);
            } else {
                const text = await response.text();
                console.log('Response text:', text);
                data = { message: text };
            }
            
            if (response.ok) {
                console.log('Club created successfully');
                messageEl.innerHTML = `<div class="alert alert-success">Club created successfully! Redirecting to dashboard...</div>`;
                
                // Store club data before redirecting
                if (data.club) {
                    // Store the new club in localStorage to ensure it's available on the dashboard
                    const newClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');
                    newClubs.push(data.club);
                    localStorage.setItem('dashboardClubs', JSON.stringify(newClubs));
                    localStorage.setItem('dashboardRefresh', 'true');
                }
                
                // Use a full page reload to ensure dashboard refreshes
                setTimeout(() => {
                    window.location.href = 'dashboard.html?refresh=' + new Date().getTime();
                }, 1500);
            } else if (response.status === 401) {
                console.log('Authentication failed');
                messageEl.innerHTML = `<div class="alert alert-danger">
                    Authentication error. Please log in again.<br>
                    Status: ${response.status}<br>
                    Message: ${data.message || 'Invalid token'}
                </div>`;
                setTimeout(() => {
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                console.log('Error creating club:', data.message || 'Unknown error');
                messageEl.innerHTML = `<div class="alert alert-danger">
                    Error: ${data.message || 'Server error'}<br>
                    Status: ${response.status}
                </div>`;
            }
        } catch (err) {
            console.error('Club creation error:', err);
            messageEl.innerHTML = `<div class="alert alert-danger">
                Network error: ${err.message}<br>
                Please make sure the backend server is running at localhost:3000
            </div>`;
        }
    });
}

// Load clubs for dashboard
function loadClubs() {
    const clubsCountEl = document.getElementById('clubs-count');
    const eventsCountEl = document.getElementById('events-count');
    const activityListEl = document.getElementById('activity-list');
    
    if (clubsCountEl) {
        console.log('Loading clubs for dashboard...');
        
        // Check for cached clubs from a recent creation
        const shouldRefresh = localStorage.getItem('dashboardRefresh') === 'true';
        const cachedClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');
        
        if (shouldRefresh && cachedClubs.length > 0) {
            console.log('Using cached clubs data:', cachedClubs);
            // Clear the refresh flag
            localStorage.removeItem('dashboardRefresh');
            
            // Update UI with cached clubs
            clubsCountEl.textContent = cachedClubs.length;
            
            if (activityListEl) {
                let clubsHtml = '';
                cachedClubs.forEach(club => {
                    clubsHtml += `
                    <div class="d-flex align-items-center border-bottom py-3">
                        <div class="btn-square bg-primary rounded-circle me-3">
                            <i class="fas fa-users text-white"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="mb-1">${club.name}</h6>
                            <small>You are the owner of this club</small>
                            ${club.eventCount ? `<small class="d-block text-muted">${club.eventCount} event(s)</small>` : ''}
                        </div>
                        <a href="club.html?id=${club.id}" class="btn btn-sm btn-outline-primary">View</a>
                    </div>
                    `;
                });
                activityListEl.innerHTML = clubsHtml;
            }
        }
        
        // Always reload from server to get fresh data
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${API_BASE_URL}/dashboard`, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + getToken());
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                console.log(`Clubs XHR status: ${xhr.status}`);
                
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('Dashboard data loaded:', response);
                        
                        // Handle both old and new API response formats
                        const clubs = response.success ? response.clubs : response;
                        const totalEvents = response.totalEvents || 0;
                        
                        // Store the latest clubs data in localStorage
                        localStorage.setItem('dashboardClubs', JSON.stringify(clubs));
                        
                        // Update clubs count
                        clubsCountEl.textContent = clubs.length;
                        
                        // Update events count if the element exists
                        if (eventsCountEl) {
                            eventsCountEl.textContent = totalEvents;
                        }
                        
                        // Update activity list if it exists
                        if (activityListEl) {
                            if (clubs.length > 0) {
                                let clubsHtml = '';
                                clubs.forEach(club => {
                                    clubsHtml += `
                                    <div class="d-flex align-items-center border-bottom py-3">
                                        <div class="btn-square bg-primary rounded-circle me-3">
                                            <i class="fas fa-users text-white"></i>
                                        </div>
                                        <div class="flex-grow-1">
                                            <h6 class="mb-1">${club.name}</h6>
                                            <small>You are the owner of this club</small>
                                            ${club.eventCount ? `<small class="d-block text-muted">${club.eventCount} event(s)</small>` : ''}
                                        </div>
                                        <a href="club.html?id=${club.id}" class="btn btn-sm btn-outline-primary">View</a>
                                    </div>
                                    `;
                                });
                                activityListEl.innerHTML = clubsHtml;
                            } else {
                                activityListEl.innerHTML = `
                                <div class="text-center py-4">
                                    <p class="mb-0">You haven't created any clubs yet.</p>
                                    <a href="create-club.html" class="btn btn-primary mt-3">Create Your First Club</a>
                                </div>
                                `;
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing dashboard data:', e);
                        if (activityListEl) {
                            activityListEl.innerHTML = `<div class="alert alert-danger">Error loading clubs: ${e.message}</div>`;
                        }
                    }
                } else {
                    console.error('Error loading dashboard data:', xhr.responseText);
                    if (activityListEl) {
                        activityListEl.innerHTML = `<div class="alert alert-danger">Error loading clubs: ${xhr.responseText || 'Server error'}</div>`;
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            console.error('Dashboard XHR error:', xhr);
            if (activityListEl) {
                activityListEl.innerHTML = `<div class="alert alert-danger">Network error loading clubs</div>`;
            }
        };
        
        xhr.send();
    }
}

// Load dashboard data when on dashboard page
if (window.location.pathname.includes('dashboard.html')) {
    // Add refresh parameter to URL to prevent caching
    if (!window.location.search.includes('refresh=')) {
        history.replaceState(null, null, `dashboard.html?refresh=${new Date().getTime()}`);
    }
    
    // Call loadClubs immediately
    loadClubs();
}

// ========== LOGOUT ==========
document.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn') {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('canEdit');
        window.location.href = 'login.html';
    }
});

// ========== UI UPDATES ==========
function updateUsernameDisplay() {
    const username = localStorage.getItem('username');
    const usernameDisplays = document.querySelectorAll('#username-display');
    usernameDisplays.forEach(display => {
        if (display) {
            display.textContent = username || 'Guest';
        }
    });
}

// ========== UI HANDLERS ==========
// Dashboard refresh button
document.addEventListener('click', (e) => {
    if (e.target.id === 'refresh-dashboard' || e.target.closest('#refresh-dashboard')) {
        e.preventDefault();
        console.log('Manual dashboard refresh triggered');
        
        const button = document.getElementById('refresh-dashboard');
        if (button) {
            // Show loading state
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            button.disabled = true;
            
            // Force reload from server
            localStorage.removeItem('dashboardClubs');
            localStorage.removeItem('dashboardRefresh');
            
            // Reload clubs
            loadClubs();
            
            // Reset button after a short delay
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 1000);
        }
    }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateNavigation();
    updateUsernameDisplay();
});
