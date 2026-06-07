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
    table.integer("user_id").unsigned().nullable();
  });

  await knex.schema.createTable("users", function (table) {
    table.increments("id").primary();
    table.string("username").notNullable().unique();
    table.string("password").notNullable();
  });

  app = createApp(knex);
});

test.after.always(async function () {
  await knex.destroy();
});

// Helper to extract session cookie from response
function getCookie(res) {
  var setCookie = res.headers["set-cookie"];
  if (!setCookie) return "";
  return setCookie[0].split(";")[0];
}

// --- Anonymous todo tests ---

test.serial("GET / returns 200 for anonymous user", async function (t) {
  var res = await request(app).get("/");
  t.is(res.status, 200);
  t.true(res.text.includes("Prihlasit"));
});

test.serial("POST /add creates anonymous todo (no user_id)", async function (t) {
  var res = await request(app).post("/add").send("title=Anonymous+Todo");
  t.is(res.status, 302);

  var todo = await knex("todos").where({ title: "Anonymous Todo" }).first();
  t.truthy(todo);
  t.is(todo.user_id, null);
});

test.serial("GET /todo/:id works for anonymous todo when not logged in", async function (t) {
  var todo = await knex("todos").where({ title: "Anonymous Todo" }).first();
  var res = await request(app).get("/todo/" + todo.id);
  t.is(res.status, 200);
  t.true(res.text.includes("Anonymous Todo"));
});

// --- Auth tests ---

test.serial("GET /register returns 200", async function (t) {
  var res = await request(app).get("/register");
  t.is(res.status, 200);
  t.true(res.text.includes("Registrace"));
});

test.serial("POST /register creates user and redirects", async function (t) {
  var res = await request(app)
    .post("/register")
    .send("username=testuser&password=testpass");
  t.is(res.status, 302);
  t.is(res.headers.location, "/");

  var user = await knex("users").where({ username: "testuser" }).first();
  t.truthy(user);
});

test.serial("POST /register rejects duplicate username", async function (t) {
  var res = await request(app)
    .post("/register")
    .send("username=testuser&password=otherpass");
  t.is(res.status, 200);
  t.true(res.text.includes("Uzivatel jiz existuje"));
});

test.serial("POST /register rejects empty fields", async function (t) {
  var res = await request(app)
    .post("/register")
    .send("username=&password=");
  t.is(res.status, 200);
  t.true(res.text.includes("Vyplnte"));
});

test.serial("GET /login returns 200", async function (t) {
  var res = await request(app).get("/login");
  t.is(res.status, 200);
  t.true(res.text.includes("Prihlaseni"));
});

test.serial("POST /login with wrong password shows error", async function (t) {
  var res = await request(app)
    .post("/login")
    .send("username=testuser&password=wrong");
  t.is(res.status, 200);
  t.true(res.text.includes("Spatne"));
});

test.serial("POST /login with correct credentials redirects", async function (t) {
  var res = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  t.is(res.status, 302);
  t.is(res.headers.location, "/");
});

// --- Logged-in user todo tests ---

test.serial("logged-in user can create and see their todo", async function (t) {
  // Login
  var loginRes = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  var cookie = getCookie(loginRes);

  // Create todo
  var addRes = await request(app)
    .post("/add")
    .set("Cookie", cookie)
    .send("title=User+Todo");
  t.is(addRes.status, 302);

  // Verify todo has user_id
  var todo = await knex("todos").where({ title: "User Todo" }).first();
  t.truthy(todo);
  t.truthy(todo.user_id);

  // User can see their todo on index
  var indexRes = await request(app)
    .get("/")
    .set("Cookie", cookie);
  t.is(indexRes.status, 200);
  t.true(indexRes.text.includes("User Todo"));
  t.false(indexRes.text.includes("Anonymous Todo"));
});

test.serial("anonymous user cannot see logged-in user's todo", async function (t) {
  var res = await request(app).get("/");
  t.is(res.status, 200);
  t.false(res.text.includes("User Todo"));
  t.true(res.text.includes("Anonymous Todo"));
});

test.serial("anonymous user gets 403 on another user's todo detail", async function (t) {
  var todo = await knex("todos").where({ title: "User Todo" }).first();
  var res = await request(app).get("/todo/" + todo.id);
  t.is(res.status, 403);
});

test.serial("logged-in user can toggle their own todo", async function (t) {
  var loginRes = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  var cookie = getCookie(loginRes);

  var todo = await knex("todos").where({ title: "User Todo" }).first();
  var res = await request(app)
    .post("/todo/" + todo.id + "/toggle")
    .set("Cookie", cookie);
  t.is(res.status, 302);

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.done, 1);
});

test.serial("logged-in user can edit their own todo", async function (t) {
  var loginRes = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  var cookie = getCookie(loginRes);

  var todo = await knex("todos").where({ title: "User Todo" }).first();
  var res = await request(app)
    .post("/todo/" + todo.id + "/edit")
    .set("Cookie", cookie)
    .send("title=Edited+Todo&priority=high");
  t.is(res.status, 302);

  var updated = await knex("todos").where({ id: todo.id }).first();
  t.is(updated.title, "Edited Todo");
  t.is(updated.priority, "high");
});

test.serial("anonymous user cannot toggle another user's todo", async function (t) {
  var todo = await knex("todos").where({ title: "Edited Todo" }).first();
  var res = await request(app).post("/todo/" + todo.id + "/toggle");
  t.is(res.status, 403);
});

test.serial("anonymous user cannot delete another user's todo", async function (t) {
  var todo = await knex("todos").where({ title: "Edited Todo" }).first();
  var res = await request(app).post("/todo/" + todo.id + "/delete");
  t.is(res.status, 403);

  // Verify not deleted
  var still = await knex("todos").where({ id: todo.id }).first();
  t.truthy(still);
});

test.serial("logged-in user can delete their own todo", async function (t) {
  var loginRes = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  var cookie = getCookie(loginRes);

  var todo = await knex("todos").where({ title: "Edited Todo" }).first();
  var res = await request(app)
    .post("/todo/" + todo.id + "/delete")
    .set("Cookie", cookie);
  t.is(res.status, 302);

  var deleted = await knex("todos").where({ id: todo.id }).first();
  t.is(deleted, undefined);
});

test.serial("POST /logout destroys session and redirects", async function (t) {
  var loginRes = await request(app)
    .post("/login")
    .send("username=testuser&password=testpass");
  var cookie = getCookie(loginRes);

  var logoutRes = await request(app)
    .post("/logout")
    .set("Cookie", cookie);
  t.is(logoutRes.status, 302);
  t.is(logoutRes.headers.location, "/");
});
