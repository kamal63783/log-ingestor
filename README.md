# Log Ingestor Application

This application provides a user interface for managing and viewing logs ingested into a MongoDB database. It consists of a frontend built using Nuxt.js and a backend powered by Express.js and WebSocket for real-time communication.

## Table of Contents

- [Features](#features)
- [Technologies Used](#technologies-used)
- [Setup Instructions](#setup-instructions)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
    - [Database Setup](#database-setup)
      - [MongoDB Setup](#mongodb-setup)
        - [Compass Setup](#compass-setup)
        - [MongoDB Atlas Setup](#mongodb-atlas-setup)
      - [Input Format for Database Configuration](#input-format-for-database-configuration)
    - [WebSocket Setup](#websocket-setup)
      - [WebSocket Configuration](#websocket-configuration)
      - [Input Format for WebSocket Configuration](#input-format-for-websocket-configuration)
- [Usage](#usage)
  - [Log Ingestion](#log-ingestion)
  - [Running the Application](#running-the-application)

## Features

- **Authentication:** Enables user login and logout functionalities.
- **Database Connectivity:** Allows switching between databases and logging out.
- **Search and Filters:** Enables log search and filter application with the following capabilities:
  - Search within specific date ranges.
  - Utilization of regular expressions for search.
  - Combination of multiple filters.
- **Pagination:** Facilitates log pagination for easier navigation.
- **Real-time Functionality:**
  - Provides real-time log ingestion and search capabilities.
- **Role-based Access Control:** Implements role-based access to the query interface, including:
  - Differentiation of user roles to control access levels.

## Technologies Used

### Backend

- **Express.js:** Web application framework for Node.js.
- **MongoDB:** Document database for storing log data.
- **WebSocket:** Communication protocol for real-time data transfer.
- **Node.js:** JavaScript runtime for server-side logic.

### Frontend

- **Nuxt.js:** Higher-level framework for Vue.js applications.
- **Vue.js:** Frontend framework for building user interfaces.
- **WebSocket:** Communication protocol enabling real-time data transfer.
- **JavaScript (ES6+):** Programming language for frontend logic.

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB instance running
- Access to WebSocket server (if deployed separately)

### Installation

1. **Clone the repository:**

   ```bash
   $ git clone https://www.github.com/kamal63783/log-ingestor.git

   $ cd log-ingestor-app
   ```

2. **Install the dependencies:**

   ```bash
   # Navigate to backend folder
   $ cd server
   $ npm install

   # Navigate to frontend folder
   $ cd log-ingestor
   $ npm install
   ```

### **Configuration:**

1. ### Database Setup

- ##### MongoDB Setup

  You can set up a MongoDB instance using either [Compass](https://www.mongodb.com/try/download/compass) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).

- ##### Compass Setup

1. **Download and Install Compass:**
   Download and install MongoDB Compass by following the instructions on the [MongoDB Compass download page](https://www.mongodb.com/try/download/compass).

2. **Connect to MongoDB:**

- Open Compass and click on "New Connection."
- Enter the connection details (hostname, port, authentication) to connect to your MongoDB instance.

- ##### MongoDB Atlas Setup

1. **Create an Account:** Sign up for a MongoDB Atlas account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register).

2. **Create a Cluster:** Once logged in, create a new cluster by following the instructions provided in the MongoDB Atlas dashboard.

- #### Input Format for Database Configuration

  For configuring the application, input the following details:

  - **MongoDB URL:** The connection URL to your MongoDB instance.
    Example: `mongodb://<username>:<password>@<hostname>:<port>/<database-name>` or `mongodb://localhost:<port>`
    (Replace `<username>`, `<password>`, `<hostname>`, `<port>`, and `<database-name>` with your actual credentials)

  - **Database Name:** The name of the MongoDB database where logs will be stored.
    Example: `logs_db`

  - **Collection Name:** The name of the collection within the database to store log data.
    Example: `logs`

- In case of errors while setting the DB config, double-check the entered details to ensure they match the expected format both in the code and in the provided examples.

2. ### WebSocket Setup

   #### WebSocket Configuration

   The WebSocket enables real-time communication between the server and connected clients.

   - **WebSocket Implementation:** The code utilizes the `ws` library for WebSocket functionality.

   #### Input Format for WebSocket Configuration

   The WebSocket is initialized and configured within the server script. No specific user input is required for this setup. Ensure that the server is configured to allow WebSocket connections.

   If you need to configure the WebSocket URL:

   1. Navigate to the `index.vue` file available in the `pages` folder in `log-ingestor` folder.
   2. Locate the line: `const socket = new WebSocket('ws://localhost:3000')`.
   3. Modify the URL (`'ws://localhost:3000'`) to match your WebSocket server address and port.

## Usage

### Log Ingestion

Logs can be ingested via a POST request to `localhost:3000` or at port `3000`. Ensure that the logs follow this format:

```json
{
  "level": "error",
  "message": "Failed to connect to DB",
  "resourceId": "server-1234",
  "timestamp": "2023-09-15T08:00:00Z",
  "traceId": "abc-xyz-123",
  "spanId": "span-456",
  "commit": "5e5342f",
  "metadata": {
    "parentResourceId": "server-0987"
  }
}
```

### Running the application

### Backend

```bash
Start the backend server:
# Navigate to the project directory
$ cd server

# Run the application using nodemon
npm run dev
```

## Frontend

```bash
Start the frontend application:
# Navigate to the project directory
$ cd log-ingestion

# Run the application in development mode:
$ npm run dev

# Build the application for production
$ npm run build

# Launch the production server
$ npm run start

# Generate a static project
$ npm run generate
```

---

**Note**: Both servers should be run separately. The Log Ingestor App can be viewed at [localhost:4000](https://localhost:4000)
