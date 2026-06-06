// Test fungsi untuk mendapatkan tanggal hari ini di zona WIB (UTC+7)
function getTodayInWIB() {
  const now = new Date();
  
  // Dapatkan waktu saat ini dalam UTC+7 (WIB)
  const wibOffset = 7 * 60; // dalam menit
  const localOffset = now.getTimezoneOffset(); // local offset dari UTC dalam menit
  const diffMinutes = localOffset + wibOffset;
  
  const todayJakarta = new Date(now.getTime() + diffMinutes * 60 * 1000);
  todayJakarta.setHours(0, 0, 0, 0);
  
  const todayStr = todayJakarta.toISOString().split('T')[0];
  
  console.log('Now:', now.toISOString());
  console.log('Local UTC offset:', localOffset, 'minutes');
  console.log('Today Jakarta (WIB):', todayStr);
  
  return todayStr;
}

getTodayInWIB();
