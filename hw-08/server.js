var express = require("express");
var path = require("path");
var knexConfig = require("./knexfile");
var express_ws = require("express-ws");

var ALLOWED_PRIORITIES = ["low", "normal", "high"];

function createApp(knexInstance) {
  var knex = knexInstance || require("knex")(knexConfig);
  var app = express();

  express_ws(app);
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.urlencoded({ extended: true }));

  var listClients = new Set();
  var detailClients = new Map();

  async function sendTodoList() {
    var todos = await knex("todos").select("*").orderBy("id");
    var data = JSON.stringify(todos);
    for (var ws of listClients) {
      if (ws.readyState === 1) {
        ws.send(data);
      }
    }
  }

  async function sendTodoDetail(id) {
    var todo = await knex("todos").where({ id: id }).first();
    var data = JSON.stringify(todo);
    if (detailClients.has(id)) {
      for (var ws of detailClients.get(id)) {
        if (ws.readyState === 1) {
          ws.send(data);
        }
      }
    }
  }

  const alertDeletedDetail = (id) => {
    var data = JSON.stringify({ deleted: true });
    if (detailClients.has(id)) {
      for (var ws of detailClients.get(id)) {
        if (ws.readyState === 1) {
          ws.send(data);
        }
      }
    }
  }

  app.ws("/ws/todos", function (ws, req) {
    listClients.add(ws);
    ws.on("close", function () {
      listClients.delete(ws);
    });
  });

  app.ws("/ws/todo/:id", function (ws, req) {
    var id = req.params.id;
    if (!detailClients.has(id)) {
      detailClients.set(id, new Set());
    }
    detailClients.get(id).add(ws);
    ws.on("close", function () {
      detailClients.get(id).delete(ws);
    });
  });

  app.get("/", async function (req, res) {
    var todos = await knex("todos").select("*").orderBy("id");
    res.render("index", { todos: todos });
  });

  app.post("/add", async function (req, res) {
    var title = (req.body.title || "").trim();
    if (title) {
      await knex("todos").insert({ title: title, done: false, priority: "normal" });
    }
    await sendTodoList();
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
    await sendTodoDetail(req.params.id);
    await sendTodoList();
    res.redirect("/todo/" + req.params.id);
  });

  app.post("/todo/:id/delete", async function (req, res) {
    alertDeletedDetail(req.params.id);

    await knex("todos").where({ id: req.params.id }).del();
    await sendTodoList();

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
    await sendTodoDetail(req.params.id);
    await sendTodoList();
    res.redirect("/todo/" + req.params.id);
  });

  app.knex = knex;
  return app;
}

var PORT = process.env.PORT || 3000;

if (require.main === module) {
  var app = createApp();
  app.listen(PORT, function () {
    console.log("Server bezi na http://localhost:" + PORT);
  });
}

module.exports = createApp;
