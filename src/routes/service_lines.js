import express from "express";
import rethinkdb from "rethinkdb";
import getRethinkDB from "../config/db.js";

const serviceLines = express.Router();

serviceLines.use((err, req, res, next) => {
  if (err) res.json({ error: err, status: 500 });
  if (req.body) next("router");
  res.sendStatus(204);
});

serviceLines.get("/", async (_, res) => {
  try {
    const conn = await getRethinkDB();
    rethinkdb.table("service_lines").run(conn, (err, cursor) => {
      if (err) throw err;
      cursor.toArray((err, result) => {
        if (err) throw err;
        res.json({
          data: result,
        });
      });
    });
  } catch (e) {
    res.json({ error: e, status: 500 });
  }
});

serviceLines.post("/", async (req, response) => {
  try {
    const conn = await getRethinkDB();
    const serviceLine = req.body;
    rethinkdb
      .table("service_lines")
      .insert(serviceLine)
      .run(conn, function (err) {
        if (err) throw err;
        response.sendStatus(200);
      });
  } catch (e) {
    res.json({ error: e, status: 500 });
  }
});

export default serviceLines;
