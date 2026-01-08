
import { ballsToOvers } from "./utils.js";

export function newInnings({battingTeam, bowlingTeam, oversLimit}){
  return {
    battingTeam, bowlingTeam,
    oversLimit: oversLimit ?? 20,
    balls: [], // array of ball objects
    score: { runs:0, wkts:0, balls:0, extras:{wd:0,nb:0,b:0,lb:0,pen:0} },
    bat: {},   // playerId -> stats
    bowl: {},  // playerId -> stats
    fow: [],   // {runs,wkts,overStr,playerOut}
    strike: { striker:null, nonStriker:null, bowler:null }
  };
}

function ensureBat(inn, pid){
  if(!inn.bat[pid]){
    inn.bat[pid] = { runs:0, balls:0, fours:0, sixes:0, out:false, howOut:"", bowler:null, fielder:null };
  }
  return inn.bat[pid];
}
function ensureBowl(inn, pid){
  if(!inn.bowl[pid]){
    inn.bowl[pid] = { balls:0, runs:0, wkts:0, maidens:0, wides:0, noballs:0 };
  }
  return inn.bowl[pid];
}

export function applyBall(inn, ball){
  // ball: {runsOffBat, extras:{wd,nb,b,lb,pen}, wicket:{kind,playerOut,fielder}, striker, nonStriker, bowler}
  const ex = ball.extras || {};
  const wd = +ex.wd||0, nb=+ex.nb||0, b=+ex.b||0, lb=+ex.lb||0, pen=+ex.pen||0;
  const batRuns = +ball.runsOffBat||0;
  const totalRuns = batRuns + wd + nb + b + lb + pen;

  // update team score
  inn.score.runs += totalRuns;
  inn.score.extras.wd += wd;
  inn.score.extras.nb += nb;
  inn.score.extras.b += b;
  inn.score.extras.lb += lb;
  inn.score.extras.pen += pen;

  // legal ball?
  const isLegal = (wd===0 && nb===0); // wides & noballs not legal deliveries
  if(isLegal){
    inn.score.balls += 1;
  }

  // batter stats (off bat only, and only if legal or nb counts ball? In cricket NB doesn't count as legal ball for balls faced.
  const strikerId = ball.striker;
  if(strikerId){
    const bs = ensureBat(inn, strikerId);
    // ball faced: legal delivery OR no-ball? In standard, no-ball still counts as a ball faced if bat is hit? Actually striker ball faced counts on no-ball (delivery faced), but over ball count doesn't. We'll count balls faced for striker on any delivery except wide. That's common scorecards.
    const faced = (wd===0) ? 1 : 0;
    bs.balls += faced;
    bs.runs += batRuns;
    if(batRuns===4) bs.fours += 1;
    if(batRuns===6) bs.sixes += 1;
  }

  // bowler stats: all runs except byes/legbyes? Actually bowler conceded includes byes/legbyes? No. Bowler conceded includes bat + wides + noballs + penalty; byes/legbyes not charged.
  const bowlerId = ball.bowler;
  if(bowlerId){
    const bl = ensureBowl(inn, bowlerId);
    bl.runs += batRuns + wd + nb + pen;
    bl.wides += wd;
    bl.noballs += nb;
    if(isLegal) bl.balls += 1;
  }

  // wicket
  if(ball.wicket && ball.wicket.kind && ball.wicket.playerOut){
    inn.score.wkts += 1;
    const outId = ball.wicket.playerOut;
    const outStats = ensureBat(inn, outId);
    outStats.out = true;
    outStats.howOut = ball.wicket.kind;
    outStats.bowler = bowlerId || null;
    outStats.fielder = ball.wicket.fielder || null;

    // bowler gets wicket? Not for run out/retired hurt/obstructing etc. We'll award for most kinds except Run Out
    if(bowlerId && !/run\s*out/i.test(ball.wicket.kind)){
      const bl = ensureBowl(inn, bowlerId);
      bl.wkts += 1;
    }

    inn.fow.push({ runs: inn.score.runs, wkts: inn.score.wkts, overStr: ballsToOvers(inn.score.balls), playerOut: outId });
  }

  inn.balls.push({ ...ball, timestamp: Date.now(), totalRuns, isLegal });

  // strike rotation: based on runs taken off bat + byes + legbyes on that delivery (not wides). For simplicity: if wd>0, no change unless they ran byes on wide (not tracked). We'll rotate on (batRuns + b + lb) odd and legal-or-nb. 
  const runForRotation = batRuns + b + lb;
  const rotate = (runForRotation % 2 === 1) && (wd===0); // wides ignored
  if(rotate){
    const tmp = inn.strike.striker;
    inn.strike.striker = inn.strike.nonStriker;
    inn.strike.nonStriker = tmp;
  }

  // end of over rotation on legal ball completion
  if(isLegal && (inn.score.balls % 6 === 0)){
    const tmp = inn.strike.striker;
    inn.strike.striker = inn.strike.nonStriker;
    inn.strike.nonStriker = tmp;
  }

  return inn;
}

export function inningsComplete(inn){
  const ovLimitBalls = (inn.oversLimit||20) * 6;
  return inn.score.wkts >= 10 || inn.score.balls >= ovLimitBalls;
}
