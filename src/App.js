import { supabase } from "./supabaseClient";
import { updateDB } from "./updateDB";
import List from "jog-list";

//utility functions
const randomNumber = (n) => Math.ceil(Math.random() * n);

function sum(set, practising, count) {
  const y = practising ? count : randomNumber(12);
  const question = Math.random() < 0.5 ? `${set} x ${y} = ` : `${y} x ${set} =`;
  return { question, answer: set * y };
}

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

//calculate functions
const calcPoints = (practising, dailyChallenge, level, score) =>
  practising
    ? level === 1
      ? 3
      : level === 2
      ? 5
      : 7
    : dailyChallenge
    ? 10
    : score;

const calcStreak = (timestamp, streak) =>
  sameDay(new Date(timestamp), new Date()) ? streak : streak + 1;

const calcLevel = (tables, scoresData) =>
  tables
    .map(
      (array) =>
        array.filter((number) =>
          scoresData[number] ? scoresData[number].bestScore > 20 : false
        ).length === 4
    )
    .filter(Boolean).length + 1;

const calcStats = (stats, scoresData, set) => {
  const obj = {
    ...stats,
    [set]: {
      averageTime: (
        (60 * scoresData[set].gamesPlayed) /
        scoresData[set].totalAnswered
      ).toFixed(1),
      averageAccuracy: Math.round(
        (scoresData[set].totalCorrect / scoresData[set].totalAnswered) * 100
      )
    }
  };
  return obj;
};

const calcScoresData = (
  practising,
  dailyChallenge,
  scoresData,
  set,
  score,
  count
) =>
  practising || dailyChallenge
    ? scoresData
    : !scoresData[set]
    ? {
        ...scoresData,
        [set]: {
          bestScore: score,
          totalCorrect: score,
          totalAnswered: count,
          gamesPlayed: 1
        }
      }
    : {
        ...scoresData,
        [set]: {
          bestScore:
            score > scoresData[set].bestScore
              ? score
              : scoresData[set].bestScore,
          totalCorrect: scoresData[set].totalCorrect + score,
          totalAnswered: scoresData[set].totalAnswered + count,
          gamesPlayed: scoresData[set].gamesPlayed + 1
        }
      };

//save functions
const saveStats = (id, stats) => {
  updateDB(id, { stats: JSON.stringify(stats) }).then(() => undefined);
  return stats;
};

const saveStreak = (id, streak) => {
  updateDB(id, { streak, timestamp: Date.now() }).then(() => undefined);
  return streak;
};

const savePoints = (id, points) => {
  updateDB(id, { points }).then(() => undefined);
  return points;
};

const saveLevel = (id, level) => {
  updateDB(id, { level }).then(() => undefined);
  return level;
};

const saveMistakes = (id, mistakes) => {
  updateDB(id, { mistakes: JSON.stringify(mistakes) }).then(() => undefined);
  return mistakes;
};

const saveScoresData = (id, scoresData) => {
  updateDB(id, { scoresData: JSON.stringify(scoresData) }).then(
    () => undefined
  );
  return scoresData;
};

//transformer functions
const finish = (state) => ({
  result: "",
  userAnswer: "",
  scoresData: saveScoresData(
    state.user.id,
    calcScoresData(
      state.practising,
      state.dailyChallenge,
      state.scoresData,
      state.set,
      state.score,
      state.count
    )
  ),
  feedback: state.practising
    ? [
        ...state.feedback,
        "Good Practise! Well Done",
        `Added ${state.level === 1 ? 3 : state.level === 2 ? 5 : 7} points`
      ]
    : state.dailyChallenge
    ? [...state.feedback, `Nice!`, `Added 10 points`]
    : [
        ...state.feedback,
        `You scored ${state.score}!`,
        `${
          state.score > 20
            ? "Amazing! Rank: Green"
            : state.score > 10
            ? "Keep going! Rank: Yellow"
            : "How thick can you get?? Rank: Red"
        }`,
        `Added ${state.score} points`
      ],
  points: savePoints(
    state.user.id,
    state.points +
      calcPoints(
        state.practising,
        state.dailyChallenge,
        state.level,
        state.score
      )
  ),
  streak: saveStreak(state.user.id, calcStreak(state.timestamp, state.streak)),
  count: 1,
  practising: false,
  dailyChallenge: false,
  mistakes: saveMistakes(state.user.id, state.mistakes),
  timestamp: Date.now(),
  ticking: clearInterval(state.ticking)
});

const addStats = (state) => ({
  stats: saveStats(
    state.user.id,
    calcStats(state.stats, state.scoresData, state.set)
  )
});

const updateLevel = (state) => ({
  level: saveLevel(state.user.id, calcLevel(state.tables, state.scoresData))
});
//main body of the app
const App = (state) => state.HTML`
<div>
  ${
    state.viewStats
      ? Stats(state)
      : state.playing
      ? state.feedback.length
        ? Feedback(state)
        : Game(state)
      : Home(state)
  }
  </div>`;

const Stats = (state) => {
  const returnArr = (obj) => Object.entries(obj);
  return state.HTML`
<ul class="stats">${returnArr(state.stats).map(
    ([number, stats], index, array) => state.HTML`
  <li>
  <h2>${number}</h2>
  <p>Average Time: ${stats.averageTime}s </p>
  <p>Average Accuracy: ${stats.averageAccuracy}%</p>
  <p>Best Score: ${state.scoresData[number].bestScore}</p>
  </li>`
  )}
  </ul>
<ul>
<button onclick=${(e) => state.Update({ viewStats: false })}>RETURN</button>`;
};

const Feedback = (state) => {
  const nextFeedback = (event) =>
    state.Update({
      feedback: state.feedback.slice(1),
      playing: state.feedback.slice(1).length ? true : false
    });

  return state.HTML`<div id="feedback">
        <h2>${state.feedback[0]}</h2>
        <button alt="close" onclick=${nextFeedback}>Next</button></div>`;
};

const Home = (state) => {
  const startPlay = (number, practising, mistakes) => (event) => {
    const setMistakes = mistakes.filter(
      (obj) => obj.question.split` `[0] === String(number)
    );
    const currentMistake = List.pickRandom(setMistakes);
    state.Update(
      {
        playing: true,
        practising: practising,
        score: 0,
        set: number,
        count: 1
      },
      setMistakes.length
        ? { question: currentMistake.question, answer: currentMistake.answer }
        : { ...sum(number, practising, 1) },
      practising
        ? {}
        : {
            time: 60,
            ticking: setInterval(
              () =>
                state.Update((state) =>
                  state.time
                    ? { time: state.time - 1 }
                    : state.Update(finish, addStats, updateLevel)
                ),
              1000
            )
          }
    );
    document.getElementById("answer").focus();
  };


  const challenge = (mistakes, recents, statsArray) => (event) => {
    const times = statsArray.map(([set, object]) => object.averageTime);
    const accuracies = statsArray.map(
      ([set, object]) => object.averageAccuracy
    );
    const worstTime = times.sort((a, b) => b - a)[0];
    const worstAccuracy = accuracies.sort((a, b) => a - b)[0];
    const p = Math.random();
    const r =
      p < 0.25 && accuracies.length
        ? sum(accuracies.indexOf(worstAccuracy) + 1, false, state.count)
        : p < 0.5 && mistakes.length
        ? List.pickRandom(mistakes)
        : p < 0.75 && times.length
        ? sum(times.indexOf(worstTime) + 1, false, state.count)
        : sum(List.pickRandom(recents.flat(), false, state.count));
    state.Update({
      question: r.question,
      answer: r.answer,
      playing: true,
      dailyChallenge: true,
      score: 0,
      time: 120,
      count: 1,
      ticking: setInterval(
        () =>
          state.Update((state) =>
            state.time ? { time: state.time - 1 } : state.Update(finish)
          ),
        1000
      )
    });
    document.getElementById("answer").focus();
  };

  return state.HTML`
  <button id="challengeButton" onclick=${challenge(
    state.mistakes,
    state.tables.slice(0, state.level),
    Object.entries(state.stats)
  )} >Challenge<b>🏅</b></button>

  ${state.tables.map(
    (set, index) => state.HTML`<h2>${
      state.level < index + 1 ? "🔒" : ""
    }Level ${index + 1}</h2> 
  <ul class=${`${
    state.level < index + 1 ? "locked" : "unlocked"
  } tables`}>${set.map(
      (number) => state.HTML`
  <li>
  <div class=${
    state.scoresData[number]
      ? state.scoresData[number].bestScore > 20
        ? "green"
        : state.scoresData[number].bestScore > 10
        ? "yellow"
        : "red"
      : "red"
  } id=${state.level < index + 1}>${number}</div>
  <button class="practising" onclick=${startPlay(
    number,
    false,
    state.mistakes
  )} ?disabled=${state.level < index + 1}>PLAY</button>
  <button class="practising" onclick=${startPlay(
    number,
    true,
    state.mistakes
  )} ?disabled=${state.level < index + 1}>PRACTISE</button>
  </li>`
    )}
  </ul>
  
  `
  )}
  `;
};

const Game = (state) => {
  const challenge = (mistakes, recents, statsArray) => {
    const times = statsArray.map(([set, object]) => object.averageTime);
    const accuracies = statsArray.map(
      ([set, object]) => object.averageAccuracy
    );
    const worstTime = times.sort((a, b) => a - b)[0];
    const worstAccuracy = accuracies.sort((a, b) => a - b)[0];
    const p = Math.random();
    const r =
      p < 0.25 && accuracies.length
        ? sum(accuracies.indexOf(worstAccuracy) + 1, false, state.count)
        : p < 0.5 && mistakes.length
        ? List.pickRandom(mistakes)
        : p < 0.75 && times.length
        ? sum(times.indexOf(worstTime) + 1, false, state.count)
        : sum(List.pickRandom(recents.flat(), false, state.count));
    return { question: r.question, answer: r.answer };
  };

  const acceptAnswer = (event) => {
    event.preventDefault();
    const ans = Number(event.target.name.value);
    const checkAnswer = ans === state.answer;
    const mistakeBefore = state.mistakes.filter(
      (obj) => obj.question === state.question
    )[0];
    const setMistakes = state.mistakes.filter(
      (obj) => obj.question.split` `[0] === String(state.set)
    );
    const currentMistake = List.pickRandom(setMistakes);
    if (event.target.name.value === "") return;
    state.Update(
      { userAnswer: event.target.name.value },
      checkAnswer
        ? {
            result: "✅",
            score: state.score + 1,
            mistakes: mistakeBefore
              ? mistakeBefore.count === 1
                ? state.mistakes.filter(
                    (obj) => obj.question !== state.question
                  )
                : state.mistakes.map((obj) =>
                    obj.question === state.question
                      ? { ...obj, count: obj.count - 1 }
                      : obj
                  )
              : state.mistakes
          }
        : {
            result: "❌",
            mistakes: mistakeBefore
              ? state.mistakes.map((obj) =>
                  obj.question === state.question
                    ? { ...obj, count: obj.count + 3 }
                    : obj
                )
              : [
                  ...state.mistakes,
                  { question: state.question, answer: state.answer, count: 3 }
                ]
          }
    );
    setTimeout(
      () =>
        state.Update(
          state.practising && state.count > 11
            ? state.Update(finish)
            : state.dailyChallenge
            ? {
                ...challenge(
                  state.mistakes,
                  state.tables.slice(0, state.level),
                  Object.entries(state.stats)
                ),
                userAnswer: "",
                result: "",
                count: state.count + 1
              }
            : (setMistakes.length > 0 &&
                setMistakes.length < 4 &&
                state.time > 50) ||
              (setMistakes.length > 3 &&
                setMistakes.length < 9 &&
                state.time > 40) ||
              (setMistakes.length > 8 && state.time > 30)
            ? {
                question: currentMistake.question,
                answer: currentMistake.answer,
                userAnswer: "",
                result: "",
                count: state.count + 1
              }
            : {
                ...sum(state.set, state.practising, state.count + 1),
                userAnswer: "",
                result: "",
                count: state.count + 1
              }
        ),
      700
    );
    event.target.answer.value = "";
  };

  return state.HTML`
${
  state.practising
    ? ``
    : state.HTML`<h2>SCORE: ${state.score}</h2><h2>TIME: ${state.time}</h2>`
}
<div id="question"><div id="count">${state.count})</div><div id="sum">${
    state.question
  }</div><div id="userAnswer">${state.userAnswer}</div><div id="result">${
    state.result
  }</div></div>
  <form id="answerForm" autocomplete="off" onsubmit = ${acceptAnswer}>
    <input type="text" name ="name" id ="answer">
    <button type="submit">Enter</button> 
  </form>`;
};

export default App;
