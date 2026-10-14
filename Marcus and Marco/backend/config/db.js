const mongoose = require('mongoose');
const memoryStore = require('./memoryStore');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 1500
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    global.USE_MEMORY_STORE = false;
  } catch (error) {
    console.warn(`[SkillTrack] Local MongoDB not reachable (${error.message}).`);
    console.log(`[SkillTrack] Booting embedded in-memory database with pre-seeded demo dataset.`);
    global.USE_MEMORY_STORE = true;
    await memoryStore.init();
    console.log(`[SkillTrack] In-memory database ready! All endpoints and demo features are active.`);
  }
};

module.exports = connectDB;
