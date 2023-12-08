/**
 * This builds on the webServer of previous projects in that it exports the
 * current directory via webserver listing on a hard code (see portno below)
 * port. It also establishes a connection to the MongoDB named 'project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch
 * any file accessible to the current user in the current directory or any of
 * its children.
 *
 * This webServer exports the following URLs:
 * /            - Returns a text status message. Good for testing web server
 *                running.
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns the population counts of the cs collections in the
 *                database. Format is a JSON object with properties being the
 *                collection name and the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the
 * database:
 * /user/list         - Returns an array containing all the User objects from
 *                      the database (JSON format).
 * /user/:id          - Returns the User object with the _id of id (JSON
 *                      format).
 * /photosOfUser/:id  - Returns an array with all the photos of the User (id).
 *                      Each photo should have all the Comments on the Photo
 *                      (JSON format).
 */

const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const async = require("async");

const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const multer = require("multer");
const app = express();

const processFormBody = multer({storage: multer.memoryStorage()}).single('uploadedphoto');

app.use(session({secret: "secretKey", resave: false, saveUninitialized: false}));
app.use(bodyParser.json());

// Load the Mongoose schema for User, Photo, and SchemaInfo
const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");
const Activity = require('./schema/activity.js');

// XXX - Your submission should work without this line. Comment out or delete
// this line for tests and before submission!
mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));

function getSessionUserID(request){
  return request.session.user_id;
}

function hasNoUserSession(request, response){
  if (!getSessionUserID(request)){
    response.status(401).send();
    return true;
  }
  return false;
}

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * Use express to handle argument passing in the URL. This .get will cause
 * express to accept URLs with /test/<something> and return the something in
 * request.params.p1.
 * 
 * If implement the get as follows:
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns an object with the counts of the different collections
 *                in JSON format.
 */
app.get("/test/:p1", function (request, response) {
  // Express parses the ":p1" from the URL and returns it in the request.params
  // objects.
  // console.log("/test called with param1 = ", request.params.p1);

  const param = request.params.p1 || "info";

  if (param === "info") {
    // Fetch the SchemaInfo. There should only one of them. The query of {} will
    // match it.
    SchemaInfo.find({}, function (err, info) {
      if (err) {
        // Query returned an error. We pass it back to the browser with an
        // Internal Service Error (500) error code.
        console.error("Error in /user/info:", err);
        response.status(500).send(JSON.stringify(err));
        return;
      }
      if (info.length === 0) {
        // Query didn't return an error but didn't find the SchemaInfo object -
        // This is also an internal error return.
        response.status(500).send("Missing SchemaInfo");
        return;
      }

      // We got the object - return it in JSON format.
      // console.log("SchemaInfo", info[0]);
      response.end(JSON.stringify(info[0]));
    });
  } else if (param === "counts") {
    // In order to return the counts of all the collections we need to do an
    // async call to each collections. That is tricky to do so we use the async
    // package do the work. We put the collections into array and use async.each
    // to do each .count() query.
    const collections = [
      { name: "user", collection: User },
      { name: "photo", collection: Photo },
      { name: "schemaInfo", collection: SchemaInfo },
    ];
    async.each(
      collections,
      function (col, done_callback) {
        col.collection.countDocuments({}, function (err, count) {
          col.count = count;
          done_callback(err);
        });
      },
      function (err) {
        if (err) {
          response.status(500).send(JSON.stringify(err));
        } else {
          const obj = {};
          for (let i = 0; i < collections.length; i++) {
            obj[collections[i].name] = collections[i].count;
          }
          response.end(JSON.stringify(obj));
        }
      }
    );
  } else {
    // If we know understand the parameter we return a (Bad Parameter) (400)
    // status.
    response.status(400).send("Bad param " + param);
  }
});
/**
 * URL /user - adds a new user
 */
app.post("/user", function (request, response) {
  const first_name = request.body.first_name || "";
  const last_name = request.body.last_name || "";
  const location = request.body.location || "";
  const description = request.body.description || "";
  const occupation = request.body.occupation || "";
  const login_name = request.body.login_name || "";
  const password = request.body.password || "";

  if (first_name === "") {
    console.error("Error in /user", first_name);
    response.status(400).send("first_name is required");
    return;
  }
  if (last_name === "") {
    console.error("Error in /user", last_name);
    response.status(400).send("last_name is required");
    return;
  }
  if (login_name === "") {
    console.error("Error in /user", login_name);
    response.status(400).send("login_name is required");
    return;
  }
  if (password === "") {
    console.error("Error in /user", password);
    response.status(400).send("password is required");
    return;
  }

  User.exists({ login_name: login_name }, function (err, returnValue) {
    if (err) {
      console.error("Error in /user", err);
      response.status(500).send();
    } else if (returnValue) {
      console.error("Error in /user", returnValue);
      response.status(400).send();
    } else {
      User.create({
        _id: new mongoose.Types.ObjectId(),
        first_name: first_name,
        last_name: last_name,
        location: location,
        description: description,
        occupation: occupation,
        login_name: login_name,
        password: password,
      })
        .then((user) => {
          request.session.user_id = user._id;
          session.user_id = user._id;

  // activity code
  
    Activity.create({
      userId: user._id ,
      description: `User ${user.first_name} added}` 
    })
      .then((user1) => {
        console.log(`Added User`+user1);
      })
      .catch((err1) => {
        console.error("Error: ", err1);
        response.status(500).send();
      });


          response.end(JSON.stringify(user));
        })
        .catch((err1) => {
          console.error("Error in /user", err1);
          response.status(500).send();
        });
    }
  });
  
});
/**
 * URL /photos/new - adds a new photo for the current user
 */
app.post("/photos/new", function (request, response) {
  if (hasNoUserSession(request, response)) return;
  const user_id = getSessionUserID(request) || "";
  if (user_id === "") {
    console.error("Error in /photos/new", user_id);
    response.status(400).send("user_id required");
    return;
  }
  processFormBody(request, response, function (err) {
    if (err || !request.file) {
      console.error("Error in /photos/new", err);
      response.status(400).send("photo required");
      return;
    }
    const timestamp = new Date().valueOf();
    const filename = 'U' +  String(timestamp) + request.file.originalname;
    const sharingList = JSON.parse(request.body.sharingList || "[]");
    const isPrivate = request.body.isPrivate;
    
    fs.writeFile("./images/" + filename, request.file.buffer, function (err2) {
      if (err2) {
        console.error("Error in /photos/new", err2);
        response.status(400).send("error writing photo");
        return;
      }
      Photo.create(
          {
            _id: new mongoose.Types.ObjectId(),
            file_name: filename,
            date_time: new Date(),
            user_id: new mongoose.Types.ObjectId(user_id),
            sharingList: sharingList,
            isPrivate: isPrivate,
            comment: [],
          })
          .then(() => {
    // activity code
    User.find(
      {
        _id: request.session.user_id,
      }, {__v: 0}, function (err_cur, user) {
    if (err_cur) {
      console.error("Error: ", err_cur);
      return;
    }
  
    Activity.create({
      userId: user[0]._id ,
      description: `User ${user[0].first_name} added photo ${filename}` 
    })
      .then((user1) => {
        console.log(`User added photo`+user1);
      })
      .catch((err1) => {
        console.error("Error: ", err1);
        response.status(500).send();
      });
  
  });
              response.end();
          })
          .catch(err1 => {
            console.error("Error in /photos/new", err1);
            response.status(500).send(JSON.stringify(err1));
          });
    });
  });
});
/**
 * URL /commentsOfPhoto/:photo_id - adds a new comment on photo for the current user
 */
app.post("/commentsOfPhoto/:photo_id", function (request, response) {
  if (hasNoUserSession(request, response)) return;
  const id = request.params.photo_id || "";
  const user_id = getSessionUserID(request) || "";
  const comment = request.body.comment || "";
  if (id === "") {
    response.status(400).send("id required");
    return;
  }
  if (user_id === "") {
    response.status(400).send("user_id required");
    return;
  }
  if (comment === "") {
    response.status(400).send("comment required");
    return;
  }
  Photo.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $push: {
          comments: {
            comment: comment,
            date_time: new Date(),
            user_id: new mongoose.Types.ObjectId(user_id),
            _id: new mongoose.Types.ObjectId()
          }
        } },
  function (err) {
    if (err) {
      // Query returned an error. We pass it back to the browser with an
      // Internal Service Error (500) error code.
      console.error("Error in /commentsOfPhoto/:photo_id", err);
      response.status(500).send(JSON.stringify(err));
      return;
    }

    // activity code
    User.find(
      {
        _id: request.session.user_id,
      }, {__v: 0}, function (err3, user) {
    if (err3) {
      console.error("Error: ", err3);
      return;
    }
  
    Activity.create({
      userId: user[0]._id ,
      description: `User ${user[0].first_name} added comment to photo ${id}` 
    })
      .then((user6) => {
        console.log(`User added comment`+user6);
      })
      .catch((err1) => {
        console.error("Error: ", err1);
        response.status(500).send();
      });
  
  });
  

    response.end();
  });
});

/**
 * URL /admin/login - Returns user object on successful login
 */
app.post("/admin/login", function (request, response) {
  const login_name = request.body.login_name || "";
  const password = request.body.password || "";
  User.find(
      {
        login_name: login_name,
        password: password
      }, {__v: 0}, function (err, user) {
    if (err) {
      // Query returned an error. We pass it back to the browser with an
      // Internal Service Error (500) error code.
      console.error("Error in /admin/login", err);
      response.status(500).send(JSON.stringify(err));
      return;
    }
    if (user.length === 0) {
      // Query didn't return an error but didn't find the user object -
      // This is also an internal error return.
      response.status(400).send();
      return;
    }
    request.session.user_id = user[0]._id;
    session.user_id = user[0]._id;

    Activity.create({
      userId: user[0]._id ,
      description: `User ${user[0].first_name} logged in` 
    })
      .then((user8) => {
        console.log(`User logged in`+user8);
      })
      .catch((err1) => {
        console.error("Error in /user", err1);
        response.status(500).send();
      });
    //session.user = user;
    //response.cookie('user',user);
    // We got the object - return it in JSON format.
    response.end(JSON.stringify(user[0]));
  });
});

/**
 * URL /admin/logout - clears user session
 */
app.post("/admin/logout", function (request, response) {

  User.find(
    {
      _id: request.session.user_id,
    }, {__v: 0}, function (err, user) {
  if (err) {
    // write your own comments
    console.error("Error: ", err);
    return;
  }
  Activity.create({
    userId: user[0]._id ,
    description: `User ${user[0].first_name} logged out` 
  })
    .then((user9) => {
      console.log(`User logged out`+user9);
    })
    .catch((err1) => {
      console.error("Error: ", err1);
      response.status(500).send();
    });

});

  request.session.destroy(() => {
    session.user_id = undefined;
    response.end();
  });
});

/**
 * URL /user/list - Returns all the User objects.
 */
app.get("/user/list", function (request, response) {
  if (hasNoUserSession(request, response)) return;
  const projection = {
    _id:1,
    first_name:1,
    last_name:1
  };
    User.find({}, projection, function (err, userDetails) {
      if (err) {
        console.error("Error in /user/list:", err);
        response.status(500).send(JSON.stringify(err));
      } else if (userDetails.length === 0) {
        response.status(400).send("Missing user list");
      } else {
        response.end(JSON.stringify(userDetails));
      }
    });
});


/**
 * URL /user/:id - Returns the information for User (id).
 */
app.get("/user/:id", function (request, response) {
  if (hasNoUserSession(request, response)) return;
  const id = request.params.id;
  const projection = {
    _id:1,
    first_name:1,
    last_name:1,
    location:1,
    description:1,
    occupation:1
  };
  User.find({_id: id}, projection, function (err, userDetails) {
    if (err) {
      console.error("Error in /user/list:", err);
      response.status(400).send("err");
    } else if (userDetails.length === 0) {
      response.status(400).send("Missing user list");
    } else {
      for (var i = 0; i < userDetails.length; i++) {
        if (JSON.parse(JSON.stringify(userDetails[i]._id)) === id) {
           response.end(JSON.stringify(userDetails[i]));
        }
     }
    }
  });
});


/**
 * URL /photosOfUser/:id - Returns the Photos for User (id).
 */
app.get("/photosOfUser/:id", function (request, response) {
  if (hasNoUserSession(request, response)) return;

  var userId = getSessionUserID(request);
  const id = request.params.id;
  User.findById(id,{__v:0, login_name:0, password: 0})
  .then((user) => {
    if (user === null) {
      // Query didn't return an error but didn't find the SchemaInfo object -
      // This is also an internal error return.
      console.error("User not found - /user/:id", id);
      response.status(400).send();
    }
  Photo.aggregate([
    { $match:
          {user_id: {$eq: new mongoose.Types.ObjectId(id)}}
    },
    { $addFields: {
      comments: { $ifNull : ["$comments",[]]}
    } },
    { $lookup: {
        from: "users",
        localField: "comments.user_id",
        foreignField: "_id",
        as: "users"
      } },
    { $addFields: {
        comments: {
          $map: {
            input: "$comments",
            in: {
              $mergeObjects: [
                "$$this",
                { user: {
                    $arrayElemAt: [
                      "$users",
                      {
                        $indexOfArray: [
                          "$users._id",
                          "$$this.user_id"
                        ]
                      }
                    ]
                  } }
              ]
            }
          }
        }
      } },
    { $project: {
        users: 0,
        __v: 0,
        "comments.__v": 0,
        "comments.user_id": 0,
        "comments.user.location": 0,
        "comments.user.description": 0,
        "comments.user.login_name": 0,
        "comments.user.password": 0,
        "comments.user.occupation": 0,
        "comments.user.__v": 0,
      } }
  ], function (err, photos) {
    if (err) {
      // Query returned an error. We pass it back to the browser with an
      // Internal Service Error (500) error code.
      console.error("Error in /photosOfUser/:id", err);
      response.status(400).send(JSON.stringify(err));
      return;
    }
    if (photos.length === 0) {
      // Query didn't return an error but didn't find the SchemaInfo object -
      // This is also an internal error return.
      response.status(500).send();
      return;
    }
    photos = JSON.parse(JSON.stringify(photos));
    
    if (id === userId) {
      response.end(JSON.stringify(photos));
    } else {
      const visiblePhotos = photos.filter((photo) => {
        return (
          (photo.isPrivate && photo.user_id.toString() === userId) || // Only owner for private photos
          (!photo.isPrivate && (photo.sharingList.includes(userId) || photo.sharingList.length === 0))
        );
      });
      response.end(JSON.stringify(visiblePhotos));
    }
    
  });
})
.catch( (err) => {
  // Query returned an error. We pass it back to the browser with an
  // Internal Service Error (500) error code.
  console.error("Error in /user/:id", err.reason);
  if (err.reason.toString().startsWith("BSONTypeError:"))
  {
    response.status(400).send();
  } 
  else
  {
    response.status(500).send();
  }
    
  return null;
});
});

// URL to get the most recently uploaded photo for a user
app.get("/user/recentPhoto/:userId", function (request, response) {
  const userId = request.params.userId;

  Photo.findOne({ user_id: userId }).sort({ date_time: -1 })
      .then((photo) => {
        response.json(photo);
      })
      .catch((err) => {
        console.error("Error in /user/recentPhoto/:userId", err);
        response.status(500).send(JSON.stringify(err));
      });
});


// URL to get the photo with the most comments for a user
app.get("/user/mostCommentedPhoto/:userId", function (request, response) {
  const userId = request.params.userId;

  Photo.aggregate([
    { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
    { $addFields: { commentCount: { $size: "$comments" } } },
    { $sort: { commentCount: -1 } },
    { $limit: 1 }
  ])
      .then((photos) => {
        if (photos.length === 0) {
          response.status(404).json({ message: "No photos found for the user" });
        } else {
          response.json(photos[0]);
        }
      })
      .catch((err) => {
        console.error("Error in /user/mostCommentedPhoto/:userId", err);
        response.status(500).send(JSON.stringify(err));
      });
});


app.delete("/deletePhoto/:photoId", function (request, response) {
  const photoId = request.params.photoId;
  const user_id = getSessionUserID(request);

  // Check if the user has the authority to delete the photo
  Photo.findOne({ _id: new mongoose.Types.ObjectId(photoId) }, function (err, photo) {
    if (err) {
      console.error("Error checking photo ownership:", err);
      response.status(500).send();
    } else if (!photo || !photo.user_id.equals(user_id)) {
      console.error("Unauthorized photo deletion attempt");
      response.status(401).send();
    } else {
      // User has the authority to delete the photo
      Photo.deleteOne({ _id: new mongoose.Types.ObjectId(photoId) }, function (err5) {
        if (err5) {
          console.error("Error deleting photo:", err5);
          response.status(500).send();
        } else {
          console.log("Photo deleted successfully.");
          response.end();
        }
      });
    }
  });
});

app.delete("/deleteComment/:commentId", function (request, response) {
  const commentId = request.params.commentId;
  const user_id = getSessionUserID(request);

  // Check if the user has the authority to delete the comment
  Photo.findOne({ "comments._id": new mongoose.Types.ObjectId(commentId) }, function (err, photo) {
    if (err) {
      console.error("Error checking comment ownership:", err);
      response.status(500).send();
    } else if (!photo || !photo.comments.find(c => c._id.equals(commentId) && c.user_id.equals(user_id))) {
      console.error("Unauthorized comment deletion attempt");
      response.status(401).send();
    } else {
      Photo.updateOne(
        { "comments._id": new mongoose.Types.ObjectId(commentId) },
        { $pull: { comments: { _id: new mongoose.Types.ObjectId(commentId) } } },
        function (err43) {
          if (err43) {
            console.error("Error deleting comment:", err43);
            response.status(500).send();
          } else {
            console.log("Comment deleted successfully.");
            response.end();
          }
        }
      );
    }
  });
});


app.delete("/deleteUser/:userId", function (request, response) {
  const userId = request.params.userId;
  const user_id = getSessionUserID(request);

  // Check if the user has the authority to delete the user account
  User.findOne({ _id: new mongoose.Types.ObjectId(userId) }, function (err, user) {
    if (err) {
      console.error("Error checking user account ownership:", err);
      response.status(500).send();
    } else if (!user || !user._id.equals(user_id)) {
      console.error("Unauthorized user account deletion attempt");
      response.status(401).send();
    } else {
      // Delete the user's data from the database
      User.deleteOne({ _id: new mongoose.Types.ObjectId(userId) }, function (err34) {
        if (err34) {
          console.error("Error deleting user account:", err34);
          response.status(500).send();
        } else {
          // Provide a final confirmation message to the user
          response.status(200).json({ message: "Are you sure you want to delete your account?" });

        }
      });
    }
  });
});

// get acivity list 
app.get('/activityList', (request, response)=>{
  Activity.find({}, function (err, activityDetails) {
    if (err) {
      console.error("Error:", err);
      response.status(500).send(JSON.stringify(err));
    } else if (activityDetails.length === 0) {
      response.status(400).send("Missing activity list");
    } else {
      response.json(activityDetails);
      response.end();
    }
  });
});


const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
      port +
      " exporting the directory " +
      __dirname
  );
});
