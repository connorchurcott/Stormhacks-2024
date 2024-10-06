import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

// Assuming express-session is installed and set up
import session from "express-session";

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

app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/globalrank", (req, res) => {
    res.render("globalrank.ejs", { userStatus: req.session.userStatus }); // Pass userStatus to the view
});


app.get("/newest", (req, res) => {
    res.render("newest.ejs");
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs"); // Render the signup page
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});

app.get("/userProfiles", (req, res) => {
    res.render("userProfiles.ejs");
});

app.get("/logout", (req, res) => {
    req.session.userStatus = false; // Set userStatus to false first
    req.session.destroy(err => {
        if (err) {
            console.log(err);
            return res.redirect("/"); // Redirect on error
        }
        res.redirect("/"); // Redirect to home after logging out
    });
});


app.get("/forum", (req, res) => {
    res.render("forum.ejs");
});

app.post("/signup", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const username = req.body.username;

    try {
        const checkResultEmail = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        const checkResultUser = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (checkResultEmail.rows.length > 0) {
            res.send("Email already exists. Try logging in.");
        } else if (checkResultUser.rows.length > 0) {
            res.send("Username already exists. Try logging in.");
        } else {
            const result = await db.query(
                "INSERT INTO users (email, username, password) VALUES ($1, $2, $3)",
                [email, username, password]
            );
            req.session.userStatus = true; // Set session userStatus to true
            res.redirect("/"); // Redirect to home after signup
        }
    } catch (err) {
        console.log(err);
    }
});

app.post("/login", async (req, res) => {
    const password = req.body.password;
    const username = req.body.username;

    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedPassword = user.password;

            if (password === storedPassword) {
                req.session.userStatus = true; // Set session userStatus to true
                res.redirect("/"); // Redirect to home after login
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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});