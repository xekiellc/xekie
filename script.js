/* -----------------------------
XEKIE MAIN SCRIPT
----------------------------- */

/* SUPABASE CONNECTION */

const SUPABASE_URL = "https://jlcrarqiyejgjbdesxik.supabase.co";
const SUPABASE_KEY = "sb_publishable_fCKM-ACI_E7K9-lflnwN-Q__Two4qgq";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

console.log("Supabase connected");


/* TIME AGO */

function timeAgo(timestamp){

  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);

  const intervals = [
    { label:"year", seconds:31536000 },
    { label:"month", seconds:2592000 },
    { label:"day", seconds:86400 },
    { label:"hour", seconds:3600 },
    { label:"minute", seconds:60 }
  ];

  for(const interval of intervals){

    const count = Math.floor(seconds / interval.seconds);

    if(count >= 1){

      return count + " " + interval.label + (count > 1 ? "s" : "") + " ago";

    }

  }

  return "just now";

}


/* LOAD XEKIES FROM SUPABASE */

async function loadXekies(){

  const { data, error } = await supabase
    .from("xekies")
    .select("*")
    .order("created_at", { ascending:false });


  if(error){

    console.error("Error loading XEKIEs:", error);

    return;

  }

  const feed = document.getElementById("xekie-feed");

  if(!feed) return;

  feed.innerHTML = "";


  data.forEach(xekie => {

    const card = document.createElement("div");

    card.className = "xekie-card";

    const postedTime = timeAgo(xekie.created_at);

    card.innerHTML = `

      <h3>${xekie.title}</h3>

      <p>${xekie.description}</p>

      <p><strong>Budget:</strong> $${xekie.budget}</p>

      <p><strong>Location:</strong> ${xekie.location}</p>

      <p>⏱ Posted ${postedTime}</p>

      <hr>

    `;

    feed.appendChild(card);

  });

}


/* AUTO LOAD */

document.addEventListener("DOMContentLoaded", function(){

  loadXekies();

  setInterval(loadXekies, 10000);

});
