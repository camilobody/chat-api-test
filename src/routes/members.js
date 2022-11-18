import express from "express";
import fetch from "node-fetch";
import r from "rethinkdb";
import getRethinkDB from "../config/db.js";
import sendMessageRabbit from "../rabbitmq/send.js";

const members = express.Router();

members.post("/", async (req, response) => {
  const conn = await getRethinkDB();
  const member = req.body;
  r.table("members")
    .filter({ id_member: member.id })
    .run(conn, (err, cursor) => {
      if (err) console.log(err);
      cursor.toArray((err, result) => {
        if (err) console.log(err);
        if (result.length === 0) {
          let dataMember = {
            id_member: member.id,
            document_number: member.document_number,
            email: member.email,
            first_name: member.first_name,
            last_name: member.last_name,
            mobile_phone: member.mobile_phone,
            photo: member.photo,
          };
          if (!member.token) {
            fetch(`${process.env.API_FETCH}${member.id}`, {
              method: "GET",
              headers: {
                Authorization: process.env.API_AUTHORIZATION,
                "Content-Type": "application/json",
                "x-bodytech-organization": process.env.API_ORGANIZATION,
                "x-bodytech-brand": process.env.API_BRAND,
              },
            })
              .then((res) => res.json())
              .then((data) => {
                if (data && data.data && data.data.length > 0) {
                  data.data.forEach((token) => {
                    let dataToken = {
                      device: token.os,
                      type: "mobile",
                      id_user: member.id_user ?? null,
                      id_member: member.id ? member.id.toString() : null,
                      token: token.token,
                    };
                    r.table("token_notification")
                      .insert(dataToken)
                      .run(conn, (err, res) => {
                        if (err) console.log(err);
                      });
                  });
                }
              });
          } else {
            const dataToken = {
              device: member.device,
              type: "mobile",
              id_user: member.id_user ?? null,
              id_member: member.id ?? null,
              token: member.token,
            };
            r.table("token_notification")
              .insert(dataToken)
              .run(conn, (err, res) => {
                if (err) console.log(err);
              });
          }
          r.table("members")
            .insert(dataMember)
            .run(conn, (err, res) => {
              if (err) {
                console.log(err);
                response.send(400);
                response.json({
                  message: "Something went wrong!",
                  status: "error",
                });
              } else {
                dataMember.id_rethink = res.generated_keys[0];
                dataMember.id_member_my_body = member.id;
                dataMember.flag = "insert_member";
                response.status(200);
                response.json({
                  message: "Member added successfully",
                  status: "success",
                });
              }
            });
        } else {
          response.json({
            message: "Current user exist!",
            status: "success",
          });
        }
      });
    });
});

export default members;
