import React, { useState } from "react";
import "./Login.css";
import Header from "../Header/Header";
import { authRequest } from "../../auth";

export default function Login() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const login = async event => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await authRequest("/djangoapp/login", {userName, password});
      sessionStorage.setItem("username", data.userName);
      window.location.assign("/");
    } catch (failure) {setError(failure.message); setBusy(false);}
  };
  return <><Header/><main style={{maxWidth:500, margin:"45px auto", padding:24}}>
    <h1>Welcome back</h1><p>Sign in to your Best Cars account.</p>
    <form onSubmit={login}>
      <label htmlFor="login-user" style={{display:"block"}}>Username</label>
      <input id="login-user" className="input_field" style={{margin:"8px 0 20px",width:"100%"}} autoComplete="username" required value={userName} onChange={e=>setUserName(e.target.value)}/>
      <label htmlFor="login-password" style={{display:"block"}}>Password</label>
      <input id="login-password" className="input_field" style={{margin:"8px 0 20px",width:"100%"}} type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
      <p role="alert" style={{color:"#a12727"}}>{error}</p>
      <button type="submit" className="action_button" disabled={busy}>{busy ? "Signing in..." : "Login"}</button>
      <a href="/">Cancel</a>
    </form><p>New to Best Cars? <a href="/register/">Register Now</a></p>
  </main></>;
}

