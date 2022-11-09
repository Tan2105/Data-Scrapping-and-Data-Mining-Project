// node worldcup.js --excel=WorldCup.xls --data=worldcup --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results

let minimist = require("minimist");
let axios = require("axios");
let  jsdom = require("jsdom");
let excel = require("excel4node");
let pdf= require("pdf-lib");
let fs= require("fs");
let path= require("path");

let args = minimist(process.argv);  

let promise=axios(args.source);
promise.then(function(response){
    let html = response.data;
    
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;
    
    let matches= [];
    let matchinfo = document.querySelectorAll("div.match-score-block");
    for(let i=0; i<matchinfo.length; i++)
    {
        let match = {
            t1: "",
            t2: "",
            t1s: "",
            t2s: "",
            result: ""
        };
        let myteam = matchinfo[i].querySelectorAll("div.name-detail > p.name");
        match.t1 = myteam[0].textContent;
        match.t2 = myteam[1].textContent;

        let myscore = matchinfo[i].querySelectorAll("div.score-detail > span.score");
        
        if(myscore.length == 2){
        match.t1s = myscore[0].textContent;
        match.t2s = myscore[1].textContent;
        }
        else if(myscore.length == 1){
            match.t1s = myscore[0].textContent;
            match.t2s = ""; 
        }
        else{
            match.t1s = "";
            match.t2s = ""; 
        }
        let myresult = matchinfo[i].querySelector("div.status-text > span");
        match.result = myresult.textContent; 
        matches.push(match);      
    }
        
    let matchesjson = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesjson, "utf-8");

    let teams = [];
    for(let i=0; i<matches.length; i++)
    {
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t1);
        addTeamToTeamsArrayIfNotAlreadyThere(teams, matches[i].t2);
        
    }

    for(let i=0; i<matches.length; i++)
    {
        addMatchToSpecificTeam(teams, matches[i].t1, matches[i].t2, matches[i].t1s, matches[i].t2s, matches[i].result);
        addMatchToSpecificTeam(teams, matches[i].t2, matches[i].t1, matches[i].t2s, matches[i].t1s, matches[i].result);
    }

    let teamsjson = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamsjson, "utf-8");

    preparexcel(teams, args.excel);
    preparefolders(teams, args.data);
})

function preparefolders(teams, data)
{
    fs.mkdirSync(data);
    
    for(let i=0; i<teams.length; i++)
    {
        let teamfoldername = path.join(data, teams[i].name);
        if(fs.existsSync(teamfoldername) == false)
        {
            fs.mkdirSync(teamfoldername);
        }
        for(let j=0; j<teams[i].matches.length; j++)
        {
            let match=teams[i].matches[j];
            createscorecardpdf(teamfoldername, match);
        }

    }
}

function createscorecardpdf(teamfoldername, match)
{
    let matchfile = path.join(teamfoldername, match.vs + ".pdf");
    let temp = fs.readFileSync("Template.pdf");
    let pdfdocprom = pdf.PDFDocument.load(temp);
    pdfdocprom.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);
        page.drawText(match.vs,{
            x:300,
            y:630,
            size:12
        });
        page.drawText(match.selfScore,{
                x:300,
                y:600,
                size:12
            });
            page.drawText(match.oppScore,{
                x:300,
                y:570,
                size:12
            });
            page.drawText(match.result,{
                x:280,
                y:535,
                size:12
            });

        let changedbytesprom = pdfdoc.save();
        changedbytesprom.then(function(changedbytes){
            fs.writeFileSync(matchfile,changedbytes);
        })
            
    })
}

function preparexcel(teams, filename)
{
    let wb= new excel.Workbook();
    for(let i=0; i<teams.length; i++)
    {
        let sheets = wb.addWorksheet(teams[i].name);

        sheets.cell(1,1).string("Vs");
        sheets.cell(1,2).string("Selfscore");
        sheets.cell(1,3).string("Oppscore");
        sheets.cell(1,4).string("Result");
        
        for(let j=0; j<teams[i].matches.length; j++)
        {
            sheets.cell(2 + j,1).string(teams[i].matches[j].vs);
            sheets.cell(2 + j,2).string(teams[i].matches[j].selfScore);
            sheets.cell(2 + j,3).string(teams[i].matches[j].oppScore);
            sheets.cell(2 + j,4).string(teams[i].matches[j].result);
        }
    }
     wb.write(filename);
}

function addTeamToTeamsArrayIfNotAlreadyThere(teams, teamname)
{
    let t1idx = -1;
    for(let i=0; i<teams.length; i++)
    {
        if(teams[i].name == teamname)
        {
            t1idx = i;
            break;
        }
    }
        if(t1idx == -1)
        {
            teams.push({
                name : teamname,
                matches : []
            })
        }
    }
    
     
    function addMatchToSpecificTeam(teams, hometeam, oppteam, selfscore, oppscore, result){
        let idx = -1;
        for(let i = 0; i<teams.length; i++)
        {
            if(teams[i].name == hometeam)
            {
                idx = i;
                break;
            }
        }
        let team = teams[idx];
        team.matches.push({
        vs: oppteam,
        selfScore: selfscore,
        oppScore: oppscore,
        result: result
        })
    }
 