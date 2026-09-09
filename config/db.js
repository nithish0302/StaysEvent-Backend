const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      family: 4, // force IPv4 — fixes querySrv ECONNREFUSED on Windows
    });
    console.log(`✅ MONGODB Connection successful ${conn.connection.host} `);
  } catch (err) {
    console.log(`❌ ERROR OCCURED while connecting ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
