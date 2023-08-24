//imports
import { supabase } from "./supabaseClient";
import DB from "./index";
import { updateDB } from "./updateDB";

//utility functions
const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const resetStreak = (streak, timestamp) => {
  const n =
    sameDay(new Date(timestamp), new Date(Date.now() - 1000 * 3600 * 24)) ||
    sameDay(new Date(timestamp), new Date())
      ? streak
      : 0;
  return n;
};

//saving functions
const saveStreak = (id, streak) => {
  updateDB(id, { streak, timestamp: Date.now() }).then(() => undefined);
  return streak;
};

//entire authentication function as a screen that can be used in View
export default function Auth(state) {
  //log in event handler - defined by supabase
  const handleLogin = (event) => {
    event.preventDefault();
    //inbuilt supabase method of authentication
    supabase.auth
      .signInWithPassword({
        email: event.target.email.value,
        password: event.target.password.value
      })
      //pull data from DB
      .then(({ data: { session } }) => {
        if (session) {
          supabase
            .from("profiles")
            .select(DB.join`,`)
            .eq("id", session.user.id)
            .then(({ data }) => {
              state.Update({ user: session.user, ...data[0] }, (state) => ({
                streak: saveStreak(
                  state.user.id,
                  resetStreak(data[0].streak, data[0].timestamp)
                ),
                mistakes: JSON.parse(data[0].mistakes),
                scoresData: JSON.parse(data[0].scoresData),
                stats: JSON.parse(data[0].stats),
                mistakeLogIn: false
              }));
            });
        } else {
          state.Update({ mistakeLogIn: true });
        }
      })
      .then(() =>
        supabase.auth.onAuthStateChange((event, session) => {
          state.Update({ login: true, user: session && session.user });
        })
      )
      //catching and showing an error
      .catch((e) => alert(e));
  };
  //event handler for signing up (new user)
  const handleSignUp = async (event) => {
    event.preventDefault();
    //inbuilt supabase method to create a user
    supabase.auth
      .signUp({
        email: event.target.email.value,
        password: event.target.password.value
      })
      .then(({ data: { session } }) => {
        if (session) {
          supabase
            .from("profiles")
            .select(DB.join`,`)
            .eq("id", session.user.id)
            .then(({ data }) =>
              state.Update(
                {
                  user: session.user,
                  ...data[0]
                },
                (state) => ({
                  streak: saveStreak(
                    state.user.id,
                    resetStreak(data[0].streak, data[0].timestamp)
                  ),
                  mistakes: JSON.parse(data[0].mistakes),
                  scoresData: JSON.parse(data[0].scoresData),
                  stats: JSON.parse(data[0].stats)
                })
              )
            );
        }
      })
      .then(() =>
        supabase.auth.onAuthStateChange((event, session) => {
          state.Update({ login: true, user: session && session.user });
        })
      )
      .catch((e) => alert(e));
  };

  return state.HTML`
  <div>
  ${
    //allows two different screens for log in and sign up
    state.login
      ? state.HTML`
      <h3>Login below:</h3>
      ${
        state.mistakeLogIn
          ? state.HTML`<h4>EMAIL OR PASSWORD INCORRECT</h4>`
          : ""
      }
      <form onsubmit=${handleLogin}>
    <label for="email">Email:</label>
    <input
      id="email"
      name="email"
      type="email"
      placeholder="Your email"
    >
    <label for="password">Password:</label>
    <input
      id="password"
      name="password"
      type="password"
      placeholder="Your password"
    >
    <button class="button block" aria-live="polite">Login
    </button>
  </form>
  <p><a href="#" onclick=${(e) =>
    state.Update({
      login: false
    })}>Click here to sign up for an account</a></p>`
      : state.HTML`
<h3>Sign up below:</h3>
        <form onsubmit=${handleSignUp}>
            <label for="email">Email:</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Your email"
            >
            <label for="password">Password:</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Your password"
            >
            <button class="button block" aria-live="polite">Sign Up
            </button>
          </form>
          <p><a href="#" onclick=${(e) =>
            state.Update({ login: true })}>Click here to log in</a></p>
        `
  }</div>`;
}
