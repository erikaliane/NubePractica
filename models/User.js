const bcrypt = require('bcrypt');
const db = require('../config/db');

const User = {};

User.createUser = async (username, password, email) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
  const values = [username, hashedPassword, email];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result.insertId);
    });
  });
};

User.findByUsername = (username) => {
  const query = 'SELECT * FROM users WHERE username = ?';
  const values = [username];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result[0]);
    });
  });
};

User.findById = (id) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  const values = [id];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result[0]);
    });
  });
};


User.updateAccountLock = (userId, lockedUntil) => {
  const query = 'UPDATE users SET account_locked_until = ? WHERE id = ?';
  const values = [lockedUntil, userId];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};

User.updateLoginAttempts = (userId, loginAttempts) => {
  const query = 'UPDATE users SET login_attempts = ? WHERE id = ?';
  const values = [loginAttempts, userId];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result);
    });
  });
};


// Dentro del modelo User
User.findByEmail = (email) => {
  const query = 'SELECT * FROM users WHERE email = ?';
  const values = [email];

  return new Promise((resolve, reject) => {
    db.query(query, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result[0]);
    });
  });
};

User.findOne = (query) => {
  const conditions = Object.keys(query).map((key) => `${key} = ?`).join(' AND ');
  const values = Object.values(query);
  const sql = 'SELECT * FROM users WHERE ' + conditions;

  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, result) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(result[0]);
    });
  });
};

module.exports = User;
