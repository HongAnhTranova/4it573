exports.up = function (knex) {
  return knex.schema.createTable("todos", function (table) {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.boolean("done").notNullable().defaultTo(false);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("todos");
};
