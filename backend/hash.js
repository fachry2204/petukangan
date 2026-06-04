const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('1234', 10));
