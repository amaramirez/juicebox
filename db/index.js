//Import the pg module
const { Client } = require('pg');

//Connect to DB by location
const client = new Client('postgres://localhost:5432/juicebox-dev');

const getAllUsers = async () => {
  const { rows } = await client.query(`
    SELECT id,username,name,location,active FROM users;
  `);

  return rows;
}

const createUser = async ({
  username,
  password,
  name,
  location
}) => {
  try {
    const { rows: [ user ] } = await client.query(`
      INSERT INTO users (username, password, name, location)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
      RETURNING *;
    `, [username, password, name, location]);

    return user;
  } catch (err) {
    throw err;
  }
}

const updateUser = async (id, fields = {}) => {
  //Build the set string
  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  //Return if called with no fields
  if (setString.length === 0) {
    return;
  }

  try {
    const { rows: [ user ]} = await client.query(`
      UPDATE users SET ${ setString }
      WHERE id=${ id }
      RETURNING *;
    `,Object.values(fields));

    return user;
  } catch(err) {
    throw err;
  }
}

module.exports = {
  client,
  getAllUsers,
  createUser,
  updateUser
}
