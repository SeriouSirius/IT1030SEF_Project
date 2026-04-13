# IT1030SEF Project

A campus Lost and Found web app where students can:

- Report lost items
- Report found items
- Browse both item boards
- Search and filter by keyword, category, and location
- Verify ownership through multiple-choice questions before seeing contact details

## Features

- Separate report forms for lost and found items
- Image upload support (stored as Data URL)
- Verification question builder on submission forms:
	- Minimum 2 questions
	- Maximum 5 questions
	- 4 options per question
- Contact details hidden until the claimant answers all verification questions correctly
- Header quick-search popup available across pages
- SQLite persistence (data remains after refresh/restart)

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js + Express
- Database: SQLite (`sqlite3` package)

## Project structure

```
index.html
style.css
backend/
	server.js          # Express server + API routes + DB setup
	database.js        # Frontend API wrapper (fetch helpers)
	find_form.js       # Logic for found-item form page
	lost_form.js       # Logic for lost-item form page
	verify_holder.js   # Verification modal + contact reveal + list rendering
	header_search.js   # Shared header quick-search popup behavior
frontend/
	find_form.html
	lost_form.html
	find_item_list.html
	lost_item_list.html
README.md
PRD.md
```

## Prerequisites

- Node.js 18+ (recommended)
- npm

## Installation and run

From the project root, install required packages:

```bash
npm install
```

Start the server:

```bash
npm start
```

Open in browser:

```text
http://localhost:3000
```

## How to use the app

1. Open Home page.
2. Choose either:
	 - `Found` to report an item you found
	 - `Lost` to report an item you lost
3. Fill in required fields:
	 - Item name, category, location, date, description, contact
	 - Optional photo
4. Add verification questions (at least 2).
5. Submit the post.
6. Go to `Found Item Board` or `Lost Item Board`.
7. Use filters/search if needed.
8. Click `Answer Questions to View Contact` and answer all questions correctly.
9. If verified, contact details are revealed.

## API overview

Base URL: `http://localhost:3000`

- `GET /api/items/all`
	- Returns up to 500 most recent posts.

- `GET /api/items/:type`
	- `:type` is `lost` or `found`
	- Supports query params:
		- `keyword`
		- `category`
		- `location`

- `GET /api/items/:type/:id`
	- Returns one item by type and ID.

- `POST /api/items/:type`
	- Creates a new lost/found post.
	- Required fields:
		- `itemName`, `category`, `location`, `date`, `description`, `contact`
	- `questions` must include at least 2 valid question objects.
	- Optional: `photoDataUrl`

## Database details

- Database file: `backend/database.db`
- Table: `items`
- Main columns:
	- `id`, `type`, `item_name`, `category`, `location`, `date`
	- `description`, `question`, `answer`, `questions_json`
	- `photo_data_url`, `contact`, `created_at`

The database table and indexes are auto-created on server startup.

## Notes

- Item IDs are generated as:
	- Lost: `L-<timestamp>-<random>`
	- Found: `F-<timestamp>-<random>`
- Verification options are shuffled when presented to users.
- Contact information is shown only after successful verification.

## Troubleshooting

- `Cannot find module 'express'` or `sqlite3`
	- Run: `npm install express sqlite3`

- Port already in use (`3000`)
	- Stop the process using port 3000, then restart server.

- Database issues
	- Ensure the app has write permission to the `backend` folder.
