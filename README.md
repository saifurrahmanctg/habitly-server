# 🌱 Habitly Server

This is the **backend (server-side)** for the Habit Tracker web application — a productivity tool that helps users build positive habits and maintain consistent streaks.

---

## 🌍 Live API URL

👉 **[https://habitly-server-eosin.vercel.app/](https://habitly-server-eosin.vercel.app/)**  
(Local development: `http://localhost:3000`)

---

## 🚀 Features

- 🧑‍💻 **User Authentication:** Firebase Auth integration (register/login/logout)
- 🧱 **RESTful API:** Built with Express.js for easy scalability
- 📦 **MongoDB Database:** Stores habits, user progress, and streak data
- 🔒 **Secure Endpoints:** Firebase authorization middleware
- 📊 **Progress Tracking:** Update and retrieve daily streak data efficiently
- 🌤️ **Cross-Origin Support:** CORS enabled for seamless client–server communication

---

## 🛠️ Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Backend        | **Node.js**, **Express.js**              |
| Database       | **MongoDB** with Mongoose                |
| Authentication | **Firebase Authentication**              |
| Hosting        | **Vercel**                               |
| Environment    | `.env` file for secret keys and API URLs |

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/yourusername/habit-tracker-server.git
cd habit-tracker-server
```

2️⃣ Install dependencies

```bash
npm install
```

3️⃣ Configure environment variables

Create a .env file in the root directory with:

```bash
PORT=3000
MONGO_URI=your_mongodb_connection_string
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_admin_sdk_client_email
FIREBASE_PRIVATE_KEY="your_firebase_admin_private_key"
```

4️⃣ Run the development server

```bash
npm run dev
```
