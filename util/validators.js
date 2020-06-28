
const isEmpty=(stri)=>{
  if(stri.trim()===''){
    return true;}
  else {
    return false;
  }
}

const isEmail=(str)=>{
  const emailRegEx =/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if(str.match(emailRegEx)){
    return true;
  }
  else{
    return false;
  }
}

exports.validateSignup=(data)=>{

  let errors={}
  if(isEmpty(data.email)){
    errors.email='Must not be empty'
  }else if(!isEmail(data.email)){
    errors.email='Not a valid one'
  }
  if(isEmpty(data.password)){
    errors.password='Must not be empty'
  }
  if(data.password!=data.confirmPassword){
    errors.confirmPassword='Must be same'
  }
  if(isEmpty(data.handle)){
    errors.handle='Must not be empty'
  }
  return {valid:Object.keys(errors).length===0?true:false,errors}
}


exports.validateLogin=(data)=>{
  let errors={}
  if(isEmpty(data.email)){
    errors.email='Must not be empty'
  }else if(!isEmail(data.email)){
    errors.email='Not a valid one'
  }
  if(isEmpty(data.password)){
    errors.password='Must not be empty'
  }
  return {valid:Object.keys(errors).length===0?true:false,errors}
}

exports.reduceUser=(data)=>{
  let userCredential={};
  if(!isEmpty(data.bio))userCredential.bio=data.bio;
  if(!isEmpty(data.website)){
    if(data.website.substring(0,4)=='http'){
      userCredential.website=data.website;
    }
    else{
      userCredential.website=`http://${data.website}`
    }
  }
  if(!isEmpty(data.location))userCredential.location=data.location
  return userCredential;
}
