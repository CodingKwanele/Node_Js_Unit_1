# My Recipe Web — Clean Express Starter

A tidy Express + EJS + Mongo starter with users, subscribers, and courses.
Built to fix common issues (ESM, express-validator, view engine, missing routes).

## Quick start

```bash
cp .env.example .env
# edit .env if needed
npm install
npm run dev   # starts nodemon on http://localhost:3000
```

## Features
- ES Modules (`type: module`)
- EJS view engine with a base layout
- Clean routes: `/users`, `/subscribers`, `/courses`
- Flash messages, sessions, and Passport local login
- MongoDB models for User, Subscriber, Course
- Form validation with `express-validator`
- Dark, clean UI

## Folder structure
```
controllers/
models/
routes/
views/
  partials/layout.ejs
public/css/styles.css
main.js
passport-config.js
```
