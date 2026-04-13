const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
var PORT = 3000;
var rootDir = path.join(__dirname, "..");
var dbPath = path.join(__dirname, "database.db");

var db = new sqlite3.Database(dbPath);

app.use(express.json({ limit: "15mb" }));
app.use(express.static(rootDir));

// setup database table on start
async function setupDB() {
    await new Promise(function(resolve, reject) {
        db.run(
            "CREATE TABLE IF NOT EXISTS items (" +
            "id TEXT PRIMARY KEY, " +
            "type TEXT NOT NULL, " +
            "item_name TEXT NOT NULL, " +
            "category TEXT NOT NULL, " +
            "location TEXT NOT NULL, " +
            "date TEXT NOT NULL, " +
            "description TEXT NOT NULL, " +
            "question TEXT NOT NULL, " +
            "answer TEXT NOT NULL, " +
            "questions_json TEXT NOT NULL DEFAULT '[]', " +
            "photo_data_url TEXT, " +
            "contact TEXT NOT NULL, " +
            "created_at TEXT NOT NULL" +
            ")",
            [],
            function(err) {
                if (err) { reject(err); return; }
                resolve();
            }
        );
    });
    // index for faster search
    await new Promise(function(resolve, reject) {
        db.run("CREATE INDEX IF NOT EXISTS idx_type_date ON items(type, created_at DESC)", [], function(err) {
            if (err) { reject(err); return; }
            resolve();
        });
    });
    await new Promise(function(resolve, reject) {
        db.run("CREATE INDEX IF NOT EXISTS idx_category ON items(category)", [], function(err) {
            if (err) { reject(err); return; }
            resolve();
        });
    });
    await new Promise(function(resolve, reject) {
        db.run("CREATE INDEX IF NOT EXISTS idx_location ON items(location)", [], function(err) {
            if (err) { reject(err); return; }
            resolve();
        });
    });
}

// get all items from db
app.get("/api/items/all", async function(req, res) {
    db.all("SELECT * FROM items ORDER BY datetime(created_at) DESC LIMIT 500", [], function(err, rows) {
        if (err) {
            console.log("error:", err);
            res.status(500).json({ message: "Failed to load items." });
            return;
        }
        var result = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var qs = [];
            if (r.questions_json) {
                try { qs = JSON.parse(r.questions_json); } catch(e) { qs = []; }
            }
            result.push({
                id: r.id,
                type: r.type,
                itemName: r.item_name,
                category: r.category,
                location: r.location,
                date: r.date,
                description: r.description,
                question: r.question,
                answer: r.answer,
                questions: qs,
                photoDataUrl: r.photo_data_url,
                contact: r.contact,
                createdAt: r.created_at
            });
        }
        res.json({ items: result });
    });
});

// search items by type, with optional filters
app.get("/api/items/:type", async function(req, res) {
    var type = req.params.type;
    if (type != "lost" && type != "found") {
        res.status(400).json({ message: "Invalid item type." });
        return;
    }

    var keyword = req.query.keyword ? req.query.keyword.trim().toLowerCase() : "";
    var category = req.query.category ? req.query.category.trim().toLowerCase() : "";
    var location = req.query.location ? req.query.location.trim().toLowerCase() : "";

    var sql = "SELECT * FROM items " +
        "WHERE type = ? " +
        "AND (? = '' OR lower(category) = ?) " +
        "AND (? = '' OR lower(location) LIKE '%' || ? || '%') " +
        "AND (? = '' OR lower(item_name || ' ' || category || ' ' || location || ' ' || description) LIKE '%' || ? || '%') " +
        "ORDER BY datetime(created_at) DESC";

    db.all(sql, [type, category, category, location, location, keyword, keyword], function(err, rows) {
        if (err) {
            console.log("search failed:", err);
            res.status(500).json({ message: "Failed to search items." });
            return;
        }
        var items = [];
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var qs = [];
            try { qs = JSON.parse(r.questions_json); } catch(e) {}
            items.push({
                id: r.id,
                type: r.type,
                itemName: r.item_name,
                category: r.category,
                location: r.location,
                date: r.date,
                description: r.description,
                question: r.question,
                answer: r.answer,
                questions: qs,
                photoDataUrl: r.photo_data_url,
                contact: r.contact,
                createdAt: r.created_at
            });
        }
        res.json({ items: items });
    });
});

// get one item by id
app.get("/api/items/:type/:id", async function(req, res) {
    var type = req.params.type;
    var id = req.params.id ? req.params.id.trim() : "";

    if ((type != "lost" && type != "found") || !id) {
        res.status(400).json({ message: "Invalid request." });
        return;
    }

    db.get("SELECT * FROM items WHERE type = ? AND id = ?", [type, id], function(err, row) {
        if (err) {
            console.log("error getting item:", err);
            res.status(500).json({ message: "Failed to load item." });
            return;
        }
        if (!row) {
            res.status(404).json({ message: "Item not found." });
            return;
        }
        var qs = [];
        try { qs = JSON.parse(row.questions_json); } catch(e) {}
        res.json({
            item: {
                id: row.id,
                type: row.type,
                itemName: row.item_name,
                category: row.category,
                location: row.location,
                date: row.date,
                description: row.description,
                question: row.question,
                answer: row.answer,
                questions: qs,
                photoDataUrl: row.photo_data_url,
                contact: row.contact,
                createdAt: row.created_at
            }
        });
    });
});

// submit a new lost/found item
app.post("/api/items/:type", async function(req, res) {
    var type = req.params.type;
    if (type != "lost" && type != "found") {
        res.status(400).json({ message: "Invalid item type." });
        return;
    }

    var body = req.body || {};

    var itemName = body.itemName ? body.itemName.trim() : "";
    var category = body.category ? body.category.trim() : "";
    var location = body.location ? body.location.trim() : "";
    var date = body.date ? body.date.trim() : "";
    var description = body.description ? body.description.trim() : "";
    var contact = body.contact ? body.contact.trim() : "";
    var photoDataUrl = body.photoDataUrl ? body.photoDataUrl.trim() : "";

    if (!itemName || !category || !location || !date || !description || !contact) {
        res.status(400).json({ message: "Please fill all required fields." });
        return;
    }

    // validate questions
    var rawQuestions = Array.isArray(body.questions) ? body.questions : [];
    var questions = [];
    for (var i = 0; i < rawQuestions.length; i++) {
        var q = rawQuestions[i];
        if (!q) continue;
        var prompt = q.prompt ? q.prompt.trim() : "";
        var opts = [];
        var rawOpts = Array.isArray(q.options) ? q.options : [];
        for (var j = 0; j < rawOpts.length; j++) {
            var o = rawOpts[j] ? rawOpts[j].trim() : "";
            if (o != "") opts.push(o);
        }
        var ci = parseInt(q.correctIndex, 10);
        if (!prompt || opts.length < 2) continue;
        if (isNaN(ci) || ci < 0 || ci >= opts.length) continue;
        questions.push({ prompt: prompt, options: opts, correctIndex: ci });
        if (questions.length >= 5) break;
    }

    if (questions.length < 2) {
        res.status(400).json({ message: "Please add at least 2 verification questions with multiple-choice options." });
        return;
    }

    // generate id like L-1234567890-56789
    var prefix = type === "lost" ? "L" : "F";
    var itemId = prefix + "-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

    var firstQ = questions[0].prompt;
    var firstA = questions[0].options[questions[0].correctIndex].toLowerCase().trim();
    var questionsJson = JSON.stringify(questions);
    var createdAt = new Date().toISOString();

    var sql = "INSERT INTO items (id, type, item_name, category, location, date, description, question, answer, questions_json, photo_data_url, contact, created_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    db.run(sql, [itemId, type, itemName, category, location, date, description, firstQ, firstA, questionsJson, photoDataUrl, contact, createdAt], function(err) {
        if (err) {
            console.log("failed to save item:", err);
            res.status(500).json({ message: "Failed to save item." });
            return;
        }
        console.log("item saved:", itemId);
        res.status(201).json({
            item: {
                id: itemId, type: type, itemName: itemName, category: category,
                location: location, date: date, description: description,
                question: firstQ, answer: firstA, questions: questions,
                photoDataUrl: photoDataUrl, contact: contact, createdAt: createdAt
            }
        });
    });
});

app.get("/", function(req, res) {
    res.sendFile(path.join(rootDir, "index.html"));
});

setupDB()
    .then(function() {
        app.listen(PORT, function() {
            console.log("Server running at http://localhost:" + PORT);
            console.log("DB path: " + dbPath);
        });
    })
    .catch(function(err) {
        console.log("could not start server:", err);
        process.exit(1);
    });
