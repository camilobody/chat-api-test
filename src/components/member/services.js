import getRethinkDB from "../../config/db.js";
import r from "rethinkdb";

import notificationServices from "../notifications/services.js";
import sendMessageRabbit from "../../rabbitmq/send.js";

const service = {};

service.addMember = async (member) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    service
      .getMember(member.id)
      .then((result) => {
        const dataToken = {
          device: member.device  ?? null,
          type: "mobile",
          id_user: member.id_user ?? null,
          id_member: member.id ?? null,
          token: member.token  ?? null,
        };
        notificationServices.updateTokensByMembers({id_member: member.id, token: dataToken});
        if (result.length === 0) {
          let dataMember = {
            id_member: member.id,
            document_number: member.document_number,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name,
            mobile_phone: member.mobile_phone,
            photo: member.photo,
            id_brand: member.id_brand ?? 1,
          };
          r.table("members")
            .insert(dataMember)
            .run(conn, (err, result) => {
              if (err) reject(err);
              dataMember.id_rethink = result.generated_keys[0];

              sendMessageRabbit({
                msg: { ...dataMember, ...dataToken },
                flag: "insert_member",
              });

              resolve({
                message: "Member added successfully",
                status: "success",
              });
            });
        } else {
          resolve({
            message: "Current user exist!",
            status: "success",
          });
        }
      })
      .catch((err) => {
        reject(err);
      });
  });
};

service.getMember = async (id_member) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("members")
      .filter({
        id_member: id_member,
      })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
  });
};

service.getMemberByRethink = async (id) => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("members")
      .filter({
        id: id,
      })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, result) => {
          if (err) reject(err);
          resolve(result);
        });
      });
  });
};

service.countMember = async () => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("members")
      .count()
      .run(conn, (err, result) => {
        if (err) reject(err);
        resolve({ data: result });
      });
  });
};

service.members = async () => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("members").run(conn, (err, cursor) => {
      if (err) reject(err);
      cursor.toArray((err, result) => {
        if (err) reject(err);
        resolve({ data: result });
      });
    });
  });
};

service.filter = async () => {
  const conn = await getRethinkDB();

  return new Promise((resolve, reject) => {
    r.table("members")
      .filter(function (doc) {
        return doc("first_name").match("rafa");
      })
      .run(conn, (err, cursor) => {
        if (err) reject(err);
        cursor.toArray((err, mebers) => {
          if (err) reject(err);
          mebers.forEach((val) => {
            r.table("token_notification")
              .filter({ id_member: val.id_member })
              .run(conn, (err, cursor) => {
                if (err) reject(err);
                cursor.toArray((err, result) => {
                  if (err) reject(err);
                  console.log({ member: val, tokens: result });
                });
              });
          });
          resolve("ok");
        });
      });
  });
};

export default service;
