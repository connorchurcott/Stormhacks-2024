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
                Page(perPage: 4) {
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


app.get('/globalrank', async (req, res) => {
    try {
        const graphqlQuery = `
            query {
                Page(perPage: 15) {
                    media(type: MANGA, sort: SCORE_DESC) {
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

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(data); // Inspect the data received from the API

        const popularManga = data.data.Page.media || []; // Fallback to empty array if undefined

        res.render('globalrank.ejs', { popularManga }); // Pass the popular manga to the view
    } catch (error) {
        console.error('Error fetching best rated manga:', error);
        res.render('globalrank.ejs', { popularManga: [] }); // Pass an empty array on error
    }
});

app.get("/newest", async (req, res) => {
    try {
        const graphqlQuery = `
            query {
                Page(perPage: 16) {
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

// Middleware to set EJS as the view engine
app.set('view engine', 'ejs');

// POST route to handle the manga ID submission
app.post('/mangaEntry', async (req, res) => {
    const mangaId = req.body.mangaId; // Get the manga ID from the POST request

    if (!mangaId) {
        return res.status(400).send("No manga ID provided"); // Send a response if no ID is provided
    }

    req.session.mangaId = mangaId; // Store the manga ID in session
    res.redirect(`/mangaEntry/${mangaId}`); // Redirect to the GET mangaEntry route with the manga ID
});

// GET route to display manga details
app.get('/mangaEntry/:id', async (req, res) => {
    const mangaId = req.params.id; // Get manga ID from the URL parameter

    try {
        const graphqlQuery = `
            query ($id: Int) {
                Media(id: $id, type: MANGA) {
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
        `;

        const variables = { id: parseInt(mangaId) };

        const response = await fetch('https://graphql.anilist.co/', {
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

        if (!data.data || !data.data.Media) {
            throw new Error('No media found');
        }

        const manga = data.data.Media;

        // Render the manga entry page with the specific manga details
        res.render('mangaEntry.ejs', { manga });
    } catch (error) {
        console.error('Error fetching manga details:', error);
        res.render('mangaEntry.ejs', { manga: null, error: 'Could not fetch manga details' });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});