const {db,admin}=require('../util/admin')

exports.postOneScream=(req,res)=>{
  console.log(req.body)
  const newScream={
    body:req.body.body,
    userHandle:req.user.handle,
    createdAt:new Date().toISOString(),
    likeCount:0,
    commentCount:0,
    imageUrl:req.user.imageUrl
  }
  if(newScream.body.trim()===''){
    return res.status(400).json({error:'body must not be empty'})
  }
  admin.firestore().collection('screams').add(newScream)
    .then(doc=>{
      return res.json({message:'Success'})
    })
    .catch(err=>{
      console.log(err);
      return res.json({error:'error!!'})
    })
}

exports.getAllScream=(req,res)=>{
  let screams=[];
  admin.firestore().collection('screams').orderBy('createdAt','desc').get().then(docs=>{
    docs.forEach(doc=>{
      screams.push({...doc.data(),screamId:doc.id})
    })
    res.json(screams)
  })
  .catch(err=>{
    return res.status(500).json({error:err.code})
  })
}

exports.getScream=(req,res)=>{
  let screamDetails={};
  db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc=>{
      if(doc.exists){
        screamDetails=doc.data();
        return db.collection('comments').where('screamId','==',req.params.screamId).orderBy('createdAt','desc').get()
      }
      else return res.status(400).json({error:'U R not authorized'})
    })
    .then(data=>{
      screamDetails.comments=[];
      data.forEach(doc=>{
        screamDetails.comments.push(doc.data())
      })
      return res.json(screamDetails)
    })
    .catch(err=>{
      console.error(err)
      res.status(400).json({error:'Cant get'})
    })
}

exports.commentOnScream=(req,res)=>{
  if(req.body.body.trim()===''){
    return res.status(400).json({comment:'Bad Request'});
  }
  const newComment={
    userHandle:req.user.handle,
    imageUrl:req.user.imageUrl,
    body:req.body.body,
    createdAt:new Date().toISOString(),
    screamId:req.params.screamId
  }
  db.doc(`/screams/${req.params.screamId}`).get()
    .then((doc)=>{
      if(!doc.exists){
        return res.status(400).json({error:'NO such scream'})
      }
      return doc.ref.update({commentCount:doc.data().commentCount+1})
    })
    .then(()=>{
      return db.collection('comments').add(newComment);
    })
    .then(()=>{
      return res.json(newComment)
    })
    .catch((err)=>{
      console.error(err)
      return res.status(400).json({error:"error Posting"})
    })
}

exports.likeScream=(req,res)=>{
  const screamDocument=db.doc(`/screams/${req.params.screamId}`);
  const likeDocument=db.collection('likes').where('userHandle','==',req.user.handle).where('screamId','==',req.params.screamId).limit(1);
  let screamData;

  screamDocument
    .get()
    .then(doc=>{
      if(doc.exists){
        screamData=doc.data()
        screamData.screamId=doc.id
        console.log(screamData)
        return likeDocument.get()
      }
      return res.status(400).json({error:'Scream doesnt exist'})
    })
    .then(data=>{
      if(data.empty){
        return db.collection('likes').add({
          userHandle:req.user.handle,
          screamId:req.params.screamId
        })
        .then(()=>{
          screamData.likeCount++;
          return screamDocument.update({likeCount:screamData.likeCount})
        })
        .then(()=>{
          return res.json(screamData)
        })
      }
      else{
        return res.status(500).json({error:'scream already Liked'})
      }
    })
    .catch(err=>{
      console.error(err);
      return res.json({error:err.code})
    })
}

exports.unlikeScream=(req,res)=>{
  const screamDocument=db.doc(`/screams/${req.params.screamId}`);
  const likeDocument=db.collection('likes').where('userHandle','==',req.user.handle).where('screamId','==',req.params.screamId).limit(1);
  let screamData;

  screamDocument
    .get()
    .then(doc=>{
      if(doc.exists){
        screamData=doc.data()
        screamData.screamId=doc.id
        console.log(screamData)
        return likeDocument.get()
      }
      return res.status(400).json({error:'Scream doesnt exist'})
    })
    .then(data=>{
      if(data.empty){
        return res.status(500).json({error:'scream not Liked'})
      }
      else{
        return db.doc(`/likes/${data.docs[0].id}`).delete()
        .then(()=>{
          screamData.likeCount--;
          return screamDocument.update({likeCount:screamData.likeCount})
        })
        .then(()=>{
          return res.json(screamData)
        })
      }
    })
    .catch(err=>{
      console.error(err);
      return res.json({error:err.code})
    })
}

exports.deleteScream=(req,res)=>{
  console.log(req.user.handle)
  db.doc(`/screams/${req.params.screamId}`).get()
    .then((doc)=>{
      if(!doc.exists){
        return res.status(400).json({error:' NO such scream '})
      }
      if(doc.data().userHandle!==req.user.handle){
        console.log(doc.data().userHandle);
        return res.status(400).json({error:'U R not authorised'})
      }
      return db.collection('screams').doc(`${req.params.screamId}`).delete()
    })
    .then(()=>{
      return res.json({success:'Successfully deleted'})
    })
    .catch((err)=>{
      return res.status(403).json({error:'deletion was not done'})
    })
}
