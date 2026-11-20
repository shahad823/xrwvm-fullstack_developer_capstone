import React, { useEffect, useState } from "react";
import "../assets/style.css";
import "../assets/bootstrap.min.css";
import { authRequest, session } from "../../auth";

export default function Header() {
  const [username,setUsername] = useState("");
  const [error,setError] = useState("");
  useEffect(()=>{session().then(data=>setUsername(data.userName)).catch(()=>setError("Session status unavailable."));},[]);
  const logout = async event => {
    event.preventDefault();
    try {await authRequest("/djangoapp/logout",{});sessionStorage.removeItem("username");window.location.assign("/");}
    catch(failure){setError(failure.message);}
  };
  return <header style={{backgroundColor:"darkturquoise",padding:"22px 5%",display:"flex",flexWrap:"wrap",alignItems:"center",gap:24}}>
    <a href="/" style={{fontSize:27,fontWeight:700,color:"#102b3c"}}>Best Cars</a>
    <nav aria-label="Main navigation" style={{display:"flex",flexWrap:"wrap",gap:22,flex:1}}>
      <a href="/">Home</a><a href="/dealers">Dealerships</a><a href="/about/">About Us</a><a href="/contact/">Contact Us</a>
    </nav>
    <div id="loginlogout" style={{display:"flex",gap:18}}>
      {username ? <><span>{username}</span><a href="/djangoapp/logout" onClick={logout}>Logout</a></> : <><a href="/login/">Login</a><a href="/register/">Register</a></>}
    </div><span role="alert">{error}</span>
  </header>;
}

