# FinFolio — Smart Finance Tracker

A complete full-stack personal finance web application built with Node.js, Express, MongoDB, and Vanilla JS.

## Features

- 📊 Income & Expense Tracking with categories and charts
- 🎯 Financial Goal Setting with contribution tracking
- 📋 Budget Management with spending alerts
- 📈 Investment Suggestions tailored to risk profile
- 📰 Curated Finance News feed
- 💬 Community Chat Rooms for peer learning
- 🤖 AI Financial Advisor chatbot
- 📊 Detailed Reports with trend analysis
- 🛟 Customer Support Ticket System
- 👤 User Profile with financial health score

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment
Edit `backend/.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finfolio
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Start the Server
```bash
cd backend
npm start
```

The app will be available at **http://localhost:5000**

---

## Deployment (Railway / Render)

1. Push both `backend/` and `frontend/` to your repository
2. Set these environment variables in your hosting dashboard:
   - `MONGODB_URI` → Your MongoDB Atlas connection string
   - `JWT_SECRET` → Any long random string (min 32 chars)
   - `NODE_ENV` → `production`
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`

The Express server serves the frontend statically — no separate frontend deployment needed.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | ❌ | Create account |
| POST | /api/auth/login | ❌ | Login |
| GET | /api/auth/me | ✅ | Get current user |
| PUT | /api/auth/profile | ✅ | Update profile |
| PUT | /api/auth/change-password | ✅ | Change password |
| GET | /api/transactions | ✅ | List transactions (paginated) |
| POST | /api/transactions | ✅ | Add transaction |
| PUT | /api/transactions/:id | ✅ | Update transaction |
| DELETE | /api/transactions/:id | ✅ | Delete transaction |
| GET | /api/transactions/summary | ✅ | Dashboard summary + charts data |
| GET | /api/transactions/top-categories | ✅ | Top spending categories |
| GET | /api/goals | ✅ | List goals |
| POST | /api/goals | ✅ | Create goal |
| PUT | /api/goals/:id | ✅ | Update goal |
| POST | /api/goals/:id/contribute | ✅ | Add contribution |
| DELETE | /api/goals/:id | ✅ | Delete goal |
| GET | /api/budgets | ✅ | List budgets with spending |
| POST | /api/budgets | ✅ | Create budget |
| PUT | /api/budgets/:id | ✅ | Update budget |
| DELETE | /api/budgets/:id | ✅ | Delete budget |
| GET | /api/chat | ✅ | Get chat messages |
| POST | /api/chat | ✅ | Post message |
| POST | /api/chat/:id/like | ✅ | Like message |
| DELETE | /api/chat/:id | ✅ | Delete message |
| GET | /api/support | ✅ | Get support tickets |
| POST | /api/support | ✅ | Create ticket |
| GET | /api/support/:id | ✅ | Get ticket by ID |
| POST | /api/support/:id/reply | ✅ | Reply to ticket |

---

## Tech Stack

**Backend:** Node.js 20, Express 4, MongoDB + Mongoose, JWT, bcryptjs, Helmet, express-rate-limit

**Frontend:** Pure HTML5, CSS3, Vanilla JS (no frameworks), Chart.js 4, Google Fonts

---

## Project Structure

```
finfolio/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── transactionController.js
│   │   ├── goalController.js
│   │   ├── budgetController.js
│   │   ├── chatController.js
│   │   └── supportController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Goal.js
│   │   ├── Budget.js
│   │   ├── ChatMessage.js
│   │   └── Support.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── transactions.js
│   │   ├── goals.js
│   │   ├── budgets.js
│   │   ├── chat.js
│   │   └── support.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── server.js
└── frontend/
    ├── css/style.css
    ├── js/app.js
    └── index.html
```
