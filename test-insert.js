const mysql = require("mysql2/promise");
async function run() {
  const conn = await mysql.createConnection({
    host: "localhost", user: "root", password: "", database: "ppsu_monitoring"
  });
  
  try {
    const [rows] = await conn.execute(
        `INSERT INTO attendance (userId, type, lat, lng, address, photoUrl, deviceInfo, isMock, status, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [
          1,
          "PERMIT",
          0,
          0,
          "Izin Tidak Masuk",
          null,
          null,
          false,
          "PENDING",
          "Kategori: Sakit | Alasan: aS",
        ]
      );
    console.log("Insert success:", rows);
  } catch (err) {
    console.error("Error inserting:", err.message);
  }
  
  conn.end();
}
run();