const express = require('express');
const cors = require('cors');
const firebaseConfig = require('./firebase-config.js');

const app = express();
const port = 5000;

const admin = require('firebase-admin');
const serviceAccount = require("./serviceAccountKey.json");

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, onValue, set, update } = require('firebase/database');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// const adminAuth = getAuth(firebaseApp);

initializeApp(firebaseConfig);
const db = getDatabase();

const auth = getAuth();

const requireAuth = async (req, res, next) => {
    try{
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new Error('Unauthorized');
        }
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        next();
    }catch(error){
        res.status(401).json({ error: 'Unauthorized' });
    }
}

const generateRandomId = () =>{
    let id = (Math.random() + 1).toString(36);
    return id.substring(2);
}

app.use(cors());
app.use(express.json())

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
});

app.get('/',(req,res) => {
    res.send('Hello World Second time111');
})

app.post('/register', (req, res) =>{
    if(!req.body["password"].match("/^[A-Za-z]\w{7,14}$/")){
        res.send("Password can only contain characters, numeric digits, underscore, first character must be letter and length should be 7 to 16.");
    }
    createUserWithEmailAndPassword(auth, req.body["email"], req.body["password"])
    .then((userCredential) =>{
        res.send(userCredential);
    })
    .catch((error)=>{
        console.log(error.message);
    })
})

app.post('/login', async (req, res)=>{
    await signInWithEmailAndPassword(auth, req.body["email"], req.body["password"])
    .then((userCredential) =>{
        res.send(userCredential);
        console.log(userCredential.user.stsTokenManager.accessToken);
    })
    .catch((error)=>{
        console.log(error.message);
    });
})

app.get('/appointments', requireAuth, (req, res) =>{
    const data = ref(db, 'appointments/');
    onValue(data, (snapshot)=>{
        const d = snapshot.val();
        res.send(d);
    })
})

app.post('/appointments', requireAuth, (req, res) =>{
    const id = generateRandomId();
    const firstName = req.body["first name"];
    const lastName = req.body["last name"];
    const date = req.body["date"];
    const time  = req.body["time"];

    const data = {"first name": firstName, "last name": lastName, "date": date, "time": time};

    const jsonObject = {};
    jsonObject[id] = data;
    console.log(jsonObject);

    update(ref(db, 'appointments/'), jsonObject);
    res.send(jsonObject);
})

app.get('/appointments/:id', requireAuth, async(req, res) =>{
    const appointmentID = req.params['id'];
    const dataRef = ref(db, 'appointments/');

    var appointmentData = "";

    onValue(dataRef, (snapshot)=>{
        const data = snapshot.val();
        const IDs = Object.keys(data);
        IDs.forEach((id, index)=>{
            if(id==appointmentID){
                appointmentData = data[id];
                res.send(appointmentData);
            }
        })
    })
})

app.put('/appointments/:id', requireAuth, (req, res)=>{
    const appointmentID = req.params['id'];

    const body = req.body;
    console.log(body);
    update(ref(db, 'appointments/'+appointmentID), body);
    res.send(body);
})

app.delete('/appointments/:id', requireAuth, (req, res)=>{
    const appointmentID = req.params['id'];

    set(ref(db, 'appointments/'+appointmentID), null);
    res.send("User with userID: "+appointmentID+" removed");
})