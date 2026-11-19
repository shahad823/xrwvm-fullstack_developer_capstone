import React, { useState } from "react";
import "./Register.css";
import Header from "../Header/Header";
import { authRequest } from "../../auth";

export default function Register() {
  const [fields, setFields] = useState({userName:"", firstName:"", lastName:"", email:"", password:""});
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const register = async event => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      const data = await authRequest("/djangoapp/register", fields);
      sessionStorage.setItem("username",data.userName);
      window.location.assign("/");
    } catch (failure) {setError(failure.message);setBusy(false);}
  };
  const inputs=[["userName","Username","text","username"],["firstName","First Name","text","given-name"],["lastName","Last Name","text","family-name"],["email","Email","email","email"],["password","Password","password","new-password"]];
  return <><Header/><main style={{maxWidth:540,margin:"35px auto",padding:24}}>
    <h1>Create your account</h1><p>Join Best Cars to begin your next journey.</p>
    <form onSubmit={register}>
      {inputs.map(([name,label,type,autoComplete])=><div key={name}>
        <label htmlFor={name} style={{display:"block"}}>{label}</label>
        <input id={name} name={name} type={type} autoComplete={autoComplete} className="input_field" style={{margin:"5px 0 14px",width:"100%"}} required minLength={name==="password"?8:undefined} value={fields[name]} onChange={e=>setFields({...fields,[name]:e.target.value})}/>
      </div>)}
      <p style={{fontSize:14}}>Use at least 8 characters. Avoid common or entirely numeric passwords.</p>
      <p role="alert" style={{color:"#a12727"}}>{error}</p>
      <button type="submit" className="action_button" disabled={busy}>{busy ? "Creating account..." : "Register"}</button>
      <a href="/">Cancel</a>
    </form><p>Already registered? <a href="/login/">Login</a></p>
  </main></>;
}

