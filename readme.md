# Capstone-2 (Fullstack System)

This is a fullstack system built with **React (frontend)** and **Node.js/Express (backend)**.

# 🖥️ How to Clone and Run the System

Follow these steps to set up this project on a new PC.

# 1️⃣ Clone the Repository
Open terminal/PowerShell and run:
```powershell
cd "C:\HTML ws"
git clone https://github.com/Jemershon/Capstone-2.git
cd Capstone-2

# 2️⃣ Setup Backend
powershell

cd backend
npm install     # install dependencies
npm start       # start backend server
Backend will run on: http://localhost:5000 (or your configured port)


# 3️⃣ Setup Frontend
powershell

cd ../frontend/react-app
npm install     # install dependencies
npm start       # start frontend app
Frontend will run on: http://localhost:3000

⚡ Requirements
Node.js (v16+ recommended) → Download here

npm (comes with Node.js)

MongoDB running locally (or update .env with your cloud MongoDB connection string)

🔑 Environment Variables
Inside backend/, create a .env file with:


PORT=5000
MONGO_URI=mongodb://localhost:27017/notetify
JWT_SECRET=your_jwt_secret
🛠 Tech Stack
Frontend: React, Axios, Bootstrap

Backend: Node.js, Express.js, MongoDB, JWT, Bcrypt

Tools: Git, npm


