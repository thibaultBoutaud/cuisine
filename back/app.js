const cors = require("cors");
require ("dotenv").config();
const express = require("express");
const app = express();
const route_auth = require("./routes/route_auth");
const route_recipe = require("./routes/route_recipe");
const route_favorite = require("./routes/route_favorite");
const route_message = require("./routes/route_message");
const route_alert = require("./routes/route_alert");
const path = require("path");
const cookieParser = require("cookie-parser");


app.use(cookieParser());
app.use(express.json());


app.use(cors({
    origin: `http://127.0.0.1:3000`, // Assure-toi que l'origin du frontend est correctement spécifié
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
    credentials: true,  // Permet l'envoi des cookies  
}));

app.use("/api/auth", route_auth);
app.use("/api/recipe", route_recipe);
app.use("/api/favorites", route_favorite);
app.use("/api/messages", route_message);
app.use("/api/alerts", route_alert);
app.use("/api/images/avatars", express.static(path.join(__dirname, "uploads/pictures/avatars"))); // nom de la route url  + chemin du dossier
app.use("/api/images/recipes", express.static(path.join(__dirname, "uploads/pictures/recipes")));

module.exports = app;