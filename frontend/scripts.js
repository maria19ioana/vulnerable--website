const API_BASE_URL = (() => {
   
    return 'http://localhost:3000';  
    
})();

function saveToken(token) {
  localStorage.setItem('token', token);
  
  if (token) {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        if (payload.email) {
          localStorage.setItem('userEmail', payload.email);
          console.log('Stored user email:', payload.email);
        }
        if (payload.isSuperUser !== undefined) {
          localStorage.setItem('isSuperUser', payload.isSuperUser);
          console.log('Stored superuser status:', payload.isSuperUser);
        }
      }
    } catch (e) {
      console.error('Error extracting data from token:', e);
    }
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function isAuthenticated() {
  return !!getToken();
}

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
		console.log("AICIIIIII:", res)
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

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || `Server error (${res.status})`);
      }
      
      return responseData;
    } else {
      const text = await res.text();
      console.error(`Received non-JSON response (${res.status}):`, text.substring(0, 150));
      
      if (res.ok) {
        return { 
          success: true,
          message: 'Operation completed successfully'
        };
      }
      
      const errorMatch = text.match(/<pre>(.*?)<\/pre>/);
      throw new Error(errorMatch ? errorMatch[1] : `Server returned ${res.status}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

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

    const contentType = res.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const responseData = await res.json();
      
      if (!res.ok) {
        throw new Error(responseData.message || `Server error (${res.status})`);
      }
      
      return responseData;
    } else {
      const text = await res.text();
      console.error(`Received non-JSON response (${res.status}):`, text.substring(0, 150));
      
      if (res.ok) {
        return { 
          success: true,
          message: 'Operation completed successfully'
        };
      }
      
      const errorMatch = text.match(/<pre>(.*?)<\/pre>/);
      throw new Error(errorMatch ? errorMatch[1] : `Server returned ${res.status}`);
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

function checkAuth() {
    const token = localStorage.getItem('token');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const publicPages = ['login.html', 'register.html', 'index.html', ''];
    
    if (token && (currentPage === 'index.html' || currentPage === '')) {
        console.log('User is logged in but on welcome page. Redirecting to dashboard...');
        window.location.href = 'dashboard.html';
        return true;
    }
    
    if (!token && !publicPages.includes(currentPage)) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

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
        
    try {
      const response = await apiPost('/login', { username, password });
      if (response.success) {
        saveToken(response.token);
        localStorage.setItem('username', username);
        localStorage.setItem('userId', response.id);
        localStorage.setItem('isSuperUser', response.isSuperUser);
        
        messageEl.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } else {
        messageEl.innerHTML = `<div class="alert alert-danger">${response.message || 'Login failed'}</div>`;
      }
    } catch (err) {
      console.error('Login error:', err);
      messageEl.innerHTML = `<div class="alert alert-danger">${err.message || 'Error during login'}</div>`;
    }
  });
}

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
        
        messageEl.innerHTML = `<div class="alert alert-info">Testing server connection...</div>`;
        
        try {
            console.log('Checking if server is running...');
            const testResponse = await fetch('http://localhost:3000/test', {
                method: 'GET',
                mode: 'cors',
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
            
            console.log('Creating club via fetch API');
            console.log('Token being used:', token.substring(0, 15) + '...');
            
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
                
                if (data.club) {
                    const newClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');
                    newClubs.push(data.club);
                    localStorage.setItem('dashboardClubs', JSON.stringify(newClubs));
                    localStorage.setItem('dashboardRefresh', 'true');
                }
                
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

function loadClubs() {
    const clubsCountEl = document.getElementById('clubs-count');
    const eventsCountEl = document.getElementById('events-count');
    const activityListEl = document.getElementById('activity-list');
    const memberClubsListEl = document.getElementById('member-clubs-list');
    const memberClubsCountEl = document.getElementById('member-clubs-count');
    const noMembershipsEl = document.getElementById('no-memberships');

    if (clubsCountEl) {
        console.log('Loading clubs for dashboard...');

        const shouldRefresh = localStorage.getItem('dashboardRefresh') === 'true';
        const cachedClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');

        if (shouldRefresh && cachedClubs.length > 0) {
            console.log('Using cached clubs data:', cachedClubs);
            localStorage.removeItem('dashboardRefresh');

            clubsCountEl.textContent = cachedClubs.length;

            if (activityListEl) {
                let clubsHtml = '';
                cachedClubs.forEach(club => {
                    const encodedId = btoa(club.id.toString()); // 🛠 Move this OUTSIDE the template
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
                        <a href="club.html?id=${encodedId}" class="btn btn-sm btn-outline-primary">View</a>
                    </div>
                    `;
                });
                activityListEl.innerHTML = clubsHtml;
            }
        }

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

                        const clubs = response.success ? response.clubs : response;

                        localStorage.setItem('dashboardClubs', JSON.stringify(clubs));

                        clubsCountEl.textContent = clubs.length;

                        if (activityListEl) {
                            if (clubs.length > 0) {
                                let clubsHtml = '';
                                clubs.forEach(club => {
                                    const encodedId = btoa(club.id.toString()); // 🛠 Again, OUTSIDE the template
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
                                        <a href="club.html?id=${encodedId}" class="btn btn-sm btn-outline-primary">View</a>
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

async function loadUserClubsAndEvents() {
    const eventsCountEl = document.getElementById('events-count');
    if (!eventsCountEl) return;
    
    try {
        console.log('Loading user club memberships and events...');
        
        const memberClubs = await getUserClubMemberships();
        console.log('User is a member of these clubs:', memberClubs);
        
        if (!memberClubs.length) {
            eventsCountEl.textContent = '0';
            return;
        }
        
        let allEvents = [];
        for (const club of memberClubs) {
            try {
                const events = await apiGet(`/clubs/${club.club_id}/events`, true);
                if (events && events.length) {
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
        
        eventsCountEl.textContent = allEvents.length.toString();
        
    } catch (error) {
        console.error('Error loading user clubs and events:', error);
        eventsCountEl.textContent = '0';
    }
}

async function getUserClubMemberships() {
    console.log('Getting user club memberships...');
    try {
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
        
        const allClubsResponse = await apiGet('/clubs', true);
        console.log('All clubs response:', allClubsResponse);
        
        let allClubs = [];
        if (Array.isArray(allClubsResponse)) {
            allClubs = allClubsResponse;
        } else if (allClubsResponse && allClubsResponse.success && Array.isArray(allClubsResponse.clubs)) {
            allClubs = allClubsResponse.clubs;
        } else if (allClubsResponse && Array.isArray(allClubsResponse.data)) {
            allClubs = allClubsResponse.data;
        } else {
            console.log('Unexpected clubs response format:', allClubsResponse);
            if (allClubsResponse && typeof allClubsResponse === 'object') {
                allClubs = Object.values(allClubsResponse).filter(item => 
                    item && typeof item === 'object' && item.id && item.name
                );
            }
        }
        
        console.log('Processed clubs list:', allClubs);
        
        console.log('All available clubs:', allClubs);
        
        const memberships = [];
        
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

async function loadUserMemberships() {
    const memberClubsListEl = document.getElementById('member-clubs-list');
    const memberClubsCountEl = document.getElementById('member-clubs-count');
    const noMembershipsEl = document.getElementById('no-memberships');
    
    if (!memberClubsListEl) return;
    
    try {
        memberClubsListEl.innerHTML = `
            <div class="text-center py-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading memberships...</span>
                </div>
                <p class="mt-2">Loading your club memberships...</p>
            </div>
        `;
        
        const memberships = await getUserClubMemberships();
        console.log('User club memberships:', memberships);
        
        if (memberships.length === 0) {
            if (noMembershipsEl) noMembershipsEl.style.display = 'block';
            memberClubsListEl.innerHTML = '';
            if (memberClubsCountEl) memberClubsCountEl.textContent = '0';
            return;
        }
        
        const ownedClubs = JSON.parse(localStorage.getItem('dashboardClubs') || '[]');
        console.log('Owned clubs:', ownedClubs);
        
        const ownedClubIds = ownedClubs.map(club => String(club.id));
        console.log('Owned club IDs:', ownedClubIds);
        
        const memberOnlyClubs = memberships.filter(club => {
            const clubId = String(club.club_id);
            const isOwned = ownedClubIds.includes(clubId);
            console.log(`Club ${clubId} (${club.name}) - Owned: ${isOwned}`);
            return !isOwned;
        });
        
        console.log('Member-only clubs (filtered):', memberOnlyClubs);
        
        if (memberClubsCountEl) {
            memberClubsCountEl.textContent = memberOnlyClubs.length;
        }
        
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

if (window.location.pathname.includes('dashboard.html')) {
    if (!window.location.search.includes('refresh=')) {
        history.replaceState(null, null, `dashboard.html?refresh=${new Date().getTime()}`);
    }
    
    loadClubs();
}


document.addEventListener('click', (e) => {
    if (e.target.id === 'logoutBtn') {
        e.preventDefault();
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        localStorage.removeItem('userId');
        localStorage.removeItem('isSuperUser');
        window.location.href = 'login.html';
    }
});

function updateUsernameDisplay() {
    const username = localStorage.getItem('username');
    const usernameDisplays = document.querySelectorAll('#username-display');
    usernameDisplays.forEach(display => {
        if (display) {
            display.textContent = username || 'Guest';
        }
    });
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'refresh-dashboard' || e.target.closest('#refresh-dashboard')) {
        e.preventDefault();
        console.log('Manual dashboard refresh triggered');
        
        const button = document.getElementById('refresh-dashboard');
        if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
            button.disabled = true;
            
            localStorage.removeItem('dashboardClubs');
            localStorage.removeItem('dashboardRefresh');
            
            loadClubs();
            
    setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 1000);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateNavigation();
    updateUsernameDisplay();

    if (window.location.pathname.includes('create-event.html')) {
        console.log('Populating event club dropdown');
        loadEventClubs();
    }
});

async function loadEventClubs() {
    console.log('Loading clubs for event creation...');
    try {
        const data = await apiGet('/dashboard', true);
        const clubs = data.success ? data.clubs : data;
        const selectEl = document.getElementById('eventClub');
        if (!selectEl) return;
        clubs.forEach(club => {
            const option = document.createElement('option');
            option.value = btoa(club.id.toString());
            option.textContent = club.name;
            selectEl.appendChild(option);
        });
    } catch (err) {
        console.error('Error loading clubs for event dropdown:', err);
    }
}

const createEventForm = document.getElementById('createEventForm');
if (createEventForm) {
    console.log('Create event form detected, attaching submit handler');
    createEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Create event form submitted');

        const messageEl = document.getElementById('create-event-message');
        messageEl.innerHTML = '';

        const title = document.getElementById('eventName').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const encodedClubId = document.getElementById('eventClub').value;
        const clubId = atob(encodedClubId); // <--- decode here
        
        const isPrivate = false;

        if (!title || !description || !clubId) {
            messageEl.innerHTML = `<div class="alert alert-danger">Please fill in all fields and select a club.</div>`;
            return;
        }

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
                messageEl.innerHTML = `<div class="alert alert-success">Event created successfully. Redirecting to dashboard...</div>`;
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1500);
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

function loadClubDetails(clubId) {
  console.log(`Loading club details for ID: ${clubId}`);
  
  document.getElementById('club-name').innerHTML = '<span class="spinner-border text-primary" role="status"></span> Loading Club...';
  document.getElementById('club-description').textContent = 'Fetching club details...';
  document.getElementById('club-category').innerHTML = ''; // Clear category
  document.getElementById('member-list').innerHTML = '<li class="list-group-item text-center"><span class="spinner-border text-primary" role="status"></span> Loading members...</li>';
  document.getElementById('event-list').innerHTML = '<div class="col-12 text-center py-5"><span class="spinner-border text-primary" role="status"></span><p class="mt-2">Loading events...</p></div>';
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('No authentication token found, some features may be limited');
    document.getElementById('create-event-btn').classList.add('d-none');
    document.getElementById('invite-member-btn').classList.add('d-none');
  }
  
  apiGet(`/clubs/${clubId}`, token)
    .then(club => {
      console.log('Club details loaded:', club);
      
      document.getElementById('club-name').textContent = club.name || 'Unnamed Club';
      document.getElementById('club-description').textContent = club.description || 'No description available';
      
      if (club.category && club.category.trim() !== '') {
        document.getElementById('club-category').innerHTML = `
          <span class="category-badge">
            <i class="fas fa-tag me-2"></i>${club.category}
          </span>
        `;
      } else {
        document.getElementById('club-category').innerHTML = ''; 
      }
      
      const username = localStorage.getItem('username');
      
      const userId = localStorage.getItem('userId');
      const isSuperUser = localStorage.getItem('isSuperUser') === 'true';

      console.log('Debug info:', {
        userId,
        isSuperUser,
        clubOwnerId: club.owner_id,
        localStorage: {
          token: localStorage.getItem('token'),
          isSuperUser: localStorage.getItem('isSuperUser'),
          userId: localStorage.getItem('userId')
        }
      });

      if ((userId && club.owner_id === parseInt(userId)) || isSuperUser) {
        console.log('Edit button should be shown - user is owner or superuser');
        console.log('Club actions element:', document.getElementById('club-actions'));

        document.getElementById('club-actions').innerHTML = `
          <button class="btn btn-outline-primary me-2" id="edit-club-btn">
            <i class="fas fa-edit"></i> Edit Club
          </button>
        `;

        if (userId && club.owner_id === parseInt(userId)) {
          document.getElementById('club-actions').innerHTML += `
            <button class="btn btn-outline-danger" id="delete-club-btn">
              <i class="fas fa-trash-alt"></i> Delete Club
            </button>
          `;
        }

        document.getElementById('create-event-btn').classList.remove('d-none');
        document.getElementById('invite-member-btn').classList.remove('d-none');
      } else if (token) {
        document.getElementById('create-event-btn').classList.remove('d-none');
      }

      displayMembers(clubId);
      
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
  
  const eventList = document.getElementById('event-list');
  eventList.innerHTML = '<div class="col-12 text-center py-5"><span class="spinner-border text-primary" role="status"></span><p class="mt-2">Loading events...</p></div>';
  
  apiGet('/debug-auth', true)
    .then(authResult => {
      console.log('Auth check result:', authResult);
      
      return apiGet(`/clubs/${clubId}/events`, true)
        .then(events => {
          console.log('Club events loaded:', events);
          displayEvents(events, eventList);
        })
        .catch(error => {
          console.error('Error loading club events, trying all-events fallback:', error);
          
          return apiGet('/all-events', true)
            .then(allEvents => {
              console.log('All events loaded, filtering for club:', allEvents);
              
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
      
      console.log('Falling back to mock events data');
      const mockEvents = [
        {
          clubId: 1,
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
      
      eventList.innerHTML = `
        <div class="col-12 mb-4">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Could not load real events from the server. Showing sample events instead.
            <button class="btn btn-sm btn-outline-dark ms-2" onclick="loadClubEvents('${clubId}')">Try Again</button>
          </div>
        </div>
      `;
      
      displayEvents(mockEvents, eventList, true);
    });
}

function displayEvents(events, eventList, append = false) {
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

  events.forEach(event => {
    const eventDate = new Date(event.date || new Date());
    const formattedDate = eventDate.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const encodedEventId = btoa(event.id.toString()); // 🛠 ENCODE THE ID

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
          <a href="event.html?id=${encodedEventId}" class="btn btn-sm btn-outline-primary">
            <i class="fas fa-info-circle me-1"></i> View Details
          </a>
        </div>
      </div>
    `;
    eventList.appendChild(eventCard);
  });
}


async function loadMembershipStatus(clubId) {
  console.log(`Checking membership status for club ID: ${clubId}`);
  
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('User not logged in, hiding membership actions');
    document.querySelector('.membership-status').classList.add('d-none');
    return;
  }
  
  try {
    const statusText = document.getElementById('membership-status-text');
    const joinBtn = document.getElementById('join-club-btn');
    const leaveBtn = document.getElementById('leave-club-btn');
    
    statusText.innerHTML = '<span class="spinner-border spinner-border-sm text-primary" role="status"></span> Checking membership...';
    joinBtn.classList.add('d-none');
    leaveBtn.classList.add('d-none');
    
    const userId = localStorage.getItem('userId');
    
    const clubResponse = await apiGet(`/clubs/${clubId}`, true);
    
    if (userId && clubResponse.owner_id === parseInt(userId)) {
      statusText.innerHTML = '<i class="fas fa-crown text-warning me-2"></i> You own this club';
      joinBtn.classList.add('d-none');
      leaveBtn.classList.add('d-none');
      return;
    }
    
    const response = await apiGet(`/clubs/${clubId}/membership`, true);
    console.log('Membership status:', response);
    
    if (response.success) {
      if (response.isMember) {
        statusText.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> You are a member of this club';
        joinBtn.classList.add('d-none');
        leaveBtn.classList.remove('d-none');
      } else {
        statusText.innerHTML = '<i class="fas fa-times-circle text-secondary me-2"></i> You are not a member of this club';
        joinBtn.classList.remove('d-none');
        leaveBtn.classList.add('d-none');
      }
    } else {
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

async function joinClub(clubId) {
  console.log(`Attempting to join club ID: ${clubId}`);
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to join a club');
    window.location.href = 'login.html';
    return;
  }
  
  try {
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
      await loadMembershipStatus(clubId);
      
      displayMembers(clubId);
      
      return data;
    } else {
      throw new Error(data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error joining club:', error);
    throw error;
  }
}

async function leaveClub(clubId) {
  console.log(`Attempting to leave club ID: ${clubId}`);
  
  const token = localStorage.getItem('token');
  if (!token) {
    alert('You must be logged in to leave a club');
    window.location.href = 'login.html';
    return;
  }
  
  try {
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
      await loadMembershipStatus(clubId);
      
      displayMembers(clubId);
      
      return data;
    } else {
      throw new Error(data.message || 'Unknown error');
    }
  } catch (error) {
    console.error('Error leaving club:', error);
    throw error;
  }
}

async function getClubMembers(clubId) {
  console.log(`Getting members for club ID: ${clubId}`);
  
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Cannot get members: user not logged in');
      return [];
    }
    
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

async function displayMembers(clubId) {
  console.log(`Displaying members for club ID: ${clubId}`);
  const memberList = document.getElementById('member-list');
  
  if (!memberList) {
    console.error('Member list element not found');
    return;
  }
  
  try {
    memberList.innerHTML = '<li class="list-group-item text-center"><span class="spinner-border text-primary" role="status"></span> Loading members...</li>';
    
    const members = await getClubMembers(clubId);
    
    if (!members || members.length === 0) {
      memberList.innerHTML = `
        <li class="list-group-item text-center">
          <p class="text-muted">No members found</p>
        </li>
      `;
      return;
    }
    
    memberList.innerHTML = '';
    
    members.forEach(member => {
      const memberItem = document.createElement('li');
      memberItem.className = 'list-group-item member-item';
      
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
  const clubLinkElement = document.getElementById('club-link');
  const loadingElement = document.getElementById('event-loading');
  const contentElement = document.getElementById('event-content');
  const errorElement = document.getElementById('event-error');
  const editButton = document.getElementById('edit-event-btn');
  const deleteButton = document.getElementById('delete-event-btn');
  const actionsContainer = document.getElementById('event-actions');

  if (loadingElement) loadingElement.classList.remove('d-none');
  if (contentElement) contentElement.classList.add('d-none');
  if (errorElement) errorElement.classList.add('d-none');
  if (actionsContainer) actionsContainer.classList.add('d-none');

  const token = localStorage.getItem('token');
  
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
    
    if (titleElement) titleElement.textContent = data.title;
    if (descriptionElement) descriptionElement.textContent = data.description;
    if (dateElement) dateElement.textContent = new Date(data.created_at).toLocaleDateString();
    
    if (clubLinkElement && data.club_id) {
      clubLinkElement.href = `club.html?id=${data.club_id}`;
      
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


let invitesLoaded = false;
let invitesLoadInProgress = false;

async function loadUserInvites() {
  if (invitesLoadInProgress) {
    console.log('Invite loading already in progress, waiting...');
    while (invitesLoadInProgress) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return JSON.parse(localStorage.getItem('userInvites') || '[]');
  }
  
  if (invitesLoaded) {
    console.log('Invites already loaded, using cached data');
    return JSON.parse(localStorage.getItem('userInvites') || '[]');
  }
  
  try {
    invitesLoadInProgress = true;
    console.log('Loading user invites...');
    let response;
    try {
      response = await apiGet('/api/invites', true);
    } catch (error) {
      console.log('Failed to load from /api/invites, trying /user/invites...');
      response = await apiGet('/user/invites', true);
    }
    
    if (response && response.success) {
      localStorage.setItem('userInvites', JSON.stringify(response.invites));
      
      updateNotificationCount(response.invites.length);
      
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

function updateNotificationCount(count) {
  const notificationsCountEl = document.getElementById('notifications-count');
  if (notificationsCountEl) {
    notificationsCountEl.textContent = count;
    
    const notificationIcon = document.querySelector('.fa-bell').parentElement;
    if (notificationIcon) {
      if (count > 0) {
        notificationIcon.classList.add('position-relative');
        
        let badge = notificationIcon.querySelector('.notification-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notification-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger';
          notificationIcon.appendChild(badge);
        }
        
        badge.textContent = count;
        badge.style.display = 'block';
      } else {
        const badge = notificationIcon.querySelector('.notification-badge');
        if (badge) {
          badge.style.display = 'none';
        }
      }
    }
  }
}

function showInvitesModal() {
  const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
  
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
  
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  setTimeout(() => {
    const acceptButtons = document.querySelectorAll('.accept-invite-btn');
    acceptButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const inviteId = button.getAttribute('data-invite-id');
        await acceptInvite(inviteId, button);
      });
    });
    
    const rejectButtons = document.querySelectorAll('.reject-invite-btn');
    rejectButtons.forEach(button => {
      button.addEventListener('click', async () => {
        const inviteId = button.getAttribute('data-invite-id');
        await rejectInvite(inviteId, button);
      });
    });
  }, 500);
}

function forceReloadInvites() {
  console.log('Forcing invites reload');
  invitesLoaded = false;
  
  if (!invitesLoadInProgress) {
    loadUserInvites();
  } else {
    console.log('Skipping reload as one is already in progress');
  }
}

async function acceptInvite(inviteId, buttonEl) {
  try {
    buttonEl.disabled = true;
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Accepting...';
    
    const response = await apiPost(`/invites/${inviteId}/accept`, {}, true);
    
    if (response && response.success) {
      const card = buttonEl.closest('.card');
      card.innerHTML = `
        <div class="card-body text-center">
          <i class="fas fa-check-circle text-success fa-3x mb-3"></i>
          <h5>Invite Accepted!</h5>
          <p>You are now a member of the club.</p>
          <a href="club.html?id=${response.clubId}" class="btn btn-primary">Go to Club Page</a>
        </div>
      `;
      
      const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
      const updatedInvites = invites.filter(invite => invite.id != inviteId);
      localStorage.setItem('userInvites', JSON.stringify(updatedInvites));
      
      forceReloadInvites();
      
      
    } else {
      alert('Error accepting invite: ' + (response?.message || 'Unknown error'));
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error accepting invite:', error);
    alert('Error accepting invite: ' + error.message);
    
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
}

async function rejectInvite(inviteId, buttonEl) {
  try {
    if (!confirm('Are you sure you want to reject this invite?')) {
      return;
    }
    
    buttonEl.disabled = true;
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Rejecting...';
    
    const response = await apiPost(`/invites/${inviteId}/reject`, {}, true);
    
    if (response && response.success) {
      const card = buttonEl.closest('.card');
      card.innerHTML = `
        <div class="card-body text-center">
          <i class="fas fa-times-circle text-danger fa-3x mb-3"></i>
          <h5>Invite Rejected</h5>
          <p>You have declined to join this club.</p>
        </div>
      `;
      
      const invites = JSON.parse(localStorage.getItem('userInvites') || '[]');
      const updatedInvites = invites.filter(invite => invite.id != inviteId);
      localStorage.setItem('userInvites', JSON.stringify(updatedInvites));
      
      forceReloadInvites();
      
    } else {
      alert('Error rejecting invite: ' + (response?.message || 'Unknown error'));
      buttonEl.disabled = false;
      buttonEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error rejecting invite:', error);
    alert('Error rejecting invite: ' + error.message);
    
    buttonEl.disabled = false;
    buttonEl.innerHTML = originalText;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  checkAuth();
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('isSuperUser');
      window.location.href = 'login.html';
    });
  }
  
  if (window.location.pathname.includes('dashboard.html')) {
    loadUserInvites();
  }
});
