const {getAllScream,postOneScream,getScream,commentOnScream,likeScream,unlikeScream,deleteScream}=require('./handlers/scream')
const {signup,login,uploadImage,addUserDetails,getAuthorizedUser,markNotification,signupG}=require('./handlers/users')
const FBauth=require('./util/fbAuth')
const functions = require('firebase-functions');
const {admin,db}=require('./util/admin')

const express=require('express');
const bodyParser=require('body-parser')

const app=express()
app.use(bodyParser.json())

app.get('/screams',getAllScream)
app.post('/scream',FBauth,postOneScream)
app.get('/scream/:screamId',getScream)
app.post('/scream/:screamId/comment',FBauth,commentOnScream)
app.post('/scream/:screamId/like',FBauth,likeScream)
app.post('/scream/:screamId/unlike',FBauth,unlikeScream)
app.delete('/scream/:screamId',FBauth,deleteScream)
// app.delete('/scream/:screamId',FBauth,deletecomment)

app.post('/signup',signup)
app.post('/login',login)
app.post('/user/image',FBauth,uploadImage)
app.post('/user',FBauth,addUserDetails)
app.get('/user',FBauth,getAuthorizedUser)
app.post('/notifications',FBauth,markNotification)
exports.api = functions.https.onRequest(app)


exports.createNotificationOnLike=functions.firestore.document('likes/{id}')
    .onCreate(snapshot=>{
      return db.doc(`/screams/${snapshot.data().screamId}`).get()
      .then((doc)=>{
        if(doc.exists && doc.data().userHandle!==snapshot.data().userHandle){
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt:new Date().toISOString(),
            recipient:doc.data().userHandle,
            sender:snapshot.data().userHandle,
            type:'like',
            read:false,
            screamId:doc.id
          })
          .then(()=>{
            return db.doc(`/users/${snapshot.data().userHandle}`).get()
          })
          .then(doc=>{
            return db.doc(`notifications/${snapshot.id}`).update({
              imageUrl:doc.data().imageUrl
            })
          })
        }
       })
      .catch(err=>{
        console.log(err);
        return;
      })
    })

exports.deleteNotificationOnUnlike=functions.firestore.document('likes/{id}')
  .onDelete(snapshot=>{
    return db.doc(`notifications/${snapshot.id}`).delete()
      .catch(err=>{
        console.log(err);
        return;
      })
  })

exports.createNotificationOnComment=functions.firestore.document('comments/{id}')
      .onCreate(snapshot=>{
        return db.doc(`/screams/${snapshot.data().screamId}`).get()
        .then((doc)=>{
          if(doc.exists && doc.data().userHandle!==snapshot.data().userHandle){
            return db.doc(`/notifications/${snapshot.id}`).set({
              createdAt:new Date().toISOString(),
              recipient:doc.data().userHandle,
              sender:snapshot.data().userHandle,
              type:'comment',
              read:false,
              screamId:doc.id,
              imageUrl:snapshot.data().imageUrl
            });
          }
         })
        .catch(err=>{
          console.log(err);
          return;
        })
      })

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log('image has changed');
      const batch = db.batch();
      return db.collection('screams').where('userHandle', '==', change.before.data().handle).get()
        .then((data) => {
          data.forEach((doc) => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { imageUrl: change.after.data().imageUrl });
          });
          return db.collection('comments').where('userHandle','==',change.before.data().handle).get()
        })
        .then(data=>{
          data.forEach(doc=>{
            const comment= db.doc(`/comments/${doc.id}`)
            batch.updata(comment,{imageUrl:change.after.data().imageUrl})
          })
          return batch.commit();
        })
    } else return true;
  });

exports.onScreamDelete = functions.firestore.document('/screams/{screamId}')
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db.collection('comments').where('screamId', '==', screamId).get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection('likes').where('screamId', '==', screamId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db.collection('notifications').where('screamId', '==', screamId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
