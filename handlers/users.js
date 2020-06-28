const config=require('../util/config')
const firebase=require('firebase')
firebase.initializeApp(config);

const {validateLogin,validateSignup,reduceUser}=require('../util/validators')
const {admin,db}=require('../util/admin')


exports.signup=(req,res)=>{
  const email=req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const handle=req.body.handle;
  let userId;
  let token;

  const {valid,errors}=validateSignup({email,password,confirmPassword,handle})
  if(!valid){
    return res.status(400).json(errors);
  }
  const noImg='no-img.png'

  db.doc(`/users/${handle}`).get().then(doc=>{
    if(doc.exists){
        return res.status(400).json({handle:'this handle already taken'});
      }else{
        return firebase.auth().createUserWithEmailAndPassword(email,password);
        }
      })
      .then(data=>{
        userId=data.user.uid;
        console.log(data.user.getIdToken());
        return data.user.getIdToken();
      })
      .then(idToken=>{
        token=idToken;
        const userCredentials={
          handle,
          email,
          createdAt:new Date().toISOString(),
          userId,
          imageUrl:`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`
        }
        return db.collection('users').doc(`${handle}`).set(userCredentials)
      })
      .then(()=>{
        console.log(token)
        return res.status(201).json({token})
      })
      .catch(err=>{
        console.log(err)
        if(err.code==='auth/email-already-in-use'){
          return res.status(400).json({email:'email already in use'})
        }
        else{
          return res.status(500).json({error:'Error!'})
        }
      })
}

exports.login=(req,res)=>{
  const email=req.body.email;
  const password=req.body.password;

  const {valid,errors}=validateLogin({email,password})
  if(!valid){
    return res.status(400).json(errors);
  }
  return firebase.auth().signInWithEmailAndPassword(email,password)
    .then(data=>{
      return data.user.getIdToken()
    })
    .then(token=>{
      return res.status(201).json({token})
    })
    .catch(err=>{
      console.log(err)
      if(err.code=='auth/wrong-password'){
        return res.status(403).json({general:'Wrong Password or email id'})
      }
      else if(err.code=='auth/user-not-found'){
        return res.status(403).json({general:'Email not valid'})
      }
      else{
        return res.status(400).json(err.code)
      }
    })
}

exports.addUserDetails=(req,res)=>{
  let userDetails=reduceUser(req.body);

  return db.doc(`/users/${req.user.handle}`).update(userDetails)
    .then(()=>{
      res.json({success:'uploaded Successfully'})
    })
    .catch(err=>{
      res.status(400).json({error:'Unable to send'})
    })
}

exports.getAuthorizedUser=(req,res)=>{
  let userDetails={};
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc=>{
      if(doc.exists){
        userDetails.credentials=doc.data();
        return db.collection('likes').where('userHandle','==',req.user.handle).get()
      }
      else return res.status(400).json({error:'U R not authorized'})
    })
    .then(data=>{
      userDetails.likes=[]
      data.forEach(doc=>{
        userDetails.likes.push(doc.data())
      })
      return db.collection('notifications')
        .where("recepient",'==',req.user.handle)
        .orderBy('createdAt','desc')
        .limit(10)
        .get();
    })
    .then(data=>{
      userDetails.notifications=[];
      data.forEach(doc=>{
        user.notifications.push({
          recipient:doc.data().recipient,
          sender:doc.data().sender,
          createdAt:doc.data().createdAt,
          screamId:doc.data().screamId,
          type:doc.data().type,
          notificationId:doc.id,
        })
      })
      return res.json(userData);
    })
    .catch(err=>{
      console.error(err)
      res.status(400).json({error:'Cant get'})
    })
}

exports.uploadImage=(req,res)=>{
  const fs=require('fs')
  const os=require('os')
  const BusBoy = require('busboy')
  const path= require('path')

  let imageToBeUploaded={};
  let imageFileName;

  const busboy=new BusBoy({headers:req.headers})

  busboy.on('file',(fieldname,file,filename,encoding,mimetype)=>{
    console.log(mimetype)
    if(mimetype!=='image/jpeg'&&mimetype!=='image/png'){
      return res.status(400).json({fileError:'Wrong File Uploaded'})
    }

    const imageExtension=filename.split('.')[filename.split('.').length-1];
    imageFileName=`${Math.round(Math.random()*10000000000).toString()}.${imageExtension}`
    const filePath=path.join(os.tmpdir(),imageFileName);
    imageToBeUploaded={filePath,mimetype};
    file.pipe(fs.createWriteStream(filePath))
  });
  busboy.on('finish',()=>{
    return admin.storage().bucket().upload(imageToBeUploaded.filePath,{
      resumable:false,
      metadata:{
        metadata:{
          contentType:imageToBeUploaded.mimetype
        }
      }
    })
    .then(()=>{
      const imageUrl=`https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return db.doc(`/users/${req.user.handle}`).update({imageUrl})
    })
    .then(()=>{
      return res.json({message:"Image Uploaded"})
    })
    .catch((err)=>{
      console.error(err);
      return res.status(500).json({error:"something went wrong"});
    })
  })
  busboy.end(req.rawBody);
}

exports.markNotification=(req,res)=>{
  let batch=db.batch()
  req.body.forEach((notificationId)=>{
    const notification=db.doc(`/notifications/${notificationId}`);
    batch.update(notification,{read:true});
  });
  batch.commit()
    .then(()=>{
      return res.json({message:'Notifications marked read'})
    })
    .catch((err)=>{
      console.log(err);
      return res.status(500).json({error:err.code})
    })
}
