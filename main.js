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
app.get("/", async (req, res) => {
    try {
        const graphqlQuery = `
            query {
                Page(perPage: 5) {
                    media(sort: [START_DATE_DESC], type: MANGA) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                    }
                }
            }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery }),
        });

        const data = await response.json();
        const newestManga = data.data.Page.media; // Get the newest manga

        res.render("home.ejs", { newestManga }); // Pass the newest manga to the view
    } catch (error) {
        console.error('Error fetching newest manga:', error);
        res.render("home.ejs", { newestManga: [] }); // Pass an empty array on error
    }
});


app.get("/globalrank", (req, res) => {
    res.render("globalrank.ejs", { userStatus: req.session.userStatus });
});

app.get("/newest", async (req, res) => {
    try {
        const graphqlQuery = `
            query {
                Page(perPage: 10) {
                    media(sort: [START_DATE_DESC], type: MANGA) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        isAdult
                    }
                }
            }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery }),
        });

        const data = await response.json();
        let newestManga = data.data.Page.media;

        // Filter out NSFW content
        newestManga = newestManga.filter(manga => !manga.isAdult);

        // Render the view with the filtered data
        res.render("newest.ejs", { newestManga });
    } catch (error) {
        console.error('Error fetching newest manga:', error);
        res.render("newest.ejs", { newestManga: [] });
    }
});


app.get("/userProfiles", (req, res) => {
    res.render("userProfiles.ejs");
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

app.get("/mangaEntry", (req, res) => {
    res.render("mangaEntry.ejs");
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
                req.session.userId = user.id; // Store user ID in session
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


app.get("/settings", async (req, res) => {
    const userId = req.session.userId; // Get user ID from session

    try {
        // Fetch the user's current NSFW setting from the database
        const userResult = await db.query("SELECT viewnsfw FROM users WHERE id = $1", [userId]);
        const viewnsfw = userResult.rows[0]?.viewnsfw || false; // Default to false if not found

        res.render("settings.ejs", { userStatus: req.session.userStatus, viewnsfw }); // Pass the viewnsfw value to the view
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.render("settings.ejs", { userStatus: req.session.userStatus, viewnsfw: false }); // Fallback to false on error
    }
});


app.post('/search', async (req, res) => {
    const title = req.body.searchQuery;
    const userId = req.session.userId; // Assuming userId is in the session
    let userPref;

    try {
        // Fetch user preference for NSFW content
        const userResult = await db.query("SELECT viewNSFW FROM users WHERE id = $1", [userId]);
        userPref = userResult.rows[0]?.viewNSFW;

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
                        isAdult
                    }
                }
            }
        `;

        const variables = { title };

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery, variables }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.data || !data.data.Page || !data.data.Page.media) {
            throw new Error('No media found');
        }

        let mangaList = data.data.Page.media;

        // Filter out NSFW content if the user has not enabled it
        if (!userPref) {
            mangaList = mangaList.filter(manga => !manga.isAdult);
        }

        // Render the search results page with the manga list
        res.render('searchResults.ejs', { mangaList, searchQuery: title, error: null });
    } catch (error) {
        console.error('Error fetching manga info:', error);
        res.render('searchResults.ejs', { mangaList: [], searchQuery: title, error: 'Could not fetch manga information' });
    }
});


app.post("/update-settings", async (req, res) => {
    const nsfwContent = req.body.nsfwContent === 'on'; // Will be true if the checkbox is checked
    const userId = req.session.userId; // Ensure user ID is available in the session

    console.log('Updating settings for user ID:', userId); // Debugging log
    console.log('NSFW Content Setting:', nsfwContent); // Debugging log

    try {
        // Update the viewnsfw column in your database
        await db.query("UPDATE users SET viewnsfw = $1 WHERE id = $2", [nsfwContent, userId]);
        console.log('Settings updated successfully'); // Debugging log

        res.redirect("/settings"); // Redirect back to settings after saving
    } catch (err) {
        console.error('Error updating settings:', err); // Log the error
        res.redirect("/settings"); // Handle the error as needed
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});