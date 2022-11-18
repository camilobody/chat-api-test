import mysql from "mysql";

export default function () {
  const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  conn.connect((err) => {
    if (err) {
      console.log(err);
    } else {
      console.log("connected");
    }
  });

  return conn;
}

export const getConnectionMySql = async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  return conn;
};
