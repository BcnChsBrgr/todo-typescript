import { SQLParser } from "./SQLParser";

const sql1 = "SELECT id, name FROM users WHERE age > 30";

const sql2 = 'UPDATE users SET name = "John Doe" WHERE id in ( 1 )';

const parse1 = new SQLParser(sql1);
console.log(parse1.parse());

const parse2 = new SQLParser(sql2);
console.log(parse2.parse());
