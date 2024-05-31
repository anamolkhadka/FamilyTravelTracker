import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "realMadrid137$",
  port: "5432",

});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// Default user selection.
let currentUserId = 1;

let users = [];

// This function gets all the users from the database.
async function getUsers() {
  const result = await db.query("SELECT * FROM users");
  return result.rows;

};

// This function gets the user information from the database based on the current user ID.
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users Where id = $1", [currentUserId]);
  //console.log(result);

  return result.rows[0];

};

// This function gets the visited countries information for the current user.
async function getCountries() {
  const result = await db.query("SELECT country_code FROM visited_countries where user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
};

app.get("/", async (req, res) => {
  const countries = await getCountries();
  const currentUser = await getCurrentUser();
  users = await getUsers();
  console.log("Users: ", users);
  console.log("Current user: ", currentUser);

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: currentUser.color,
  });

});

app.post("/add", async (req, res) => {
  const request = req.body.country;
  console.log(request);

  const countries = await getCountries();
  const currentUser = await getCurrentUser();
  users = await getUsers();

  // If user sends empty texts.
  if(!request){
    return res.status(404).render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Please enter a country name.",
    });
  }

  // If user enters some text.Try to check the name in the countries table and insert that code to the
  // visited table.
  try {
    // Checking the country code from the countries table.
    const result = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) = $1",[request.toLowerCase()]);
    console.log(result);
    console.log(result.rows);
    
    if (result.rows.length === 0) {
      return res.status(404).render("index.ejs", {
        countries: countries,
        total: countries.length,
        users: users,
        color: currentUser.color,
        error: "Country name does not exist, try again.",
      });
    }

    const code = result.rows[0].country_code;
    console.log(code);

    // Inserting the country to the visited table with the user id.
    await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)", [code, currentUser.id]);

    // Redirect to the home page with the GET method
    res.redirect("/");
    
  } catch (error) {
    console.error('Error inserting country:', error);
    res.status(500).render("index.ejs", {
      countries: countries,
      total: countries.length,
      users: users,
      color: currentUser.color,
      error: "Country has already been added, try again.",
    });
  
  }

});

// This endpoint handles the current user and returns back to the homepage. It handles tab form from index.ejs.
app.post("/user", async (req, res) => {
  const input = req.body;
  console.log(input);

  // Check if the user input is user_id or add new user.
  if ('user' in input) {
    currentUserId = input.user;
    res.redirect("/");
  // User selected add family memeber.
  } else {
    res.render("new.ejs");
  }

});

// This endpoint handles the new user request submission using the new.ejs template.
app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const result = req.body;
  console.log(result);
  const name = result.name;
  const color = result.color;

  try {
    // Insert the new user into the user table and return the id of the new user using returning keyword.
    const user_id = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING id",[name, color]);
    console.log("New user id: ", user_id.rows[0].id);
    // Set the new user as the current user and redirect to the home page.
    currentUserId = user_id.rows[0].id;
    res.redirect("/");
      
  } catch (error) {
    console.log(error);
    res.redirect("/");
  }

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
