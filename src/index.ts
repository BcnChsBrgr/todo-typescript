import { SQLParser } from "./SQLParser";

const sql1 = "select id, name from users where age > 30";
const sql2 = 'UPDATE users SET name = "John Doe" WHERE id in ( 1 )';
const sql3 = "SELECT id, name FROM users WHERE age=330";

const parse1 = new SQLParser(sql1);
console.log(parse1.parse());
const parse2 = new SQLParser(sql2);
console.log(parse2.parse());
const parse3 = new SQLParser(sql3);
console.log(parse3.parse());
