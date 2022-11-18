import getRethinkDB from "../../config/db.js";
import r from "rethinkdb";
import ioEmmit from "../../../app.js";
import { getRandomInt } from "../../helpers/helper_functions.js";

import usersService from "../users/services.js";
import membersService from "../member/services.js";
import mesageService from "../messages/services.js";
import sendMessageRabbit from "../../rabbitmq/send.js";
import { formatLocalDate } from "../../utils/fomat_local_date.js";

const service = {};

service.channel = async (body) => {
  const conn = await getRethinkDB();

  const id_channel = body.id + "" + body.id_service_line;
  var id_user = body.id_user;

  return new Promise((resolve, reject) => {
    r.table("channels")
      .filter({ id_channel: id_channel })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);

          if (result.length > 0) {
            if (id_user) {
              service
                .reassign(id_channel, id_user, "user asign")
                .then((res) => {
                  resolve({
                    ...result[0],
                    id_user,
                  });
                });
            } else if (result[0].id_user != "bot") {
              usersService
                .getUsers({ id_user: result[0].id_user, status: "active" })
                .then((user) => {
                  if (user.data.length > 0) {
                    resolve(result[0]);
                  } else {
                    usersService
                      .getUsers({ status: "active", role_id: 39 })
                      .then((users) => {
                        if (users.data.length > 0) {
                          const randomUser = getRandomInt(
                            0,
                            users.data.length - 1
                          );
                          id_user = users.data[randomUser].id_user;
                          service
                            .reassign(id_channel, id_user, "back reasign")
                            .then((res) => {
                              resolve({
                                ...result[0],
                                id_user,
                              });
                            });
                        } else {
                          reject({
                            message: "No hay usuarios disponibles.",
                          });
                        }
                      });
                  }
                })
                .catch((err) => {
                  reject(err);
                });
            } else {
              resolve(result[0]);
            }
          } else {
            membersService
              .getMember(parseInt(body.id))
              .then((member) => {
                let channel = {
                  id_channel: id_channel,
                  id_member: member[0].id,
                  id_service_line: body.id_service_line,
                  id_user: id_user + "",
                  id_brand: body.id_brand ?? 1,
                };
                if (id_user) {
                  service
                    .createChannel(channel)
                    .then((result) => {
                      resolve(result);
                    })
                    .catch((err) => {
                      reject(err);
                    });
                } else {
                  // Bot
                  
                  channel.id_user = "bot";

                  service
                    .createChannel(channel)
                    .then((result) => {
                      resolve(result);
                      service.addReasignHistory({
                        id_channel: result["id_channel"],
                        last_id_user: "",
                        new_id_user: channel.id_user,
                        type: "first reasign",
                      });
                    })
                    .catch((err) => {
                      reject(err);
                    });

                  // usersService
                  //   .getUsers({ status: "active", role_id: 39 })
                  //   .then((users) => {
                  //     if (users.data.length > 0) {
                  //       const randomUser = getRandomInt(
                  //         0,
                  //         users.data.length - 1
                  //       );
                  //       channel.id_user = users.data[randomUser].id_user;

                  //       service
                  //         .createChannel(channel)
                  //         .then((result) => {
                  //           resolve(result);
                  //           service.addReasignHistory({
                  //             id_channel: result["id_channel"],
                  //             last_id_user: "",
                  //             new_id_user: channel.id_user,
                  //             type: "first reasign",
                  //           });
                  //         })
                  //         .catch((err) => {
                  //           reject(err);
                  //         });
                  //     } else {
                  //       reject({
                  //         message: "No hay usuarios disponibles.",
                  //       });
                  //     }
                  //   })
                  //   .catch((err) => {
                  //     reject(err);
                  //   });
                }
              })
              .catch((err) => {
                reject(err);
              });
          }
        });
      });
  });
};

service.createChannel = async (channel) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    channel.create_at = formatLocalDate();

    r.table("channels")
      .insert(channel)
      .run(conn, (err, res) => {
        if (err) reject(err);
        console.log("new channel to user" + channel.id_user);
        ioEmmit({
          key: "new_channels",
          data: {
            id_user: channel.id_user,
            id_channel: channel.id_channel,
          },
        });
        channel.id_rethink = res.generated_keys[0];
        sendMessageRabbit({
          msg: channel,
          flag: "insert_channel",
        });
        resolve({
          id_channel: channel.id_channel,
        });
      });
  });
};

service.channelById = async (id_channel) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("channels")
      .filter({ id_channel: id_channel })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
  });
};

service.reassign = async (id_channel, id_user, type) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    service
      .channelById(id_channel)
      .then((channel) => {
        if (channel.length > 0) {
          r.table("channels")
            .filter({ id_channel: id_channel })
            .update({ id_user: id_user.toString() })
            .run(conn, (err, res) => {
              if (err) reject(err);

              sendMessageRabbit({
                msg: {
                  id_channel: id_channel,
                  id_user: id_user,
                },
                flag: "update_channel_user",
              });

              service.addReasignHistory({
                id_channel,
                last_id_user: channel[0].id_user,
                new_id_user: id_user,
                type: type,
              });
              ioEmmit({
                key: "new_channels",
                data: { id_user: id_user, id_channel: id_channel },
              });
              resolve({
                status: "success",
                message: "Channel reassigned successfully",
              });
            });
        } else {
          reject("channel not found");
        }
      })
      .catch((err) => {
        reject("channel not found");
      });
  });
};

service.addReasignHistory = async ({
  id_channel,
  last_id_user,
  new_id_user,
  type,
}) => {
  const conn = await getRethinkDB();
  var create_at = formatLocalDate();

  const reasign = {
    last_id_user,
    new_id_user,
    id_channel,
    type,
    create_at,
  };

  r.table("reasign_history")
    .insert(reasign)
    .run(conn, (err, result) => {
      if (err) console.log(err);
      else {
        reasign.id_rethink = result.generated_keys[0];
        sendMessageRabbit({
          msg: reasign,
          flag: "insert_reassign",
        });

        console.log("save reasign history");
      }
    });
};

service.reasignHistory = async (filter) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("reasign_history")
      .filter(filter)
      .orderBy(r.desc("create_at"))
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        else
          cursor.toArray((err, result) => {
            if (err) reject(err);
            else if (result.length > 0) {
              resolve(result);
            } else {
              resolve({
                message: "Channel not found",
              });
            }
          });
      });
  });
};

service.byUser = async (id_user) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("channels")
      .eqJoin(r.row("id_member"), r.table("members"))
      .without({ right: "id" })
      .zip()
      .filter({ id_user: id_user + "" })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);
          resolve({
            data: result,
          });
        });
      });
  });
};

service.channels = async ({ desc }) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    if (desc) {
      r.table("channels")
        .orderBy(r.desc("create_at"))
        .run(conn, (err, cursor) => {
          if (err) reject(err);
          cursor.toArray((err, result) => {
            if (err) reject(err);
            resolve({ data: result });
          });
        });
    } else {
      r.table("channels").run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);
          resolve({ data: result });
        });
      });
    }
  });
};

service.countChannels = async () => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("channels")
      .count()
      .run(conn, (err, result) => {
        if (err) reject(err);
        resolve({ data: result });
      });
  });
};

service.update = async () => {
  return new Promise((resolve, reject) => {
    service
      .channels({ desc: true })
      .then(async (result) => {
        var data = [];
        var users = {};
        for (const channel of result["data"]) {
          await mesageService
            .getByChannel(channel.id_channel)
            .then((result) => {
              if (result["data"].length != 0) {
                const val = result["data"].find((e) => e.author_type == "user");

                if (!val) {
                  usersService
                    .getUsers({ id_user: channel.id_user })
                    .then((user) => {
                      if (users[user[0].first_name]) {
                        users[user[0].first_name]++;
                      } else {
                        users[user[0].first_name] = 1;
                      }

                      data.push({
                        id_channel: channel.id_channel,
                        user: user[0],
                        messages: result["data"],
                      });
                    })
                    .catch((err) => {
                      reject(err);
                    });
                }
              }
            })
            .catch((err) => {
              reject(err);
            });
        }

        resolve({ data, length: data.length, users: users });
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export default service;
