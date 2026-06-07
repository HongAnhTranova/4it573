exports.up = async function (knex) {
  await knex.schema.createTable("users", function (table) {
    table.increments("id").primary();
    table.string("username").notNullable().unique();
    table.string("password").notNullable();
  });

  await knex.schema.alterTable("todos", function (table) {
    table.integer("user_id").unsigned().nullable().references("id").inTable("users");
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable("todos", function (table) {
    table.dropColumn("user_id");
  });
  await knex.schema.dropTable("users");
};
