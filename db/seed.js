//Grab client via destructuring from index.js
const {
  client,
  getAllUsers,
  getUserById,
  getAllPosts,
  getPostsByUser,
  createUser,
  createPost,
  updatePost,
  updateUser
} = require('./index');

const createInitialUsers = async () => {
  try {
    console.log("Starting to create users...");

    const albert = await createUser({
      username: 'albert',
      password: 'bertie99',
      name: 'Albert',
      location: 'Santa Barabara, CA'
    });
    const sandra = await createUser({
      username: 'sandra',
      password: '2sandy4me',
      name: 'Sandra',
      location: 'Baltimore, MD'});
    const glamgal = await createUser({
      username: 'glamgal',
      password: 'soglam',
      name: 'Danielle',
      location: "Sydney, AU"
    });

    console.log("Finished creating users!");
  } catch (err) {
    console.error("Error creating users!");
    throw err;
  }
}

const createInitialPosts = async () => {
  try {
    const [albert, sandra, glamgal] = await getAllUsers();

    await createPost({
      authorId: albert.id,
      title: "First Post",
      content: "This is my first post. I hope I love writing blogs as much as I love writing them."
    });

    await createPost({
      authorId: sandra.id,
      title: "Hello, post",
      content: "This is my first post. I hope I love writing blogs as much as I love writing them."
    });

    await createPost({
      authorId: glamgal.id,
      title: "Hello, Postgres",
      content: "This is my first post. I hope I love writing blogs as much as I love writing them."
    });
  } catch (err) {
    console.error(err);
  }
}

const dropTables = async () => {
  try {
    console.log("Starting to drop tables...");
    await client.query(`
      DROP TABLE IF EXISTS posts;
      DROP TABLE IF EXISTS users;
    `);

    console.log("Finished dropping tables!");
  } catch (err) {
    console.error("Error dropping tables!");
    //Sends the error upstream to calling function
    throw err;
  }
}

const createTables = async () => {
  try {
    console.log("Starting to build tables...");

    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        location VARCHAR(255) NOT NULL,
        active BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE posts (
        id SERIAL PRIMARY KEY,
        "authorId" INTEGER REFERENCES users(id) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        active BOOLEAN DEFAULT true
      );
    `);

    console.log("Finished building tables!");
  } catch (err) {
    console.error("Error building tables!");
    //Send error upstream
    throw err;
  }
}

const rebuildDB = async () => {
  try {
    client.connect();

    await dropTables();
    await createTables();
    await createInitialUsers();
    await createInitialPosts();
  } catch (err) {
    throw err;
  }
}

const testDB = async () => {
  try {
    console.log("Starting to test database");
    console.log("Calling getAllUsers");
    //Refactored to be imported from ./db/index.js
    const users = await getAllUsers();
    console.log("Result: ", users);

    console.log("Calling updateUser on users[0]");
    const updateUserResult = await updateUser(users[0].id, {
      name: 'Newname Sogood',
      location: 'Lesterville, KY'
    })
    console.log("Result: ", updateUserResult);

    console.log("Calling getAllPosts");
    const posts = await getAllPosts();
    console.log("Result: ", posts);

    console.log("Calling updatePost on posts[0]");
    const updatePostResult = await updatePost(posts[0].id, {
      title: "New Title",
      content: "Updated content."
    });
    console.log("Result: ", updatePostResult);

    console.log("Calling getUserById with 1");
    const albert = await getUserById(1);
    console.log("Result: ", albert);

    console.log("Finished database tests!");
  } catch(err) {
    console.error("Error testing database!");
    throw err;
  }
}

rebuildDB()
  .then(testDB)
  .catch(console.error)
  .finally(() => {client.end()});
