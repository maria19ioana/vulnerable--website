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

    console.log(`Making API GET request to: ${API_BASE_URL}${endpoint}`);
    console.log(`Using auth: ${auth ? 'yes' : 'no'}`);
    if (auth) console.log(`Token: ${getToken() ? getToken().substring(0, 15) + '...' : 'not found'}`);

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`, { 
            headers,
            mode: 'cors'
        });
        
        console.log(`Response status: ${res.status}`);
        
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

// Add apiPut helper function
async function apiPut(endpoint, data, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();

  console.log(`Making API PUT request to: ${API_BASE_URL}${endpoint}`);
  
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
      mode: 'cors'
    });

    console.log(`Response status: ${res.status}`);

    // Handle non-JSON responses
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || `Server error (${res.status})`);
      }
      
      return responseData;
    } else {
      // For non-JSON responses, get the text and create a fake response
      const text = await res.text();
      console.error(`Received non-JSON response (${res.status}):`, text.substring(0, 150));
      
      // If success (200-299), return a fabricated success response
      if (res.ok) {
        return { 
          success: true,
          message: 'Operation completed successfully'
        };
      }
      
      // Otherwise, throw an error with the HTML status message if possible
      const errorMatch = text.match(/<pre>(.*?)<\/pre>/);
      throw new Error(errorMatch ? errorMatch[1] : `Server returned ${res.status}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Add apiDelete helper function
async function apiDelete(endpoint, auth = false) {
  const headers = {};
  if (auth) headers['Authorization'] = 'Bearer ' + getToken();

  console.log(`Making API DELETE request to: ${API_BASE_URL}${endpoint}`);
  
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
      mode: 'cors'
    });

    console.log(`Response status: ${res.status}`);

    // Handle non-JSON responses
    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || `Server error (${res.status})`);
      }
      
      return responseData;
    } else {
      // For non-JSON responses, get the text and create a fake response
      const text = await res.text();
      console.error(`Received non-JSON response (${res.status}):`, text.substring(0, 150));
      
      // If success (200-299), return a fabricated success response
      if (res.ok) {
        return { 
          success: true,
          message: 'Operation completed successfully'
        };
      }
      
      // Otherwise, throw an error with the HTML status message if possible
      const errorMatch = text.match(/<pre>(.*?)<\/pre>/);
      throw new Error(errorMatch ? errorMatch[1] : `Server returned ${res.status}`);
    }
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
                                
                                // Store user ID from the login response
                                if (data.id) {
                                    localStorage.setItem('userId', data.id);
                                } else {
                                    // If id not directly provided, try to extract from token
                                    try {
                                        const tokenParts = data.token.split('.');
                                        if (tokenParts.length === 3) {
                                            const payload = JSON.parse(atob(tokenParts[1]));
                                            if (payload.id) {
                                                localStorage.setItem('userId', payload.id);
                                                console.log(`Extracted user ID from token: ${payload.id}`);
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error extracting ID from token:', e);
                                    }
                                }
                                
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

    // Populate club dropdown on create-event page
    if (window.location.pathname.includes('create-event.html')) {
        console.log('Populating event club dropdown');
        loadEventClubs();
    }
});

// Function to load clubs into the event creation select dropdown
async function loadEventClubs() {
    console.log('Loading clubs for event creation...');
    try {
        // Fetch clubs from dashboard endpoint
        const data = await apiGet('/dashboard', true);
        const clubs = data.success ? data.clubs : data;
        const selectEl = document.getElementById('eventClub');
        if (!selectEl) return;
        clubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club.id;
            option.textContent = club.name;
            selectEl.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading clubs for event dropdown:', err);
    }
}

// Create Event form handler
const createEventForm = document.getElementById('createEventForm');
if (createEventForm) {
    console.log('Create event form detected, attaching submit handler');
    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Create event form submitted');

        const messageEl = document.getElementById('create-event-message');
        messageEl.innerHTML = '';

        // Gather form values
        const title = document.getElementById('eventName').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const clubId = document.getElementById('eventClub').value;
        // For now, we'll set private to false by default
        const isPrivate = false;

        if (!title || !description || !clubId) {
            messageEl.innerHTML = `<div class="alert alert-danger">Please fill in all fields and select a club.</div>`;
            return;
        }

        // Show loading state
        messageEl.innerHTML = `<div class="alert alert-info">Creating event...</div>`;

        try {
            const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/events/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + getToken()
                },
                body: JSON.stringify({ title, description, private: isPrivate })
            });

            console.log('Event creation response status:', response.status);
            const text = await response.text();
            console.log('Event creation response text:', text);

            if (response.ok) {
                messageEl.innerHTML = `<div class="alert alert-success">Event created successfully.</div>`;
                // Optionally redirect or clear form
                createEventForm.reset();
            } else if (response.status === 401) {
                messageEl.innerHTML = `<div class="alert alert-danger">Authentication error. Please log in again.</div>`;
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                messageEl.innerHTML = `<div class="alert alert-danger">Error creating event: ${text}</div>`;
            }
        } catch (err) {
            console.error('Error creating event:', err);
            messageEl.innerHTML = `<div class="alert alert-danger">Network error: ${err.message}</div>`;
        }
    });
}

// ========== CLUB DETAILS PAGE ========== //
function loadClubDetails(clubId) {
  console.log(`Loading club details for ID: ${clubId}`);
  
  // Show loading indicators
  document.getElementById('club-name').innerHTML = '<span class="spinner-border text-primary" role="status"></span> Loading Club...';
  document.getElementById('club-description').textContent = 'Fetching club details...';
  document.getElementById('club-category').innerHTML = ''; // Clear category
  document.getElementById('member-list').innerHTML = '<li class="list-group-item text-center"><span class="spinner-border text-primary" role="status"></span> Loading members...</li>';
  document.getElementById('event-list').innerHTML = '<div class="col-12 text-center py-5"><span class="spinner-border text-primary" role="status"></span><p class="mt-2">Loading events...</p></div>';
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No authentication token found, some features may be limited');
    // Continue loading public data but hide actions requiring authentication
    document.getElementById('create-event-btn').classList.add('d-none');
    document.getElementById('invite-member-btn').classList.add('d-none');
  }
  
  // Fetch club details
  apiGet(`/clubs/${clubId}`, token)
    .then(club => {
      console.log('Club details loaded:', club);
      
      // Update club information in the UI
      document.getElementById('club-name').textContent = club.name || 'Unnamed Club';
      document.getElementById('club-description').textContent = club.description || 'No description available';
      
      // Display club category if available
      if (club.category && club.category.trim() !== '') {
        document.getElementById('club-category').innerHTML = `
          <span class="category-badge">
            <i class="fas fa-tag me-2"></i>${club.category}
          </span>
        `;
      } else {
        document.getElementById('club-category').innerHTML = ''; // No category to display
      }
      
      // Get current username
      const username = localStorage.getItem('username');
      
      // Check if current user is the owner and show appropriate actions
      const userId = localStorage.getItem('userId');
      if (userId && club.owner_id === parseInt(userId)) {
        console.log('Current user is the club owner');
        document.getElementById('club-actions').innerHTML = `
          <button class="btn btn-outline-primary me-2" id="edit-club-btn">
            <i class="fas fa-edit"></i> Edit Club
          </button>
          <button class="btn btn-outline-danger" id="delete-club-btn">
            <i class="fas fa-trash-alt"></i> Delete Club
          </button>
        `;
        
        // Show create event button for club owners
        document.getElementById('create-event-btn').classList.remove('d-none');
        document.getElementById('invite-member-btn').classList.remove('d-none');
      } else if (token) {
        // Show create event button for logged-in users (members)
        document.getElementById('create-event-btn').classList.remove('d-none');
      }
      
      // Load club members
      displayMembers(clubId);
      
      // Load events for this club
      loadClubEvents(clubId);
    })
    .catch(error => {
      console.error('Error loading club details:', error);
      document.getElementById('club-name').textContent = 'Error Loading Club';
      document.getElementById('club-description').innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Failed to load club details. Please try again later.
        </div>
      `;
      document.getElementById('member-list').innerHTML = '<li class="list-group-item text-center text-danger">Could not load members</li>';
      document.getElementById('event-list').innerHTML = '<div class="col-12 text-center py-5 text-danger"><i class="fas fa-exclamation-circle fa-2x mb-2"></i><p>Unable to load events</p></div>';
    });
}

function loadClubEvents(clubId) {
  console.log(`Loading events for club ID: ${clubId}`);
  const token = localStorage.getItem('token');
  
  // Show loading state
  const eventList = document.getElementById('event-list');
  eventList.innerHTML = '<div class="col-12 text-center py-5"><span class="spinner-border text-primary" role="status"></span><p class="mt-2">Loading events...</p></div>';
  
  // First check if auth is working with debug endpoint
  apiGet('/debug-auth', true)
    .then(authResult => {
      console.log('Auth check result:', authResult);
      
      // If auth is good, try to fetch club events
      return apiGet(`/clubs/${clubId}/events`, true)
        .then(events => {
          console.log('Club events loaded:', events);
          displayEvents(events, eventList);
        })
        .catch(error => {
          console.error('Error loading club events, trying all-events fallback:', error);
          
          // If specific club events fails, try all events endpoint
          return apiGet('/all-events', true)
            .then(allEvents => {
              console.log('All events loaded, filtering for club:', allEvents);
              
              // Filter events for this club
              const clubEvents = allEvents.filter(event => event.club_id == clubId);
              console.log('Filtered events for club:', clubEvents);
              
              if (clubEvents.length > 0) {
                displayEvents(clubEvents, eventList);
  } else {
                throw new Error('No events found for this club');
              }
            });
        });
    })
    .catch(error => {
      console.error('All API attempts failed:', error);
      
      // Fallback: Show mock events when all API attempts fail
      console.log('Falling back to mock events data');
      const mockEvents = [
        {
          id: 1,
          title: 'Sample Event 1',
          description: 'This is a mock event to demonstrate the UI when the API is not available.',
          date: new Date().toISOString()
        },
        {
          id: 2,
          title: 'Sample Event 2',
          description: 'The events API endpoint might be down or the authorization might not be working properly.',
          date: new Date(Date.now() + 86400000).toISOString() // Tomorrow
        }
      ];
      
      // Display mock events with a warning
      eventList.innerHTML = `
        <div class="col-12 mb-4">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Could not load real events from the server. Showing sample events instead.
            <button class="btn btn-sm btn-outline-dark ms-2" onclick="loadClubEvents('${clubId}')">Try Again</button>
          </div>
        </div>
      `;
      
      // Use the same display function with mock data
      displayEvents(mockEvents, eventList, true);
    });
}

// Helper function to display events
function displayEvents(events, eventList, append = false) {
  // If not appending, clear the container
  if (!append) {
    eventList.innerHTML = '';
  }
  
  if (!events || events.length === 0) {
    eventList.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
        <p class="lead">No events scheduled for this club yet.</p>
        <p>Check back later or create a new event!</p>
      </div>
    `;
    return;
  }
  
  // Display events
  events.forEach(event => {
    const eventDate = new Date(event.date || new Date());
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const eventCard = document.createElement('div');
    eventCard.className = 'col-md-6 col-lg-4 mb-4';
    eventCard.innerHTML = `
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <h5 class="card-title">${event.title || event.name || 'Unnamed Event'}</h5>
          <h6 class="card-subtitle mb-2 text-muted">
            <i class="fas fa-calendar-day me-2"></i>${formattedDate}
          </h6>
          <p class="card-text">${event.description || 'No description provided'}</p>
        </div>
        <div class="card-footer bg-transparent">
          <a href="event.html?id=${event.id}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-info-circle me-1"></i> View Details
          </a>
        </div>
      </div>
    `;
    eventList.appendChild(eventCard);
  });
}

// ========== CLUB MEMBERSHIP FUNCTIONS ========== //

// Check membership status and update UI
async function loadMembershipStatus(clubId) {
  console.log(`Checking membership status for club ID: ${clubId}`);
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('User not logged in, hiding membership actions');
    document.querySelector('.membership-status').classList.add('d-none');
    return;
  }
  
  try {
    // Show loading state
    const statusText = document.getElementById('membership-status-text');
    const joinBtn = document.getElementById('join-club-btn');
    const leaveBtn = document.getElementById('leave-club-btn');
    
    statusText.innerHTML = '<span class="spinner-border spinner-border-sm text-primary" role="status"></span> Checking membership...';
    joinBtn.classList.add('d-none');
    leaveBtn.classList.add('d-none');
    
    // Get user ID from local storage
    const userId = localStorage.getItem('userId');
    
    // Get club details to check if user is owner
    const clubResponse = await apiGet(`/clubs/${clubId}`, true);
    
    // Check if user is the owner
    if (userId && clubResponse.owner_id === parseInt(userId)) {
      statusText.innerHTML = '<i class="fas fa-crown text-warning me-2"></i> You own this club';
      joinBtn.classList.add('d-none');
      leaveBtn.classList.add('d-none');
      return;
    }
    
    // Check membership status
    const response = await apiGet(`/clubs/${clubId}/membership`, true);
    console.log('Membership status:', response);
    
    if (response.success) {
      if (response.isMember) {
        // User is a member
        statusText.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> You are a member of this club';
        joinBtn.classList.add('d-none');
        leaveBtn.classList.remove('d-none');
      } else {
        // User is not a member
        statusText.innerHTML = '<i class="fas fa-times-circle text-secondary me-2"></i> You are not a member of this club';
        joinBtn.classList.remove('d-none');
        leaveBtn.classList.add('d-none');
      }
    } else {
      // Error checking membership
      statusText.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-2"></i> Could not check membership status';
      joinBtn.classList.add('d-none');
      leaveBtn.classList.add('d-none');
    }
  } catch (error) {
    console.error('Error checking membership status:', error);
    document.getElementById('membership-status-text').innerHTML = 
      '<i class="fas fa-exclamation-triangle text-danger me-2"></i> Error checking membership status';
  }
}

// Join a club
async function joinClub(clubId) {
  console.log(`Attempting to join club ID: ${clubId}`);
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to join a club');
    window.location.href = 'login.html';
    return;
  }
  
  try {
    // Send join request
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Join club response:', data);
    
    if (response.ok && data.success) {
      // Success - reload membership status
      await loadMembershipStatus(clubId);
      
      // Also reload member list 
      displayMembers(clubId);
      
      return data;
    } else {
      // Error
      throw new Error(data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error joining club:', error);
    throw error;
  }
}

// Leave a club
async function leaveClub(clubId) {
  console.log(`Attempting to leave club ID: ${clubId}`);
  
  // Check if user is logged in
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to leave a club');
    window.location.href = 'login.html';
    return;
  }
  
  try {
    // Send leave request
    const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    console.log('Leave club response:', data);
    
    if (response.ok && data.success) {
      // Success - reload membership status
      await loadMembershipStatus(clubId);
      
      // Also reload member list
      displayMembers(clubId);
      
      return data;
    } else {
      // Error
      throw new Error(data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error leaving club:', error);
    throw error;
  }
}

// Get all members of a club
async function getClubMembers(clubId) {
  console.log(`Getting members for club ID: ${clubId}`);
  
  try {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Cannot get members: user not logged in');
      return [];
    }
    
    // Fetch members from API
    const response = await apiGet(`/clubs/${clubId}/members`, true);
    
    if (response.success && response.members) {
      console.log(`Found ${response.members.length} members for club ID: ${clubId}`);
      return response.members;
    } else {
      console.log('No members found or unexpected response format');
      return [];
    }
  } catch (error) {
    console.error('Error fetching club members:', error);
    return [];
  }
}

// Display club members in the member list
async function displayMembers(clubId) {
  console.log(`Displaying members for club ID: ${clubId}`);
  const memberList = document.getElementById('member-list');
  
  if (!memberList) {
    console.error('Member list element not found');
    return;
  }
  
  try {
    // Show loading state
    memberList.innerHTML = '<li class="list-group-item text-center"><span class="spinner-border text-primary" role="status"></span> Loading members...</li>';
    
    // Get members from API
    const members = await getClubMembers(clubId);
    
    if (!members || members.length === 0) {
      memberList.innerHTML = `
        <li class="list-group-item text-center">
          <p class="text-muted">No members found</p>
        </li>
      `;
      return;
    }
    
    // Clear the list and add members
    memberList.innerHTML = '';
    
    members.forEach(member => {
      const memberItem = document.createElement('li');
      memberItem.className = 'list-group-item member-item';
      memberItem.innerHTML = `
        <div class="member-name">
          <i class="fas fa-user me-2 text-secondary"></i>
          ${member.username || 'Unknown Member'}
        </div>
        <div class="member-role">
          ${member.role === 'owner' ? '<span class="badge bg-primary">Owner</span>' : 'Member'}
        </div>
      `;
      memberList.appendChild(memberItem);
    });
  } catch (error) {
    console.error('Error displaying members:', error);
    memberList.innerHTML = `
      <li class="list-group-item text-center">
        <p class="text-danger">Error loading members</p>
      </li>
    `;
  }
}

/**
 * Loads and displays details for a specific event
 * @param {string} eventId - The ID of the event to display
 */
function showEventDetails(eventId) {
  if (!eventId) {
    showError('No event ID provided');
    return;
  }

  const titleElement = document.getElementById('event-title');
  const descriptionElement = document.getElementById('event-description');
  const dateElement = document.getElementById('event-date');
  const clubLinkElement = document.getElementById('club-link');
  const loadingElement = document.getElementById('event-loading');
  const contentElement = document.getElementById('event-content');
  const errorElement = document.getElementById('event-error');
  const editButton = document.getElementById('edit-event-btn');
  const deleteButton = document.getElementById('delete-event-btn');
  const actionsContainer = document.getElementById('event-actions');

  // Show loading state
  if (loadingElement) loadingElement.classList.remove('d-none');
  if (contentElement) contentElement.classList.add('d-none');
  if (errorElement) errorElement.classList.add('d-none');
  if (actionsContainer) actionsContainer.classList.add('d-none');

  // Get the token from localStorage
  const token = localStorage.getItem('token');
  
  // Fetch event details
  fetch(`${API_BASE_URL}/events/${eventId}`, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (loadingElement) loadingElement.classList.add('d-none');
    if (contentElement) contentElement.classList.remove('d-none');
    
    // Update event details
    if (titleElement) titleElement.textContent = data.title;
    if (descriptionElement) descriptionElement.textContent = data.description;
    if (dateElement) dateElement.textContent = new Date(data.created_at).toLocaleDateString();
    
    // Update club link
    if (clubLinkElement && data.club_id) {
      clubLinkElement.href = `club.html?id=${data.club_id}`;
      
      // Fetch club name if needed
      fetch(`${API_BASE_URL}/clubs/${data.club_id}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })
      .then(response => response.json())
      .then(clubData => {
        clubLinkElement.textContent = clubData.name || 'Back to Club';
      })
      .catch(error => {
        console.error('Error fetching club details:', error);
        clubLinkElement.textContent = 'Back to Club';
      });
    }
    
    // Check if current user is the owner and show edit/delete buttons
    if (token && data.created_by) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = payload.id;
        
        if (currentUserId === data.created_by) {
          if (editButton) editButton.classList.remove('d-none');
          if (deleteButton) deleteButton.classList.remove('d-none');
        }
      } catch (error) {
        console.error('Error parsing token:', error);
      }
    }
    
    // Show actions container
    if (actionsContainer) actionsContainer.classList.remove('d-none');
  })
  .catch(error => {
    console.error('Error fetching event details:', error);
    if (loadingElement) loadingElement.classList.add('d-none');
    if (errorElement) {
      errorElement.classList.remove('d-none');
      errorElement.querySelector('.error-message').textContent = `Failed to load event details: ${error.message}`;
    }
  });
}
