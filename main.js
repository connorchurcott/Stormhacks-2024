import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

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

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});