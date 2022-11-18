import express from "express";
import r from "rethinkdb";
import getRethinkDB from "../config/db.js";
import ioEmmit from "../../app.js";
import connectMysql from "../config/mysql.js";
import sendMessageRabbit from "../rabbitmq/send.js";
import { getRandomInt, listTowerControl } from "../helpers/helper_functions.js";
import fetch from "node-fetch";

const channel = express.Router();

// middleware
channel.use((err, req, res, next) => {
  if (err) res.json({ error: err, status: 500 });
  if (req.body) next("router");
  res.sendStatus(204);
});

// get to send or insert the channel
channel.post("/", async (req, response) => {
  try {
    const conn = await getRethinkDB();
    let member = req.body;
    let idMember = member.id;
    let idServiceLine = member.id_service_line.toString();
    let idUserAsignet =
      member.id_user != null ? member.id_user.toString() : null;
    const channelId = idMember + "" + idServiceLine; // id of the channel (unique)
    r.table("channels")
      .filter({ id_channel: channelId })
      .run(conn, (err, cursor) => {
        if (err) response.sendStatus(500);
        if (cursor) {
          cursor.toArray((err, result) => {
            if (err) response.sendStatus(500);
            if (result.length === 0) {
              const time = new Date(); // creaate the time of the channel
              r.table("users")
                .filter({ status: "active", role_id: 39 })
                .run(conn, (err, cursor) => {
                  if (err) console.log(err);
                  cursor.toArray((err, result) => {
                    if (err) console.log(err);
                    if (result.length > 0) {
                      const randomUser = getRandomInt(0, result.length - 1);
                      const id_user = result[randomUser].id_user;
                      r.table("members")
                        .filter({ id_member: idMember })
                        .run(conn, (err, cursor) => {
                          if (err) console.log(err);
                          cursor.toArray((err, resultMember) => {
                            if (err) console.log(err);
                            let channel = {
                              id_channel: channelId,
                              create_at: time,
                              id_member:
                                resultMember.length > 0
                                  ? resultMember[0].id
                                  : idMember,
                              id_service_line: idServiceLine,
                              id_user: idUserAsignet ?? id_user,
                              flag: "insert_channel",
                            };
                            console.log(channel);
                            r.table("channels")
                              .insert(channel)
                              .run(conn, function (err, res) {
                                if (err) response.sendStatus(500);
                                channel.id = res.generated_keys[0];
                                console.log("new channel to user" + id_user);
                                ioEmmit({
                                  key: "new_channels",
                                  data: {
                                    id_user: id_user,
                                    id_channel: channel.id_channel,
                                  },
                                });
                                response.json({
                                  id_channel: channel.id_channel,
                                });
                              });
                          });
                        });
                    } else {
                      response.json({
                        status: 500,
                        message: "No hay usuarios disponibles.",
                      });
                    }
                  });
                });
            } else {
              r.table("users")
                .filter({
                  status: "active",
                  id_user: result[0].id_user,
                })
                .run(conn, (err, cursor) => {
                  if (err) console.log(err);
                  cursor.toArray((err, res) => {
                    if (err) console.log(err);
                    if (res.length > 0) {
                      response.json({
                        id_channel: result[0].id_channel,
                      });
                    } else {
                      r.table("users")
                        .filter({ status: "active", role_id: 39 })
                        .run(conn, (err, cursor) => {
                          if (err) console.log(err);
                          cursor.toArray((err, users) => {
                            if (err) console.log(err);
                            if (users.length > 0) {
                              const randomUser = getRandomInt(
                                0,
                                result.length - 1
                              );
                              const id_user = users[randomUser].id_user;

                              r.table("channels")
                                .filter({
                                  id_channel: result[0].id_channel,
                                })
                                .update({
                                  id_user: idUserAsignet ?? id_user,
                                })
                                .run(conn, (err, res) => {
                                  if (err) console.log(err);
                                  ioEmmit({
                                    key: "new_channels",
                                    data: {
                                      id_user: id_user,
                                      id_channel: result[0].id_channel,
                                    },
                                  });
                                  response.json({
                                    id_channel: result[0].id_channel,
                                  });
                                });
                            } else {
                              response.json({
                                status: 500,
                                message: "No hay usuarios disponibles.",
                              });
                            }
                          });
                        });
                    }
                  });
                });
            }
          });
        }
      });
  } catch (e) {
    console.log(e);
    response.json({
      error: e,
      status: 500,
    });
  }
});

channel.post("/reassign", async (req, response) => {
  const data = req.body;
  const conn = await getRethinkDB();
  r.table("channels")
    .filter({ id_channel: data.id_channel })
    .update({ id_user: data.id_user.toString() })
    .run(conn, (err, res) => {
      if (err) console.log(err);
      ioEmmit({
        key: "new_channels",
        data: { id_user: data.id_user, id_channel: data.id_channel },
      });
      response.json({
        status: "success",
        message: "Channel reassigned successfully",
      });
    });
});

// get channels by product
channel.get("/by-collab", async (req, response) => {
  const conn = await getRethinkDB();
  const idUser = req.query.id_user;
  r.table("channels")
    .eqJoin(r.row("id_member"), r.table("members"))
    .without({ right: "id" })
    .zip()
    .filter({ id_user: idUser })
    .run(conn, (err, cursor) => {
      if (err) console.log(err);
      cursor.toArray((err, result) => {
        if (err) console.log(err);
        response.json({
          data: result,
        });
      });
    });
});

// MySql Queries
export const addChannelsInMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connected");
    });
    console.log(data.id_member);
    const query = `INSERT INTO channels (id_rethink, create_at, id_channel, id_member, id_service_line, id_user) VALUES ("${data.id}", "${data.create_at}",  "${data.id_channel}", "${data.id_member}", "${data.id_service_line}", "${data.id_user}");`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Insert Channel in mysql: ", data.id);
    });
    conn.end();
  });
};

const updateChannelUserMySql = (data) => {
  connectMysql((conn) => {
    conn.connect((err) => {
      if (err) console.log(err);
      console.log("connected");
    });
    const query = `UPDATE channels SET id_user = "${data.id_user}" WHERE id_channel = "${data.id_channel}"`;
    conn.query(query, (err, result) => {
      if (err) console.log(err);
      console.log("Update Channel in mysql: ", data.id);
    });
    conn.end();
  });
};

export default channel;
