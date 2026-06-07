var test = require("ava");
var request = require("supertest");
var knexLib = require("knex");

var createApp;
var knex;
var app;

test.before(async function () {
  createApp = require("./server");

  knex = knexLib({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

  await knex.schema.createTable("todos", function (table) {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.boolean("done").notNullable().defaultTo(false);
    table.enu("priority", ["low", "normal", "high"]).notNullable().defaultTo("normal");
  });

  app = createApp(knex);
});

test.after.always(async function () {
  await knex.destroy();
});

test.serial("GET / returns 200 and renders the index page", async function (t) {
  var res = await request(app).get("/");
  t.is(res.status, 200);
  t.true(res.text.includes("</html>"));
});

test.serial("POST /add creates a new todo and redirects", async function (t) {
  var res = await request(app).post("/add").send("title=Test+Todo");
  t.is(res.status, 302);
  t.is(res.headers.location, "/");

  var todos = await knex("todos").select("*");
  t.is(todos.length, 1);
  t.is(todos[0].title, "Test Todo");
  t.is(todos[0].done, 0);
  t.is(todos[0].priority, "normal");
});

test.serial("POST /add with empty title does not create a todo", async function (t) {
  var countBefore = (await knex("todos").count("* as c").first()).c;
  await request(app).post("/add").send("title=");
  var countAfter = (await knex("todos").count("* as c").first()).c;
  t.is(countBefore, countAfter);
});

test.serial("GET /todo/:id returns 200 for existing todo", async function (t) {
  var todo = await knex("todos").where({ title: "Test Todo" }).first();
  var res = await request(app).get("/todo/" + todo.id);
  t.is(res.status, 200);
  t.true(res.text.includes("Test Todo"));
});

test.serial("GET /todo/:id returns 404 for non-existent todo", async function (t) {
  var res = await request(app).get("/todo/99999");
  t.is(res.status, 404);
});

test.serial("POST /todo/:id/toggle toggles done status", async function (t) {
  var todo = await knex("todos").where({ title: "Test Todo" }).first();
  t.is(todo.done, 0);

  var res = await request(app).post("/todo/" + todo.id + "/toggle");
  t.is(res.status, 302);

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.done, 1);
});

test.serial("POST /todo/:id/toggle toggles done back to false", async function (t) {
  var todo = await knex("todos").where({ title: "Test Todo" }).first();
  t.is(todo.done, 1);

  await request(app).post("/todo/" + todo.id + "/toggle");

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.done, 0);
});

test.serial("POST /todo/:id/edit updates title", async function (t) {
  var todo = await knex("todos").where({ title: "Test Todo" }).first();
  var res = await request(app).post("/todo/" + todo.id + "/edit").send("title=Updated+Todo");
  t.is(res.status, 302);

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.title, "Updated Todo");
});

test.serial("POST /todo/:id/edit updates priority", async function (t) {
  var todo = await knex("todos").first();
  await request(app).post("/todo/" + todo.id + "/edit").send("priority=high");

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.priority, "high");
});

test.serial("POST /todo/:id/edit rejects invalid priority", async function (t) {
  var todo = await knex("todos").first();
  await request(app).post("/todo/" + todo.id + "/edit").send("priority=critical");

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.priority, "high"); // unchanged from previous test
});

test.serial("POST /todo/:id/delete removes the todo and redirects", async function (t) {
  var todo = await knex("todos").first();
  var res = await request(app).post("/todo/" + todo.id + "/delete");
  t.is(res.status, 302);
  t.is(res.headers.location, "/");

  var deleted = await knex("todos").where({ id: todo.id }).first();
  t.is(deleted, undefined);
});

test.serial("GET / shows empty list after all todos deleted", async function (t) {
  var res = await request(app).get("/");
  t.is(res.status, 200);
  var todos = await knex("todos").select("*");
  t.is(todos.length, 0);
});
