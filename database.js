const Database = require('better-sqlite3');
const db = new Database('banco-de-dados.db');

db.exec(`\
CREATE TABLE IF NOT EXISTS session (
  name TEXT,
  chatId TEXT,
  PRIMARY KEY (name, chatId)
);`);

function createSession(chatId, session) {
  const insert = db.prepare('INSERT INTO session (chatId, name) VALUES (?, ?)');
  return insert.run(chatId, session).changes == 1;
}

function getSessionsByChatId(chatId) {
  const select = db.prepare('SELECT * FROM session WHERE chatId = ?');
  const result = select.all(chatId);

  return result;
}

function deleteSession(chatId, session) {
  const _delete = db.prepare('DELETE FROM session WHERE chatId = ? AND name = ?');
  return _delete.run(chatId, session).changes == 1;
}

module.exports = {
  createSession,
  getSessionsByChatId,
  deleteSession
};