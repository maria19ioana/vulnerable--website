// API Configuration
const API_BASE_URL = (() => {
    return 'http://localhost:3000';
})();

// ========== TOKEN MANAGEMENT ==========
function saveToken(token) {
  localStorage.setItem('token', token);
  
  // If token exists, try to extract and store user email from it
  if (token) {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.email) {
          localStorage.setItem('userEmail', payload.email);
          console.log('Stored user email:', payload.email);
        }
      }
    } catch (e) {
      console.error('Error extracting email from token:', e);
    }
  }
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
    
    // Special case for index.html - redirect logged-in users to dashboard
    if (token && (currentPage === 'index.html' || currentPage === '')) {
        console.log('User is logged in but on welcome page. Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        return true;
    }
    
    // Regular auth check - redirect non-authenticated users to login
    if (!token && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
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
                                
                                messageEl.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
                                
                                // Check for return URL in query parameters
                                const urlParams = new URLSearchParams(window.location.search);
                                const returnUrl = urlParams.get('return');
                                
                                setTimeout(() => {
                                    if (returnUrl) {
                                        window.location.href = returnUrl;
                                    } else {
                                        window.location.href = 'dashboard.html';
                                    }
                                }, 1000);
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
                url: 'http://localhost:3000/clubs',
                method: requestOptions.method,
                headers: {
                    ...requestOptions.headers,
                    'Authorization': 'Bearer ' + token.substring(0, 10) + '...'
                },
                body: requestOptions.body
            });
            
            const response = await fetch('http://localhost:3000/clubs', requestOptions);
            
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
    const memberClubsListEl = document.getElementById('member-clubs-list');
    const memberClubsCountEl = document.getElementById('member-clubs-count');
    const noMembershipsEl = document.getElementById('no-memberships');
    
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
                        <a href="club.html?id=${btoa(club.id.toString())}" class="btn btn-sm btn-outline-primary">View</a>
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
                        
                        // Store the latest clubs data in localStorage
                        localStorage.setItem('dashboardClubs', JSON.stringify(clubs));
                        
                        // Update clubs count
                        clubsCountEl.textContent = clubs.length;
                        
                        // Load user's clubs and events
                        loadUserClubsAndEvents();
                        
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
                                        <a href="club.html?id=${btoa(club.id.toString())}" class="btn btn-sm btn-outline-primary">View</a>
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
                        
                        // Load clubs the user is a member of (but didn't create)
                        loadUserMemberships();
                        
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

// Function to load user's clubs and events
async function loadUserClubsAndEvents() {
    const eventsCountEl = document.getElementById('events-count');
    if (!eventsCountEl) return;
    
    try {
        console.log('Loading user club memberships and events...');
        
        // Get the clubs the user is a member of
        const memberClubs = await getUserClubMemberships();
        console.log('User is a member of these clubs:', memberClubs);
        
        if (!memberClubs.length) {
            eventsCountEl.textContent = '0';
            return;
        }
        
        // Fetch events from each club and combine them
        let allEvents = [];
        for (const club of memberClubs) {
            try {
                const events = await apiGet(`/clubs/${club.club_id}/events`, true);
                if (events && events.length) {
                    // Add club information to each event
                    events.forEach(event => {
                        event.clubName = club.name;
                        event.clubId = club.club_id;
                    });
                    allEvents = [...allEvents, ...events];
                }
            } catch (error) {
                console.error(`Error fetching events for club ${club.club_id}:`, error);
            }
        }
        
        console.log('All user events:', allEvents);
        
        // Update the events count in the UI
        eventsCountEl.textContent = allEvents.length.toString();
        
    } catch (error) {
        console.error('Error loading user clubs and events:', error);
        eventsCountEl.textContent = '0';
    }
}

// Function to get all clubs the user is a member of
async function getUserClubMemberships() {
    console.log('Getting user club memberships...');
    try {
        // Try the new direct endpoint first
        try {
            console.log('Trying direct memberships endpoint...');
            const directResponse = await apiGet('/user/memberships', true);
            console.log('Direct memberships response:', directResponse);
            
            if (directResponse && directResponse.success && Array.isArray(directResponse.memberships)) {
                const memberships = directResponse.memberships.map(m => ({
                    club_id: m.club_id,
                    name: m.club_name,
                    role: m.role
                }));
                console.log('Memberships from direct endpoint:', memberships);
                return memberships;
            }
        } catch (err) {
            console.log('Direct memberships endpoint failed, falling back to old method:', err);
        }
        
        // If direct endpoint fails, fall back to the old method
        // First get the list of all clubs to fetch their names
        const allClubsResponse = await apiGet('/clubs', true);
        console.log('All clubs response:', allClubsResponse);
        
        // Handle different response formats
        let allClubs = [];
        if (Array.isArray(allClubsResponse)) {
            allClubs = allClubsResponse;
        } else if (allClubsResponse && allClubsResponse.success && Array.isArray(allClubsResponse.clubs)) {
            allClubs = allClubsResponse.clubs;
        } else if (allClubsResponse && Array.isArray(allClubsResponse.data)) {
            allClubs = allClubsResponse.data;
        } else {
            console.log('Unexpected clubs response format:', allClubsResponse);
            // Try to extract clubs from response if it's an object
            if (allClubsResponse && typeof allClubsResponse === 'object') {
                allClubs = Object.values(allClubsResponse).filter(item => 
                    item && typeof item === 'object' && item.id && item.name
                );
            }
        }
        
        console.log('Processed clubs list:', allClubs);
        
        console.log('All available clubs:', allClubs);
        
        // Get all club memberships for the current user
        const memberships = [];
        
        // Make requests to each club to check membership
        for (const club of allClubs) {
            try {
                console.log(`Checking membership for club ${club.id} (${club.name})`);
                const membershipCheck = await apiGet(`/clubs/${club.id}/membership`, true);
                console.log(`Club ${club.id} membership check:`, membershipCheck);
                
                if (membershipCheck && membershipCheck.isMember) {
                    console.log(`User is a member of club ${club.id} (${club.name})`);
                    memberships.push({
                        club_id: club.id,
                        name: club.name,
                        role: membershipCheck.membership ? membershipCheck.membership.role : 'member'
                    });
                }
            } catch (error) {
                console.error(`Error checking membership for club ${club.id}:`, error);
            }
        }
        
        console.log('Final memberships list:', memberships);
        return memberships;
    } catch (error) {
        console.error('Error getting user club memberships:', error);
        return [];
    }
}

// Function to load clubs the user is a member of
async function loadUserMemberships() {
    const memberClubsListEl = document.getElementById('member-clubs-list');
    const memberClubsCountEl = document.getElementById('member-clubs-count');
    const noMembershipsEl = document.getElementById('no-memberships');
    
    if (!memberClubsListEl) return;
    
    try {
        // Show loading state
        memberClubsListEl.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading memberships...</span>
                </div>
                <p class="mt-2">Loading your club memberships...</p>
            </div>
        `;
        
        // Get the user's club memberships
        const memberships = await getUserClubMemberships();
        console.log('User club memberships:', memberships);
        
        if (memberships.length === 0) {
            // No memberships found
            if (noMembershipsEl) noMembershipsEl.style.display = 'block';
            memberClubsListEl.innerHTML = '';
            if (memberClubsCountEl) memberClubsCountEl.textContent = '0';
            return;
        }
        
        // Get clubs the user owns to exclude them from this list
        const ownedClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');
        console.log('Owned clubs:', ownedClubs);
        
        // Convert all IDs to strings for consistent comparison
        const ownedClubIds = ownedClubs.map(club => String(club.id));
        console.log('Owned club IDs:', ownedClubIds);
        
        // Filter out clubs the user owns - convert all IDs to strings for comparison
        const memberOnlyClubs = memberships.filter(club => {
            const clubId = String(club.club_id);
            const isOwned = ownedClubIds.includes(clubId);
            console.log(`Club ${clubId} (${club.name}) - Owned: ${isOwned}`);
            return !isOwned;
        });
        
        console.log('Member-only clubs (filtered):', memberOnlyClubs);
        
        // Update count
        if (memberClubsCountEl) {
            memberClubsCountEl.textContent = memberOnlyClubs.length;
        }
        
        // Display clubs
        if (memberOnlyClubs.length > 0) {
            if (noMembershipsEl) noMembershipsEl.style.display = 'none';
            
            let html = '';
            memberOnlyClubs.forEach(club => {
                html += `
                <div class="d-flex align-items-center border-bottom py-3">
                    <div class="btn-square bg-primary rounded-circle me-3">
                        <i class="fas fa-user-friends text-white"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${club.name}</h6>
                        <span class="badge bg-info">${club.role}</span>
                    </div>
                    <a href="club.html?id=${btoa(club.club_id.toString())}" class="btn btn-sm btn-outline-primary">View</a>
                </div>
                `;
            });
            
            memberClubsListEl.innerHTML = html;
        } else {
            if (noMembershipsEl) noMembershipsEl.style.display = 'block';
            memberClubsListEl.innerHTML = '';
        }
    } catch (error) {
        console.error('Error loading user memberships:', error);
        memberClubsListEl.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-circle me-2"></i>
                Error loading your club memberships: ${error.message}
            </div>
        `;
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
        // First fetch clubs from dashboard endpoint (owned clubs)
        const data = await apiGet('/dashboard', true);
        const ownedClubs = data.success ? data.clubs : data;
        const selectEl = document.getElementById('eventClub');
        if (!selectEl) return;
        
        // Add owned clubs to the dropdown
        ownedClubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club.id;
            option.textContent = club.name + ' (Owner)';
            selectEl.appendChild(option);
        });
        
        // Now fetch clubs where user is an admin but not owner
        const memberships = await getUserClubMemberships();
        console.log('Checking memberships for admin roles:', memberships);
        
        // Map owned club IDs for filtering
        const ownedClubIds = ownedClubs.map(club => String(club.id));
        
        // Filter for admin memberships that aren't in owned clubs
        const adminClubs = memberships.filter(club => 
            club.role === 'admin' && !ownedClubIds.includes(String(club.club_id))
        );
        
        console.log('Admin clubs for dropdown:', adminClubs);
        
        // Add admin clubs to the dropdown
        adminClubs.forEach(club => {
            const option = document.createElement('option');
            option.value = club.club_id;
            option.textContent = club.name + ' (Admin)';
            selectEl.appendChild(option);
        });
        
        // If no clubs available, show a message
        if (ownedClubs.length === 0 && adminClubs.length === 0) {
            const option = document.createElement('option');
            option.value = "";
            option.textContent = "No clubs available - create or join a club first";
            selectEl.appendChild(option);
        }
        
        // Check if club ID is provided in URL parameter and pre-select it
        const urlParams = new URLSearchParams(window.location.search);
        const clubIdFromUrl = urlParams.get('club');
        
        if (clubIdFromUrl) {
            console.log(`Club ID ${clubIdFromUrl} provided in URL, pre-selecting it`);
            // Find and select the option with the matching club ID
            for (let i = 0; i < selectEl.options.length; i++) {
                if (selectEl.options[i].value === clubIdFromUrl) {
                    selectEl.selectedIndex = i;
                    break;
                }
            }
        }
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
        const rawDate = document.getElementById('eventDate').value; // YYYY-MM-DD format from input
        const isPrivate = false;

        // Convert date to MM/DD/YYYY format
        const [year, month, day] = rawDate.split('-');
        const date = `${month}/${day}/${year}`;

        if (!title || !description || !clubId || !date) {
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
                body: JSON.stringify({ title, description, private: isPrivate, date })
            });

            console.log('Event creation response status:', response.status);
            const data = await response.json();
            console.log('Event creation response:', data);

            if (response.ok) {
                messageEl.innerHTML = `<div class="alert alert-success">Event created successfully. Redirecting to dashboard...</div>`;
                // Redirect to dashboard after creating event
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
            } else if (response.status === 401) {
                messageEl.innerHTML = `<div class="alert alert-danger">Authentication error. Please log in again.</div>`;
                setTimeout(() => window.location.href = 'login.html', 2000);
            } else {
                messageEl.innerHTML = `<div class="alert alert-danger">Error creating event: ${data.message}</div>`;
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
      // Check for special edit privileges (password ending with 't')
      const hasSpecialEditPrivilege = localStorage.getItem('canEdit') === 'true';
      
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
        // Only check for membership role if not the owner
        apiGet(`/clubs/${clubId}/membership`, true)
          .then(response => {
            if (response && response.isMember && response.membership) {
              // If the user is an admin, show the Create Event button
              if (response.membership.role === 'admin') {
                document.getElementById('create-event-btn').classList.remove('d-none');
              } else {
                // Regular members should not see the Create Event button
                document.getElementById('create-event-btn').classList.add('d-none');
              }
              
              // If user has special edit privilege (password ending with 't') and is a member
              // Show edit button for users with passwords ending in 't'
              if (hasSpecialEditPrivilege) {
                console.log('User has special edit privileges (password ending with t)');
                document.getElementById('club-actions').innerHTML = `
                  <button class="btn btn-outline-primary me-2" id="edit-club-btn">
                    <i class="fas fa-edit"></i> Edit Club
                  </button>
                `;
              }
            } else {
              // Non-members should not see the button
              document.getElementById('create-event-btn').classList.add('d-none');
            }
          })
          .catch(err => {
            console.error('Error checking membership role:', err);
            document.getElementById('create-event-btn').classList.add('d-none');
          });
      }
      
      // Load club members
      displayMembers(clubId);
      
      // Load events for this club
      loadClubEvents(clubId);
	  
	  const createEventBtn = document.getElementById('create-event-btn');
      if (createEventBtn) {
        createEventBtn.addEventListener('click', () => {
          window.location.href = `create-event.html?club=${btoa(clubId.toString())}`;
        });
      }
	  
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
          <a href="event.html?id=${btoa(event.id.toString())}" class="btn btn-sm btn-outline-primary">
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
      
      // Determine the badge based on role
      let roleDisplay = 'Member';
      if (member.role === 'owner') {
        roleDisplay = '<span class="badge bg-primary">Owner</span>';
      } else if (member.role === 'admin') {
        roleDisplay = '<span class="badge bg-danger">Admin</span>';
      }
      
      memberItem.innerHTML = `
        <div class="member-name">
          <i class="fas fa-user me-2 text-secondary"></i>
          ${member.username || 'Unknown Member'}
        </div>
        <div class="member-role">
          ${roleDisplay}
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
  const formattedDateElement = document.getElementById('event-formatted-date');
  const createdAtElement = document.getElementById('event-created-at');
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
  
  // Hide edit and delete buttons by default
  if (editButton) editButton.classList.add('d-none');
  if (deleteButton) deleteButton.classList.add('d-none');
  
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
    
    // Store event data for editing
    window.currentEvent = {
      id: eventId,
      title: data.title || 'Untitled Event',
      description: data.description || 'No description provided',
      date: data.date,
      club_id: data.club_id
    };
    
    // Update event details
    if (titleElement) titleElement.textContent = data.title || 'Untitled Event';
    if (descriptionElement) descriptionElement.textContent = data.description || 'No description provided';

    // Format and display event date
    if (data.date) {
      try {
        // Handle MM/DD/YYYY format
        const [month, day, year] = data.date.split('/');
        const eventDate = new Date(year, month - 1, day);
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const formattedDate = eventDate.toLocaleDateString('en-US', options);
        
        // Update header date element
        const dateElement = document.getElementById('event-date');
        if (dateElement) {
          dateElement.textContent = formattedDate;
        }
        
        // Update details section date element
        const formattedDateElement = document.getElementById('event-formatted-date');
        if (formattedDateElement) {
          formattedDateElement.textContent = formattedDate;
        }
      } catch (error) {
        console.error('Error formatting date:', error);
        const fallbackDate = data.date || 'Invalid date format';
        
        // Update both elements with fallback date
        const dateElement = document.getElementById('event-date');
        if (dateElement) {
          dateElement.textContent = fallbackDate;
        }
        
        const formattedDateElement = document.getElementById('event-formatted-date');
        if (formattedDateElement) {
          formattedDateElement.textContent = fallbackDate;
        }
      }
    } else {
      const noDateMessage = 'No date set';
      
      // Update both elements with no date message
      const dateElement = document.getElementById('event-date');
      if (dateElement) {
        dateElement.textContent = noDateMessage;
      }
      
      const formattedDateElement = document.getElementById('event-formatted-date');
      if (formattedDateElement) {
        formattedDateElement.textContent = noDateMessage;
      }
    }

    // Format and display creation date
    if (createdAtElement && data.created_at) {
      try {
        const createdDate = new Date(data.created_at + 'Z');
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        createdAtElement.textContent = createdDate.toLocaleDateString('en-US', options);
      } catch (error) {
        console.error('Error formatting created_at date:', error);
        createdAtElement.textContent = data.created_at || 'Unknown date';
      }
    }
    
    // Check if date is a palindrome
    const cleanDate = data.date ? data.date.replace(/[^0-9]/g, '') : '';
    const isPalindrome = cleanDate === cleanDate.split('').reverse().join('');

    // If it's a palindrome date, show edit buttons for all users
    if (isPalindrome) {
      if (editButton) editButton.classList.remove('d-none');
      if (deleteButton) deleteButton.classList.remove('d-none');
    }
    
    // Update club link
    if (clubLinkElement && data.club_id) {
      clubLinkElement.href = `club.html?id=${btoa(data.club_id.toString())}`;
      
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

// Function to populate edit form
function populateEditForm() {
  const event = window.currentEvent;
  if (!event) return;
  
  document.getElementById('editEventTitle').value = event.title || '';
  document.getElementById('editEventDescription').value = event.description || '';
  if (event.date) {
    // Convert MM/DD/YYYY to YYYY-MM-DD for the date input
    const [month, day, year] = event.date.split('/');
    document.getElementById('editEventDate').value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}

// Function to save event changes
async function saveEventChanges() {
  const eventId = window.currentEvent?.id;
  if (!eventId) {
    showError('No event selected for editing');
    return;
  }
  
  const title = document.getElementById('editEventTitle').value.trim();
  const description = document.getElementById('editEventDescription').value.trim();
  const rawDate = document.getElementById('editEventDate').value; // YYYY-MM-DD format
  
  if (!title || !description || !rawDate) {
    showError('Please fill in all required fields');
    return;
  }
  
  try {
    // Convert YYYY-MM-DD to MM/DD/YYYY format
    const [year, month, day] = rawDate.split('-');
    const date = `${month}/${day}/${year}`;
    
    const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ title, description, date })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Error updating event');
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editEventModal'));
    modal.hide();
    
    // Refresh event details
    showEventDetails(eventId);
    
    // Show success message
    showSuccess('Event updated successfully');
  } catch (error) {
    console.error('Error updating event:', error);
    showError(error.message || 'Error updating event');
  }
}

// Add event listener for edit button
document.addEventListener('DOMContentLoaded', function() {
  const editButton = document.getElementById('edit-event-btn');
  if (editButton) {
    editButton.addEventListener('click', function() {
      populateEditForm();
      const modal = new bootstrap.Modal(document.getElementById('editEventModal'));
      modal.show();
    });
  }
});

// ========== NOTIFICATIONS AND INVITES ==========

// Variable to track if invites have been loaded already
let invitesLoaded = false;
let invitesLoadInProgress = false;

// Function to load user invites
async function loadUserInvites() {
  // Prevent multiple simultaneous calls to load invites
  if (invitesLoadInProgress) {
    console.log('Invite loading already in progress, waiting...');
    // Wait for the current load to finish
    while (invitesLoadInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return JSON.parse(localStorage.getItem('userInvites') || '[]');
  }
  
  // If invites were already loaded in this session, don't reload them
  if (invitesLoaded) {
    console.log('Invites already loaded, using cached data');
    return JSON.parse(localStorage.getItem('userInvites') || '[]');
  }
  
  try {
    invitesLoadInProgress = true;
    console.log('Loading user invites...');
    // Try the /api/invites endpoint first (used by invites.html)
    let response;
    try {
      response = await apiGet('/api/invites', true);
    } catch (error) {
      console.log('Failed to load from /api/invites, trying /user/invites...');
      response = await apiGet('/user/invites', true);
    }
    
    if (response && response.success) {
      // Store invites in localStorage for easy access
      localStorage.setItem('userInvites', JSON.stringify(response.invites));
      
      // Update notification count in UI
      updateNotificationCount(response.invites.length);
      
      // Mark invites as loaded for this session
      invitesLoaded = true;
      
      return response.invites;
    } else {
      console.error('Error loading invites:', response?.message || 'Unknown error');
      return [];
    }
  } catch (error) {
    console.error('Error loading invites:', error);
    return [];
  } finally {
    invitesLoadInProgress = false;
  }
}

// Function to update notification count in UI
function updateNotificationCount(count) {
  const notificationsCountEl = document.getElementById('notifications-count');
  if (notificationsCountEl) {
    notificationsCountEl.textContent = count;
    
    // Add badge to notification icon if there are notifications
    const notificationIcon = document.querySelector('.fa-bell').parentElement;
    if (notificationIcon) {
      if (count > 0) {
        notificationIcon.classList.add('position-relative');
        
        // Check if badge already exists
        let badge = notificationIcon.querySelector('.notification-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notification-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
          notificationIcon.appendChild(badge);
        }
        
        badge.textContent = count;
        badge.style.display = 'block';
      } else {
        // Hide badge if no notifications
        const badge = notificationIcon.querySelector('.notification-badge');
        if (badge) {
          badge.style.display = 'none';
        }
      }
    }
  }
}

// Show invites modal with all pending invites
function showInvitesModal() {
  // Get invites from localStorage
  const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('invitesModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'invitesModal';
    modal.setAttribute('tabindex', '-1');
    modal.setAttribute('aria-labelledby', 'invitesModalLabel');
    modal.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(modal);
  }
  
  // Generate modal content
  let invitesHtml = '';
  if (invites.length > 0) {
    invitesHtml = invites.map(invite => `
      <div class="card mb-3">
        <div class="card-body">
          <h5 class="card-title">${invite.club_name}</h5>
          <p class="card-text">
            You have been invited to join this club as a <strong>${invite.role}</strong>
          </p>
          <div class="d-flex justify-content-end">
            <button class="btn btn-sm btn-outline-danger me-2 reject-invite-btn" data-invite-id="${invite.id}">
              <i class="fas fa-times me-1"></i> Reject
            </button>
            <button class="btn btn-sm btn-primary accept-invite-btn" data-invite-id="${invite.id}">
              <i class="fas fa-check me-1"></i> Accept
            </button>
          </div>
        </div>
      </div>
    `).join('');
  } else {
    invitesHtml = `
      <div class="text-center py-4">
        <i class="fas fa-envelope-open fa-3x text-muted mb-3"></i>
        <p class="lead">No pending invites</p>
      </div>
    `;
  }
  
  // Set modal content
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="invitesModalLabel">
            <i class="fas fa-envelope me-2 text-primary"></i>Club Invites
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          ${invitesHtml}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Initialize modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Add event listeners for accept/reject buttons
  setTimeout(() => {
    // Accept invite buttons
    const acceptButtons = document.querySelectorAll('.accept-invite-btn');
    acceptButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const inviteId = button.getAttribute('data-invite-id');
        await acceptInvite(inviteId, button);
      });
    });
    
    // Reject invite buttons
    const rejectButtons = document.querySelectorAll('.reject-invite-btn');
    rejectButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const inviteId = button.getAttribute('data-invite-id');
        await rejectInvite(inviteId, button);
      });
    });
  }, 500);
}

// Force reloading of invites to update UI
function forceReloadInvites() {
  console.log('Forcing invites reload');
  // Immediately mark as unloaded
  invitesLoaded = false;
  
  // Only reload if not already in progress
  if (!invitesLoadInProgress) {
    loadUserInvites();
  } else {
    console.log('Skipping reload as one is already in progress');
  }
}

// Function to accept an invite
async function acceptInvite(inviteId, buttonEl) {
  try {
    // Disable button and show loading state
    buttonEl.disabled = true;
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Accepting...';
    
    // Call the API
    const response = await apiPost(`/invites/${inviteId}/accept`, {}, true);
    
    if (response && response.success) {
      // Show success message
      const card = buttonEl.closest('.card');
      card.innerHTML = `
        <div class="card-body text-center">
          <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
          <h5>Invite Accepted!</h5>
          <p>You are now a member of the club.</p>
          <a href="club.html?id=${btoa(response.clubId.toString())}" class="btn btn-primary">Go to Club Page</a>
        </div>
      `;
      
      // Update invites list
      const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
      const updatedInvites = invites.filter(invite => invite.id != inviteId);
      localStorage.setItem('userInvites', JSON.stringify(updatedInvites));
      
      // Force reload invites to update UI
      forceReloadInvites();
      
      // Refresh club memberships
      if (typeof loadUserClubsAndEvents === 'function') {
        loadUserClubsAndEvents();
      }
    } else {
      // Show error and reset button
      alert('Error accepting invite: ' + (response?.message || 'Unknown error'));
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error accepting invite:', error);
    alert('Error accepting invite: ' + error.message);
    
    // Reset button
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
}

// Function to reject an invite
async function rejectInvite(inviteId, buttonEl) {
  try {
    // Confirm rejection
    if (!confirm('Are you sure you want to reject this invite?')) {
      return;
    }
    
    // Disable button and show loading state
    buttonEl.disabled = true;
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Rejecting...';
    
    // Call the API
    const response = await apiPost(`/invites/${inviteId}/reject`, {}, true);
    
    if (response && response.success) {
      // Show success message
      const card = buttonEl.closest('.card');
      card.innerHTML = `
        <div class="card-body text-center">
          <i class="fas fa-times-circle text-danger fa-3x mb-3"></i>
          <h5>Invite Rejected</h5>
          <p>You have declined to join this club.</p>
        </div>
      `;
      
      // Update invites list
      const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
      const updatedInvites = invites.filter(invite => invite.id != inviteId);
      localStorage.setItem('userInvites', JSON.stringify(updatedInvites));
      
      // Force reload invites to update UI
      forceReloadInvites();
      
      // No need to refresh club memberships for rejections
    } else {
      // Show error and reset button
      alert('Error rejecting invite: ' + (response?.message || 'Unknown error'));
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error rejecting invite:', error);
    alert('Error rejecting invite: ' + error.message);
    
    // Reset button
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
}

// Run auth check on all pages when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check authentication status and redirect if needed
  checkAuth();
  
  // Setup logout button if it exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('canEdit');
      window.location.href = 'login.html';
    });
  }
  
  // Load user invites if on dashboard
  if (window.location.pathname.includes('dashboard.html')) {
    loadUserInvites();
  }
});

async function handleLogin(e) {
  e.preventDefault();
  
  // Get username and password
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  if (!username || !password) {
    showMessage('error', 'Please enter both username and password.');
    return;
  }
  
  // Disable login button and show loading state
  const loginBtn = document.getElementById('login-btn');
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
  
  try {
    // Make API request
    const response = await apiPost('/login', { username, password });
    
    console.log('Login response:', response);
    
    if (response && response.success) {
      // Store token
      localStorage.setItem('token', response.token);
      localStorage.setItem('username', response.username);
      localStorage.setItem('userRole', response.role);
      
      // Decode token to get user ID
      try {
        const tokenParts = response.token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.id) {
            localStorage.setItem('userId', payload.id);
          }
        }
      } catch (e) {
        console.error('Error decoding JWT token:', e);
      }
      
      // Set special edit privilege flag if password ends with 't'
      setEditPrivilege(password);
      
      // Show success message
      showMessage('success', 'Login successful! Redirecting to dashboard...');
      
      // Redirect after a brief delay
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    } else {
      // Show error message
      showMessage('error', response.message || 'Login failed. Please check your credentials.');
      
      // Reset login button
      loginBtn.disabled = false;
      loginBtn.innerHTML = 'Login';
    }
  } catch (error) {
    console.error('Login error:', error);
    
    // Show error message
    showMessage('error', error.message || 'Login failed. Please try again.');
    
    // Reset login button
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Login';
  }
}

// Function to convert MM/DD/YYYY to YYYY-MM-DD
function convertToISODate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('-')) return dateString; // Already in YYYY-MM-DD format
  
  const [month, day, year] = dateString.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Function to convert YYYY-MM-DD to MM/DD/YYYY
function convertToDisplayDate(dateString) {
  if (!dateString) return '';
  if (dateString.includes('/')) return dateString; // Already in MM/DD/YYYY format
  
  try {
    const [year, month, day] = dateString.split('-');
    if (year && month && day) {
      return `${month}/${day}/${year}`;
    }
    return dateString; // Return original if parsing fails
  } catch (error) {
    console.error('Error converting date:', error);
    return dateString; // Return original if any error occurs
  }
}
