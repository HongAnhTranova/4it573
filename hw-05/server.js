var express = require("express");
var path = require("path");

var app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

var nextId = 1;
var todos = [
  { id: nextId++, title: "Koupit mleko", done: false },
  { id: nextId++, title: "Napsat ukol", done: true },
];

function findTodo(id) {
  return todos.find(function (t) {
    return t.id === Number(id);
  });
}

app.get("/", function (req, res) {
  res.render("index", { todos: todos });
});

app.post("/add", function (req, res) {
  var title = (req.body.title || "").trim();
  if (title) {
    todos.push({ id: nextId++, title: title, done: false });
  }
  res.redirect("/");
});

app.get("/todo/:id", function (req, res) {
  var todo = findTodo(req.params.id);
  if (!todo) {
    res.status(404).send("Todo nenalezeno");
    return;
  }
  res.render("detail", { todo: todo });
});

app.post("/todo/:id/toggle", function (req, res) {
  var todo = findTodo(req.params.id);
  if (todo) todo.done = !todo.done;
  res.redirect("/todo/" + req.params.id);
});

app.post("/todo/:id/delete", function (req, res) {
  todos = todos.filter(function (t) {
    return t.id !== Number(req.params.id);
  });
  res.redirect("/");
});

app.post("/todo/:id/edit", function (req, res) {
  var todo = findTodo(req.params.id);
  var title = (req.body.title || "").trim();
  if (todo && title) todo.title = title;
  res.redirect("/todo/" + req.params.id);
});

app.listen(3000, function () {
  console.log("Server bezi na http://localhost:3000");
});
