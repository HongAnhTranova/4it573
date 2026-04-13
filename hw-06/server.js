var express = require("express");
var path = require("path");
var knex = require("knex")(require("./knexfile"));

var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

var ALLOWED_PRIORITIES = ["low", "normal", "high"];

app.get("/", async function (req, res) {
  var todos = await knex("todos").select("*").orderBy("id");
  res.render("index", { todos: todos });
});

app.post("/add", async function (req, res) {
  var title = (req.body.title || "").trim();
  if (title) {
    await knex("todos").insert({ title: title, done: false, priority: "normal" });
  }
  res.redirect("/");
});

app.get("/todo/:id", async function (req, res) {
  var todo = await knex("todos").where({ id: req.params.id }).first();
  if (!todo) {
    res.status(404).send("Todo nenalezeno");
    return;
  }
  res.render("detail", { todo: todo, priorities: ALLOWED_PRIORITIES });
});

app.post("/todo/:id/toggle", async function (req, res) {
  var todo = await knex("todos").where({ id: req.params.id }).first();
  if (todo) {
    await knex("todos").where({ id: req.params.id }).update({ done: !todo.done });
  }
  res.redirect("/todo/" + req.params.id);
});

app.post("/todo/:id/delete", async function (req, res) {
  await knex("todos").where({ id: req.params.id }).del();
  res.redirect("/");
});

app.post("/todo/:id/edit", async function (req, res) {
  var title = (req.body.title || "").trim();
  var priority = req.body.priority;

  var update = {};
  if (title) update.title = title;
  if (ALLOWED_PRIORITIES.indexOf(priority) !== -1) update.priority = priority;

  if (Object.keys(update).length > 0) {
    await knex("todos").where({ id: req.params.id }).update(update);
  }
  res.redirect("/todo/" + req.params.id);
});

app.listen(3000, function () {
  console.log("Server bezi na http://localhost:3000");
});
