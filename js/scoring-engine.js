
let runs=0, wkts=0, balls=0;

function render(){
  const overs = Math.floor(balls/6) + "." + (balls%6);
  document.getElementById("score").innerText =
    `Score: ${runs}/${wkts} (${overs})`;
}

function addRun(r){
  runs += r;
  balls++;
  render();
}

function wicket(){
  wkts++;
  balls++;
  render();
}

render();
