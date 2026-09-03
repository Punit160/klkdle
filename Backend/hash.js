import bcrypt from "bcryptjs";

const plainPassword = "123456";

const hash = await bcrypt.hash(plainPassword, 10);

console.log("Plain Password:", plainPassword);

console.log("Hashed Password:", hash);