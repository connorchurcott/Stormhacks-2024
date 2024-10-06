import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "sh24_demo_user",
    host: "dpg-cs0pqhbtq21c73ehun2g-a.oregon-postgres.render.com",
    database: "sh24_demo",
    password: "FwFylqXOkt6pB0saR7ARiwpLO2xdlrrF",
    port: 5432,
    ssl: {
        rejectUnauthorized: false  // Use true if you have the proper certificates
    },
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.render("home.ejs");
})

app.get("/globalrank", (req, res) => {
    res.render("globalrank.ejs");
});

app.get("/newest", (req, res) => {
    res.render("newest.ejs");
});

app.get("/forum", (req, res) => {
    res.render("forum.ejs");
});

app.post("/signup", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    const username = req.body.username
    let userStatus = false;

    try {
        const checkResultEmail = await db.query("SELECT * FROM users WHERE email = $1", [email, ]);
        const checkResultUser = await db.query("SELECT * FROM users WHERE email = $1", [username, ]);
        if (checkResultEmail.rows.length > 0) {
          res.send("Email already exists. Try logging in.");
        } else if (checkResultUser.rows.length > 0) {
            res.send("Username already exists. Try logging in.");
        } else {
        const result = await db.query(
          "INSERT INTO users (email, username password) VALUES ($1, $2, $3)",
          [email, username, password]
          );
          userStatus = true;
          console.log(result);
          res.render("home.ejs");
         } 
        } catch (err) {
          console.log(err);
        } 
});

app.post("/login", async (req, res) => {
    const password = req.body.password;
    const username = req.body.username;
    let userStatus = false;
  try {
    const result = await db.query("SELECT * FROM users WHERE username = $1", [username, ]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedPassword = user.password;

      if (password === storedPassword) {
        userStatus = true;
        res.render("home.ejs");
        console.log(result);
      } else {
        res.send("Incorrect Password");
      };
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