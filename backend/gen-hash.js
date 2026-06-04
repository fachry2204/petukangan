const bcrypt = require('bcrypt');
bcrypt.hash('1234', 10).then(h => console.log(h));
