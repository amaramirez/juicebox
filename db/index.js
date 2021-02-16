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

const getUserById = async (userId) => {
  try {
    const { rows : [ user ] } = await client.query(`
      SELECT * FROM users
      WHERE id=${ userId };
    `);

    if (!user) return null;

    delete user.password;

    const posts = await getPostsByUser(userId);

    user.posts = posts;

    return user;
  } catch (err) {
    console.error(err);
  }
}

const getAllPosts = async () => {
  const { rows } = await client.query(`
    SELECT id,"authorId",title,content,active FROM posts;
  `);

  return rows;
}

const getPostsByUser = async (userId) => {
  try {
    const { rows } = await client.query(`
      SELECT * FROM posts
      WHERE "authorId"=${userId};
    `);

    return rows;
  } catch (err) {
    throw err;
  }
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

const createPost = async ({
  authorId,
  title,
  content
}) => {
  try {
    const { rows: [ post ] } = await client.query(`
      INSERT INTO posts ("authorId", title, content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [authorId, title, content]);

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

const updatePost = async (id, {
  title,
  content,
  active
}) => {
  //This seems redundant/unnecessary...
  const postData = {};
  if (title) postData.title = title;
  if (content) postData.content = content;
  if (active) postData.active = active;

  const setString = Object.keys(postData).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  if (setString.length === 0) {
    return;
  }

  try {
    const { rows: [ post ]} = await client.query(`
      UPDATE posts SET ${ setString }
      WHERE id=${ id }
      RETURNING *;
    `, Object.values(postData));

    return post;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  client,
  getAllUsers,
  getUserById,
  getAllPosts,
  getPostsByUser,
  createUser,
  createPost,
  updatePost,
  updateUser
}
