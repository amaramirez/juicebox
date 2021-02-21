//Import the pg module
const { Client } = require('pg');

//Connect to DB by location
const client = new Client(process.env.DATABASE_URL || 'postgres://localhost:5432/juicebox-dev');

const getAllUsers = async () => {
  try {
    const { rows } = await client.query(`
      SELECT id,username,name,location,active FROM users;
    `);

    return rows;
  } catch (err) {
    throw err;
  }
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

const getUserByUsername = async (username) => {
  try {
    const { rows: [user] } = await client.query(`
      SELECT * FROM users
      WHERE username=$1;
    `, [username]);

    return user;
  } catch (err) {
    throw err;
  }
}

const getAllPosts = async () => {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id FROM posts;
    `);

    const posts = await Promise.all(postIds.map(
      post => getPostById( post.id )
    ));

    return posts;
  } catch (err) {
    throw err;
  }
}

const getPostById = async (postId) => {
  try {
    const { rows: [post] } = await client.query(`
      SELECT * FROM posts
      WHERE id=$1;
    `, [postId]);

    if (!post) {
      throw {
        name: 'PostNotFoundError',
        message: 'Could not find a post with that postId'
      };
    }

    const { rows: tags } = await client.query(`
      SELECT tags.* FROM tags
      JOIN post_tags ON tags.id=post_tags."tagId"
      WHERE post_tags."postId"=$1;
    `,[postId]);

    const { rows: [author] } = await client.query(`
      SELECT id, username, name, location FROM users
      WHERE id=$1;
    `,[post.authorId]);

    post.tags = tags;
    post.author = author;

    delete post.authorId;

    return post;
  } catch (err) {
    throw err;
  }
}

const getPostsByUser = async (userId) => {
  try {
    const { rows: postIds } = await client.query(`
      SELECT id FROM posts
      WHERE "authorId"=${userId};
    `);

    const posts = await Promise.all(postIds.map(
      post => getPostById( post.id )
    ));

    return posts;
  } catch (err) {
    throw err;
  }
}

const getPostsByTagName = async (tagName) => {
  try {
    const { rows: postIds } = await client.query(`
      SELECT posts.id FROM posts
      JOIN post_tags ON posts.id=post_tags."postId"
      JOIN tags ON tags.id=post_tags."tagId"
      WHERE tags.name=$1;
    `, [tagName]);

    return await Promise.all(postIds.map(
      post => getPostById(post.id)
    ));
  } catch (err) {
    throw err;
  }
}

const getAllTags = async () => {
  try {
    const { rows } = await client.query(`
      SELECT * FROM tags;
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
  content,
  tags = []
}) => {
  try {
    const { rows: [ post ] } = await client.query(`
      INSERT INTO posts ("authorId", title, content)
      VALUES ($1, $2, $3)
      RETURNING *;
    `, [authorId, title, content]);

    const tagList = await createTags(tags);

    return await addTagsToPost(post.id, tagList);

  } catch (err) {
    throw err;
  }
}

const createTags = async (tagList) => {
  if (tagList.length === 0) {
    return;
  }

  const insertValues = tagList.map(
    (_,i) => `$${i+1}`).join('), (');

  const selectValues = tagList.map(
    (_,i) => `$${i+1}`).join(', ');

  try {
    await client.query(`
      INSERT INTO tags (name)
      VALUES (${insertValues})
      ON CONFLICT (name) DO NOTHING;
    `, tagList);

    const { rows } = await client.query(`
      SELECT * FROM tags
      WHERE name
      IN (${selectValues});
    `, tagList);
    return rows;
  } catch (err) {
    throw err;
  }
}

const createPostTag = async (postId, tagId) => {
  try {
    await client.query(`
      INSERT INTO post_tags("postId", "tagId")
      VALUES ($1,$2)
      ON CONFLICT ("postId","tagId") DO NOTHING;
    `,[postId,tagId]);
  } catch (err) {
    throw err;
  }
}

const addTagsToPost = async (postId, tagList) => {
  try {
    const createPostTagPromises = tagList.map(
      tag => createPostTag(postId, tag.id)
    );

    await Promise.all(createPostTagPromises);
    return await getPostById(postId);
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

const updatePost = async (postId, fields = {}) => {
  const {tags} = fields;
  delete fields.tags;

  const setString = Object.keys(fields).map(
    (key, index) => `"${ key }"=$${ index + 1 }`
  ).join(', ');

  try {
    //Update easy fields first
    if (setString.length > 0) {
      await client.query(`
        UPDATE posts SET ${setString}
        WHERE id=${postId}
        RETURNING *;
      `, Object.values(fields));
    }

    if (tags === undefined) {
      return await getPostById(postId);
    }

    //Make new tags
    const tagList = await createTags(tags);
    const tagListIdString = tagList.map(
      tag => `${tag.id}`
    ).join(', ');

    await client.query(`
      DELETE FROM post_tags
      WHERE "tagId" NOT IN (${tagListIdString})
      AND "postId"=$1;
    `, [postId]);

    await addTagsToPost(postId, tagList);

    return await getPostById(postId);

  } catch (err) {
    throw err;
  }
}

module.exports = {
  client,
  getAllUsers,
  getUserById,
  getUserByUsername,
  getAllPosts,
  getPostsByUser,
  getPostsByTagName,
  getPostById,
  getAllTags,
  createUser,
  createPost,
  updatePost,
  updateUser,
  addTagsToPost,
  createTags,
}
