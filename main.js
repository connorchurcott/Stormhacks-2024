import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import session from "express-session";
import fetch from "node-fetch";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "sh24_demo_user",
    host: "dpg-cs0pqhbtq21c73ehun2g-a.oregon-postgres.render.com",
    database: "sh24_demo",
    password: "FwFylqXOkt6pB0saR7ARiwpLO2xdlrrF",
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    },
});
db.connect();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true
}));

// Middleware to set user status
app.use((req, res, next) => {
    res.locals.userStatus = req.session.userStatus || false; // Set userStatus for EJS templates
    next();
});
// Routes
app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/globalrank", (req, res) => {
    res.render("globalrank.ejs", { userStatus: req.session.userStatus });
});

app.get("/newest", (req, res) => {
    res.render("newest.ejs");
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/searchResults", (req, res) => {
    res.render("searchResults.ejs");
});

app.get("/logout", (req, res) => {
    req.session.userStatus = false;
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            return res.redirect("/");
        }
        res.redirect("/");
    });
});

app.get("/forum", (req, res) => {
    res.render("forum.ejs");
});

app.post("/signup", async (req, res) => {
    const { email, password, username } = req.body;

    try {
        const checkResultEmail = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const checkResultUser = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (checkResultEmail.rows.length > 0) {
            res.send("Email already exists. Try logging in.");
        } else if (checkResultUser.rows.length > 0) {
            res.send("Username already exists. Try logging in.");
        } else {
            await db.query(
                "INSERT INTO users (email, username, password) VALUES ($1, $2, $3)",
                [email, username, password]
            );
            req.session.userStatus = true;
            res.redirect("/");
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            if (password === user.password) {
                req.session.userStatus = true;
                res.redirect("/");
            } else {
                res.send("Incorrect Password");
            }
        } else {
            res.send("User not found");
        }
    } catch (err) {
        console.log(err);
    }
});

app.post('/search', async (req, res) => {
    const title = req.body.searchQuery;

    const graphqlQuery = `
        query ($title: String) {
            Page {
                media(search: $title, type: MANGA) {
                    id
                    title {
                        romaji
                        english
                    }
                    description
                    coverImage {
                        large
                    }
                    chapters
                    volumes
                    startDate {
                        year
                        month
                        day
                    }
                    genres
                    status
                }
            }
        }
    `;

    const variables = { title };

    try {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery, variables }),
        });

        const data = await response.json();
        const mangaList = data.data.Page.media; // Get all matching media

        // Render the search results page with the manga list
        res.render('searchResults.ejs', { mangaList, searchQuery: title, error: null });
    } catch (error) {
        console.error('Error fetching manga info:', error);
        res.render('searchResults.ejs', { mangaList: [], searchQuery: title, error: 'Could not fetch manga information' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});