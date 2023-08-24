//imports
import "./styles.css";
import Nanny from "nanny-state";
import { supabase } from "./supabaseClient";
import App from "./App";
import Auth from "./Auth";

//home screen
const View = (state) => state.HTML`
<div>
<header>
${
  state.user
    ? state.HTML`
    <div id="info">
      <div class="info">${
        //generate username dynamically
        state.user.email.split("@")[0]
      } 
      <button onclick=${() => supabase.auth.signOut()}>Log Out</button></div>
      <div class="info">🔥 ${state.streak}</div>
      <div class="info">⭐ ${state.points}</div>
      <div class="info">📊<button onclick=${(e) =>
        state.Update({ viewStats: true })}> Stats</button></div>
    </div>`
    : ""
}
      <h1><span class="highlight">T</span>ime<span class="highlight">X</span></h1>
      <h2>${state.message}</h2>
    </header>
    <main>
    ${state.user ? App(state) : Auth(state)}
    </main><footer><small>Made by OG</small></footer></div>`;

const State = {
  practising: false,
  playing: false,
  dailyChallenge: false,
  viewStats: false,
  login: true,
  time: null,
  message: "Master Your Times Tables",
  tables: [
    [1, 2, 5, 10],
    [3, 4, 9, 11],
    [6, 7, 8, 12]
  ],
  count: 1,
  feedback: [],
  stats: {},
  scoresData: {},
  mistakes: [],
  View,
  Debug: false
};

const DB = [
  "points",
  "streak",
  "level",
  "mistakes",
  "timestamp",
  "scoresData",
  "stats"
];

supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    supabase
      .from("profiles")
      .select(DB.join`,`)
      .eq("id", session.user.id)
      .then(({ data }) => {
        Nanny({
          ...State,
          user: session.user,
          ...data[0],
          mistakes: JSON.parse(data[0].mistakes),
          scoresData: JSON.parse(data[0].scoresData),
          stats: JSON.parse(data[0].stats)
        });
      });
  } else Nanny(State);
});

export default DB;
