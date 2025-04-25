# Club Connect Web Application

A vulnerable-by-design web application for cybersecurity training.

## Setup

### Backend

1. Navigate to the backend directory:
```
cd backend
```

2. Install dependencies:
```
npm install
```

3. Start the server:
```
node server.js
```

The server will be running at http://localhost:3000

### Frontend

For testing without CORS issues, use one of these methods:

#### Method 1: Use a local web server (recommended)

1. Install a simple HTTP server:
```
npm install -g http-server
```

2. Navigate to the frontend directory:
```
cd frontend
```

3. Start the local server:
```
http-server -p 8080
```

4. Open your browser and navigate to:
```
http://localhost:8080/login.html
```

#### Method 2: Use Python HTTP server

1. Navigate to the frontend directory:
```
cd frontend
```

2. Start the Python HTTP server:
```
# For Python 3
python3 -m http.server 8080

# For Python 2
python -m SimpleHTTPServer 8080
```

3. Open your browser and navigate to:
```
http://localhost:8080/login.html
```

#### Method 3: Configure your browser for local development

##### Chrome:
1. Close all Chrome instances
2. Start Chrome with the following flag:
```
google-chrome --disable-web-security --user-data-dir=/tmp/chrome-dev
```

##### Firefox:
1. Open about:config
2. Set security.fileuri.strict_origin_policy to false

## Test Credentials
- Username: admin
- Password: password

## Main Features
- User registration and login
- Club creation and management
- Event creation and management
- Club invitations 