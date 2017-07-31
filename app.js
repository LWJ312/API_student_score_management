let express = require('express');
let app = express();
let bodyParser = require('body-parser');



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended:true
}));

const redis=require('redis');
const client=redis.createClient();


app.get('/', function (req, res) {
    let currentCount=0;
    client.get("accessCount",function (err,reply) {
        if(reply==undefined){
            client.set("accessCount",1,redis.print);
            res.send(`${currentCount+1}`)
        }
        else{
            currentCount=parseInt(reply);
            client.set("accessCount",currentCount+1,redis.print);
            res.send(`${currentCount+1}`);
        }
    })
});

app.post('/add-anything',function (req,res) {
    let data=req.body;
    res.send(data);
});

app.post('/student',function (req,res) {
    let data=req.body;
    if(InfoCheckAndInput(data)){
        client.hmset(data.studyNumber,data,redis.print);
        res.send('录入成功');
    }
    else{
        res.status(404).send("请按正确的格式输入（格式：姓名, 学号, 民族, 班级, 学科: 成绩, ...）");
    }
});
//判断录入时输入格式是否正确
function InfoCheckAndInput(information) {
    if (information.studyNumber.charAt(0) != 'U' || parseFloat(information.mathGrade).toString() != information.mathGrade || parseFloat(information.chineseGrade).toString() != information.chineseGrade|| parseFloat(information.englishGrade).toString() != information.englishGrade || parseFloat(information.programGrade).toString() != information.programGrade) {
        return false;
    }
    else {
        let average=calculatePer(information).average;
        let total=calculatePer(information).total;
        information.average=average;
        information.total=total;
        return true;
    }
}
function calculatePer(information) {
    let total=parseInt(information.mathGrade)+parseInt(information.chineseGrade)+parseInt(information.englishGrade)+parseInt(information.programGrade);
    let average=total/4;
    return{
        average,
        total}
}

app.get("/students",function (req,res) {
    let check=1;
    let result={};
    let TotalArray=[];
    let params=req.query.studyNumbers;
    let studyNumbers=StudyNumberCheckAndOutput(params);

    if(!!studyNumbers) {
        for(let sn of studyNumbers) {
            client.hgetall(`${sn}`,function (error,reply) {
                if(!!reply){
                    client.hgetall(`${sn}`,function (error,reply) {
                        result[sn]=JSON.stringify(reply);
                        TotalArray.push(parseFloat(reply.total));
                        if(studyNumbers.indexOf(sn)===studyNumbers.length-1){
                            result.ave=classCondition(TotalArray).allAverage;
                            result.mid=classCondition(TotalArray).mid;
                            if(check===0) res.send('！！！输入了不存在的学号');
                            else res.send(result);
                        }
                    });
                }
                else {
                    check=0;
                    if(studyNumbers.indexOf(sn)===studyNumbers.length-1){
                        res.send('！！！输入了不存在的学号');
                    }
                }
            });
        }
    }
    else{
        res.status(404).send('请按正确的格式输入要打印的学生的学号（格式： 学号, 学号,…）');
    }
});
//判断查询时输入格式是否正确
function StudyNumberCheckAndOutput(params) {
    let studyNumbers=params.split(",");
    let check=1;

    for(let sn of studyNumbers){
        if(sn.charAt(0)!='U') check=0;
    }
    if(check==0) return false;
    else return studyNumbers;
}
function classCondition(Achieve=[]) {
    let classtotal=0;
    let mid;
    let k;
    for(let a of Achieve){
        classtotal+=a;
    }
    let allAverage=classtotal/Achieve.length;

    //冒泡排序；
    for(let i=0;i<Achieve.length-1;i++){
        for(let j=i+1;j<Achieve.length;j++){
            if(Achieve[i]>Achieve[j])
            {k=Achieve[i];
                Achieve[i]=Achieve[j];
                Achieve[j]=k;}
        }
    }
    if(Achieve.length%2==1) mid=Achieve[(Achieve.length-1)/2];
    else mid=(Achieve[Achieve.length/2-1]+Achieve[Achieve.length/2])/2;

    return{
        allAverage,
        mid}
}

app.put("/students/:id",function (req,res) {
 let newData=req.body;
 let result={};
 client.hgetall(req.params.id,function (error,reply) {
     if(!!reply){
         if(InfoCheckAndInput(newData)){
             client.del(req.params.id);
             client.hmset(newData.studyNumber,newData,redis.print);
             client.hgetall(`${newData.studyNumber}`,function (err,reply) {
                 result[`${newData.studyNumber}`]=reply;
                 res.send(result);
             })
         }
         else{
             res.status(404).send("请按正确的格式修改（格式：姓名, 学号, 民族, 班级, 学科: 成绩, ...）");
         }
     }
     else{
         res.status(404).send('该学生不存在!');
     }
 });
});

app.delete("/students/:id",function (req,res) {
    client.hgetall(req.params.id, function (error, reply) {
        if(!!reply){
            client.del(req.params.id);
            res.send('该学生已成功删除');
        }
        else{
            res.status(404).send('该学生不存在!');
        }
    });
});

app.listen(9999);
