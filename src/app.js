/*#######################################################
Importacion de modulo, debes estar previamente instalados
#######################################################*/
const express = require("express");
const {cyan, bgRed, yellow} = require("chalk");
const listen = require("socket.io");
const MongoClient = require('mongodb').MongoClient;
const {AttributeIds, OPCUAClient, TimestampsToReturn} = require("node-opcua");
//const mqtt = requiere

/*#################################################
Creacion de constantes pata la comunicacion y la DB
#################################################*/
//OPCUA

const endpointURL = "opc.tcp://Krloz-Asus:4840";
const nodeIDToMonitor1 = "ns=4;s=|var|CODESYS Control Win V3 x64.Application.Analoga.tempReactor";
const nodeIDToMonitor2 = "ns=4;s=|var|CODESYS Control Win V3 x64.Application.Analoga.tempChiller";

//Aplicacion WEB

const port = 3700;

//Mongo DB

const uri = "mongodb+srv://KrlozMedina:Krloz1216@procesobatch.hubhv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const clientmongo = new MongoClient(uri, {useNewUrlParser: true});

/*########################################
El codigo principal va en la funcion async
########################################*/

(async() => {   //await
    try{
        //Crear el cliente OPCUA
        const client = OPCUAClient.create();

        //Avisar cuando se esta intentado reconectar
        client.on("backoff", (retry, delay) => {
            console.log("Retrying to connect to ", endpointURL, " attemp ", retry);
        });

        //Mostrar las URL cuando logre conectar
        console.log(" connecting to ", cyan(endpointURL));
        await client.connect(endpointURL);
        console.log(" connected to ", cyan(endpointURL));

        //Iniciar la sesion para interactuar con el servidor MQTT
        const session = await client.createSession();
        console.log("Sesion iniciada", yellow);

        //Crear una suscripcion
        const subscription = await session.createSubscription2({
            requestedPublishingInterval: 200,
            requestedMaxKeepAliveCount: 20,
            publishingEnabled: true,
        });

        //---------------------------------------------------
        //Se incia monitoreo de la variable del servidor MQTT
        //---------------------------------------------------

        //Crear el item con su NodeID y atributo
        const itemToMonitor1 = {
            nodeId: nodeIDToMonitor1,    //Variable a monitorear
            attributeId: AttributeIds.Value
        };

        const itemToMonitor2 = {
            nodeId: nodeIDToMonitor2,    //Variable a monitorear
            attributeId: AttributeIds.Value
        };

        //Definir los parametros de monitoreo
        const parameters = {
            samplingInterval: 50,   //Tiempo de muestreo
            discardOldest: true,
            queueSize: 100
        };

        //Crear el objeto de monitoreo
        const monitoredItem1 = await subscription.monitor(itemToMonitor1, parameters, TimestampsToReturn.Both);
        const monitoredItem2 = await subscription.monitor(itemToMonitor2, parameters, TimestampsToReturn.Both);

        //-----------------------
        //Crear la aplicacion WEB
        //-----------------------

        //Crear la aplicacion
        const app = express();
        app.set("view engine", "html");

        //Definir el directorio de estaticos
        app.use(express.static(__dirname + '/'));    //Definir el directorio de estaticos
        app.set('views', __dirname + '/');

        //Definir como se responde cuenod el navegador solicita entrar
        app.get("/", function(req, res){
            res.render('index.html');   //Aqui se llama la pagina HTML que se va a autilizar
        });

        //------------------------------------------------------------------
        //Se crea un objeto listen para enviar los datos a la plicacion WEB
        //io.socket --> "real-time bidiretional event-based communication"
        //------------------------------------------------------------------

        //Asociar el puerto a la app WEB
        const io = listen(app.listen(port));

        //Esperar la conexion
        io.sockets.on('connection', function (socket){

        });

        //Mostrar el URL para entrar a la aplicacion WEB
        console.log("Listening on port " + port);
        console.log("visit http://localhost:" + port);

        //---------------------------
        //Conexion a la base de datos
        //---------------------------

        //Conectar el cliente
        await clientmongo.connect();

        //Conectarse a la copleccion con los datos del mongoDB atlas
        const collection = clientmongo.db("mydb").collection("mycollection");

        //-----------------------------------------------------------
        //Definimos que hacer cuando la variable monitoreada "cambie"
        //-----------------------------------------------------------

        monitoredItem1.on("changed", (dataValue) => {
            //Escribir en la base de datos
            collection.insertOne({
                valor: dataValue.value.value,
                time: dataValue.serverTimestamp
            });

            io.sockets.emit("reactor", {
                //El mensaje contiene:
                value: dataValue.value.value,   //Valor de la variable
                timestamp: dataValue.serverTimestamp,   //Tiempo
                //nodeId: nodeIDToMonitor,    //NodeID del nodo OPCUA
                //browseName: "Nombre"  //Nombre de busqueda
            });
        });

        monitoredItem2.on("changed", (dataValue) => {
            io.sockets.emit("chiller", {
                //El mensaje contiene:
                value: dataValue.value.value,   //Valor de la variable
                timestamp: dataValue.serverTimestamp,   //Tiempo
                //nodeId: nodeIDToMonitor,    //NodeID del nodo OPCUA
                //browseName: "Nombre"  //Nombre de busqueda
            });
        });

        //-------------------------
        //Salir al presionar CTRL+C
        //-------------------------

        let running = true;
        process.on("SIGINT", async() => {
            if (!running){
                return; //Avoid calling shutdown twice
            }
            console.log("Shutting down client");
            running = false;
            await clientmongo.close();
            await subscription.terminate();
            await session.close();
            await client.disconnect();
            console.log("Done");
            process.exit(0);
        });
    }
    catch(err){
        //--------------------------------------------------------------
        //Aqui ponemos que pasa si al intentar lo anterior, hay un error
        //--------------------------------------------------------------

        console.log(bgRed.white("Error" + err.message));
        console.log(err);
        process.exit(-1);
    }
})();   //La funcion se estara ejecutando