// SQLite does not support real ENUMs, so we store as a string
// and constrain the allowed values in application code.
exports.up = function (knex) {
  return knex.schema.alterTable("todos", function (table) {
    table
      .enu("priority", ["low", "normal", "high"])
      .notNullable()
      .defaultTo("normal");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("todos", function (table) {
    table.dropColumn("priority");
  });
};
